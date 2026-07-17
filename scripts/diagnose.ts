import { readFileSync } from 'fs'
import { PdfTextExtractionStage } from '../lib/parser/pdf/extract-text'
import { DocumentClassificationStage } from '../lib/parser/classify/classify'
import { BankDetectionStage } from '../lib/parser/banks/detect-bank'
import { TableDetectionStage } from '../lib/parser/table/detect'
import { buildLines, coalesceCells } from '../lib/parser/table/lines'
import { scoreHeaderLine, expandCompoundHeaderCells } from '../lib/parser/table/header-lexicon'
import { looksLikeDate, looksLikeAmount } from '../lib/parser/table/patterns'
import { runStage } from '../lib/parser/core/stage'
import { createSilentLogger } from '../lib/parser/core/logger'
import { PARSER_VERSION } from '../lib/parser/core/version'
import type { ParseContext } from '../lib/parser/core/types'

function ctx(): ParseContext {
  return { docId: 'diag', parserVersion: PARSER_VERSION, log: createSilentLogger(), startedAt: Date.now() }
}

async function diagnose(filePath: string) {
  console.log('\n' + '='.repeat(80))
  console.log('DIAGNOSING:', filePath)
  console.log('='.repeat(80))

  const buf = readFileSync(filePath)

  const extractStage = new PdfTextExtractionStage()
  const extractResult = await runStage(extractStage, buf, ctx())
  const doc = extractResult.data
  console.log(`\nExtraction: ${doc.totalPages} pages, ${doc.pages.reduce((s, p) => s + p.charCount, 0)} chars`)

  for (const page of doc.pages) {
    console.log(`\n--- Page ${page.pageNumber} (${page.charCount} chars, ${page.items.length} items) ---`)
    const lines = buildLines(page.items)
    console.log(`  ${lines.length} visual lines`)

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const cells = coalesceCells(lines[i])
      const expanded = expandCompoundHeaderCells(cells)
      const score = scoreHeaderLine(expanded)
      const cellTexts = cells.map(c => `"${c.text}"[${c.x.toFixed(0)}-${c.xEnd.toFixed(0)}]`)

      const expandedTexts = expanded.length !== cells.length
        ? ` → EXPANDED: ${expanded.map(c => `"${c.text}"`).join(' | ')}`
        : ''

      const dateCount = cells.filter(c => looksLikeDate(c.text)).length
      const amountCount = cells.filter(c => looksLikeAmount(c.text)).length

      const marker = score ? ` ★ HEADER(score=${JSON.stringify(score)})` : ''
      const dataMarker = dateCount > 0 || amountCount > 0 ? ` [dates=${dateCount}, amounts=${amountCount}]` : ''

      console.log(`  L${i}: ${cellTexts.join(' | ')}${expandedTexts}${marker}${dataMarker}`)
    }

    if (lines.length > 50) {
      console.log(`  ... ${lines.length - 50} more lines`)
    }
  }

  const classifyStage = new DocumentClassificationStage()
  const classResult = await runStage(classifyStage, doc, ctx())
  console.log(`\nClassification: ${classResult.data.kind}`)

  const bankStage = new BankDetectionStage()
  const bankResult = await runStage(bankStage, doc, ctx())
  console.log(`\nBank: ${bankResult.data.bankId} (${bankResult.data.matchedBy})`)

  try {
    const tableStage = new TableDetectionStage()
    const tableResult = await runStage(tableStage, doc, ctx())
    const tables = tableResult.data.tables
    console.log(`\nTable detection: ${tables.length} tables found`)
    for (const t of tables) {
      console.log(`  Table on page ${t.page}: ${t.rows.length} rows, inherited=${t.inheritedHeader}, headerY=${t.headerY?.toFixed(1) ?? 'null'}`)
      console.log(`  Columns: ${t.columns.map(c => `${c.suggestedField}@${c.xStart.toFixed(0)}`).join(', ')}`)
      for (const r of t.rows.slice(0, 3)) {
        console.log(`    row p${r.page} y=${r.y.toFixed(1)}: ${r.cells.map(c => `"${c}"`).join(' | ')}`)
      }
      if (t.rows.length > 3) {
        for (const r of t.rows.slice(-2)) {
          console.log(`    row p${r.page} y=${r.y.toFixed(1)}: ${r.cells.map(c => `"${c}"`).join(' | ')}`)
        }
        console.log(`    ... (${t.rows.length} rows total)`)
      }
    }
  } catch (err: any) {
    console.log(`\nTable detection FAILED: ${err.code} — ${err.message}`)
  }
}

const files = process.argv.slice(2)
;(async () => {
  for (const f of files) await diagnose(f)
})()
