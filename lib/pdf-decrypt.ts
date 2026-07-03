/**
 * lib/pdf-decrypt.ts — password-protected PDF handling via pdfjs-dist.
 *
 * pdf-lib (used elsewhere in the pipeline) cannot decrypt encrypted PDF
 * content streams — `ignoreEncryption: true` only skips its own guard so it
 * can read structure/metadata; the actual page content stays ciphertext.
 * pdfjs-dist (Mozilla, Apache-2.0) implements real RC4/AES decryption, so
 * it's used here purely to authenticate the password and pull out the
 * decrypted per-page text, which is then handed to Gemini as plain text
 * instead of PDF bytes (see extractFromText in lib/gemini.ts).
 *
 * IMPORTANT: `disableWorker: true` is required. With the default fake
 * worker (LoopbackPort), pdfjs-dist's Node build crashes the process with
 * an unrecoverable DataCloneError the moment a wrong password is supplied
 * (structuredClone chokes on the internal PasswordException retry message).
 * Running single-threaded avoids that message-passing path entirely.
 */

export class IncorrectPasswordError extends Error {
  constructor() { super('Incorrect password') }
}

interface PdfJsModule {
  getDocument: (opts: any) => any
  PasswordResponses: { NEED_PASSWORD: number; INCORRECT_PASSWORD: number }
}

async function loadPdfJs(): Promise<PdfJsModule> {
  // @ts-ignore — pdfjs-dist ships as ESM only; dynamic import works under Next's bundler.
  return await import('pdfjs-dist/legacy/build/pdf.mjs')
}

function toCleanUint8Array(buffer: Buffer): Uint8Array {
  // pdfjs-dist's internal message-passing layer misbehaves with views into
  // Node's shared/pooled Buffer arraybuffers — always hand it a standalone copy.
  return Uint8Array.from(buffer)
}

/** Returns true if the PDF requires a password to open (any page access). */
export async function needsPassword(buffer: Buffer): Promise<boolean> {
  const { getDocument } = await loadPdfJs()
  return new Promise((resolve, reject) => {
    const task = getDocument({ data: toCleanUint8Array(buffer), isEvalSupported: false, disableWorker: true })
    task.onPassword = () => {
      task.destroy()
      resolve(true)
    }
    task.promise.then(
      (doc: any) => { doc.destroy(); resolve(false) },
      (err: any) => reject(err)
    )
  })
}

/**
 * Authenticates with the given password and extracts per-page text,
 * reconstructing row structure from item x/y positions so Gemini can read
 * it as a table (date | description | debit | credit | balance).
 *
 * Throws IncorrectPasswordError if the password is wrong.
 */
export async function decryptAndExtractText(buffer: Buffer, password: string): Promise<string[]> {
  const { getDocument, PasswordResponses } = await loadPdfJs()

  const doc: any = await new Promise((resolve, reject) => {
    const task = getDocument({ data: toCleanUint8Array(buffer), isEvalSupported: false, disableWorker: true })
    let attempted = false
    task.onPassword = (updatePassword: (pw: string) => void, reason: number) => {
      if (reason === PasswordResponses.INCORRECT_PASSWORD || attempted) {
        task.destroy()
        reject(new IncorrectPasswordError())
        return
      }
      attempted = true
      updatePassword(password)
    }
    task.promise.then(resolve, reject)
  })

  const pages: string[] = []
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pages.push(reconstructRows(content.items))
    }
  } finally {
    doc.destroy()
  }
  return pages
}

// Groups text items into visual rows by y-position (PDF space, y increases
// upward), then orders items left-to-right within each row. Large horizontal
// gaps become extra spaces so column boundaries stay visible to the model.
function reconstructRows(items: any[]): string {
  const withPos = items
    .filter(it => typeof it.str === 'string' && it.str.trim().length > 0)
    .map(it => ({ str: it.str as string, x: it.transform[4] as number, y: it.transform[5] as number }))

  if (withPos.length === 0) return ''

  const Y_TOLERANCE = 3
  const rows: { y: number; items: { str: string; x: number }[] }[] = []
  for (const it of withPos) {
    let row = rows.find(r => Math.abs(r.y - it.y) <= Y_TOLERANCE)
    if (!row) { row = { y: it.y, items: [] }; rows.push(row) }
    row.items.push({ str: it.str, x: it.x })
  }

  rows.sort((a, b) => b.y - a.y) // top of page first

  return rows
    .map(row => {
      row.items.sort((a, b) => a.x - b.x)
      let line = ''
      let prevEnd: number | null = null
      for (const item of row.items) {
        if (prevEnd !== null) {
          const gap = item.x - prevEnd
          line += gap > 8 ? '    ' : ' '
        }
        line += item.str
        prevEnd = item.x + item.str.length * 5 // rough width estimate, good enough for gap detection
      }
      return line
    })
    .join('\n')
}
