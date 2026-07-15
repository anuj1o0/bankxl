/**
 * lib/parser/core/logger.ts — structured logging for parser stages.
 *
 * One JSON line per event so Vercel's log search (and any future collector)
 * can filter by docId, stage, or event without regex archaeology. The logger
 * is injected via ParseContext, so tests can substitute a silent or capturing
 * implementation without touching stage code.
 */
import type { StageLogger } from './types'

type LogFields = Readonly<Record<string, string | number | boolean | null>>

/**
 * Creates the default logger: structured single-line JSON on console, tagged
 * with the document correlation id and parser version.
 *
 * @param docId - Correlation id (conversions row id, or synthetic in tests).
 * @param parserVersion - Engine version producing this document's results.
 */
export function createConsoleLogger(docId: string, parserVersion: string): StageLogger {
  const emit = (level: 'info' | 'warn' | 'error', event: string, fields?: LogFields): void => {
    const line = JSON.stringify({ src: 'parser', level, event, docId, v: parserVersion, ...fields })
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }
  return {
    info: (event, fields) => emit('info', event, fields),
    warn: (event, fields) => emit('warn', event, fields),
    error: (event, fields) => emit('error', event, fields),
  }
}

/** No-op logger for tests that don't assert on logging. */
export function createSilentLogger(): StageLogger {
  return { info: () => undefined, warn: () => undefined, error: () => undefined }
}

/**
 * Capturing logger for tests that DO assert on logging: records every event
 * in order with its level and fields.
 */
export function createCapturingLogger(): StageLogger & {
  entries: { level: 'info' | 'warn' | 'error'; event: string; fields?: LogFields }[]
} {
  const entries: { level: 'info' | 'warn' | 'error'; event: string; fields?: LogFields }[] = []
  return {
    entries,
    info: (event, fields) => { entries.push({ level: 'info', event, fields }) },
    warn: (event, fields) => { entries.push({ level: 'warn', event, fields }) },
    error: (event, fields) => { entries.push({ level: 'error', event, fields }) },
  }
}
