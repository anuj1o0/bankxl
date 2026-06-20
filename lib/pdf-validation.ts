/**
 * lib/pdf-validation.ts — pre-flight validation for incoming PDFs.
 *
 * Goals (in order of importance):
 *   1. Never throw a cryptic library error to the user.
 *   2. Detect password-protected PDFs and explain how to unlock them.
 *   3. Give a real page count even for encrypted-but-readable PDFs.
 *   4. Detect corrupt / non-PDF files that slipped past the .pdf extension check.
 */

export interface PdfInfo {
  pageCount: number
  isEncrypted: boolean
  isPasswordProtected: boolean
}

// Raised when validation finds a problem the user can act on
export class PdfValidationError extends Error {
  constructor(public userMessage: string, public detail?: string) {
    super(userMessage)
    this.name = 'PdfValidationError'
  }
}

const PDF_HEADER = Buffer.from('%PDF-')

export async function validatePdf(buffer: Buffer): Promise<PdfInfo> {
  // ── 1. Magic-byte check ─────────────────────────────────────────────────
  // Quick rejection of files that aren't PDFs at all (text, HTML, images
  // with a renamed extension). Header may start within first 1024 bytes.
  const head = buffer.subarray(0, 1024)
  if (head.indexOf(PDF_HEADER) === -1) {
    throw new PdfValidationError(
      "This doesn't look like a real PDF file. Please re-save your statement as PDF and try again.",
      'PDF magic header missing'
    )
  }

  // ── 2. Try to load with pdf-lib, preferring encryption-tolerant mode ───
  let PDFDocument: any
  try {
    ({ PDFDocument } = await import('pdf-lib'))
  } catch (e: any) {
    throw new PdfValidationError('PDF processing unavailable. Please try again.', e?.message)
  }

  let doc: any = null
  let isEncrypted = false

  // First attempt: strict load. If it fails with "encrypted", retry with
  // ignoreEncryption so we can still get the page count + split the file.
  try {
    doc = await PDFDocument.load(buffer)
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase()
    if (msg.includes('encrypted') || msg.includes('password')) {
      isEncrypted = true
      try {
        doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      } catch (e2: any) {
        // Truly password-protected (not just lightly encrypted)
        throw new PdfValidationError(
          'This PDF is password-protected. Open it in Adobe Reader or any PDF viewer, remove the password (File → Print → Save as PDF works), and re-upload.',
          e2?.message
        )
      }
    } else if (msg.includes('invalid pdf') || msg.includes('corrupt') || msg.includes('eof')) {
      throw new PdfValidationError(
        'This PDF appears to be corrupted or incomplete. Please re-download the statement from your bank and try again.',
        e?.message
      )
    } else {
      throw new PdfValidationError(
        "Couldn't open this PDF. It may be in an unusual format — try re-saving it from your PDF viewer (File → Save As → PDF) and re-uploading.",
        e?.message
      )
    }
  }

  // ── 3. Page count ───────────────────────────────────────────────────────
  let pageCount = 0
  try {
    pageCount = doc.getPageCount()
  } catch (e: any) {
    throw new PdfValidationError(
      "Couldn't determine the page count for this PDF. Try re-saving it from your PDF viewer.",
      e?.message
    )
  }

  if (pageCount < 1) {
    throw new PdfValidationError(
      'This PDF has zero pages. Please check the file and try again.'
    )
  }

  if (pageCount > 200) {
    throw new PdfValidationError(
      `This PDF has ${pageCount} pages, which is too large to process in one go. Please split it into smaller files (e.g. one statement per month) and upload them separately.`
    )
  }

  return {
    pageCount,
    isEncrypted,
    isPasswordProtected: false, // we'd have thrown above if it was
  }
}
