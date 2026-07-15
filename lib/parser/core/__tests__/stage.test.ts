import { describe, it, expect } from 'vitest'
import { runStage } from '../stage'
import { ParserError } from '../errors'
import { createCapturingLogger, createSilentLogger } from '../logger'
import { PARSER_VERSION } from '../version'
import type { ParseContext, PipelineStage } from '../types'

function makeCtx(log = createSilentLogger()): ParseContext {
  return { docId: 'test-doc', parserVersion: PARSER_VERSION, log, startedAt: Date.now() }
}

const echoStage: PipelineStage<string, string> = {
  name: 'classification',
  async execute(input) {
    return { data: input.toUpperCase(), confidence: 0.9, warnings: [] }
  },
}

describe('runStage', () => {
  it('returns the stage result with durationMs and stage filled in', async () => {
    const result = await runStage(echoStage, 'hello', makeCtx())
    expect(result.data).toBe('HELLO')
    expect(result.confidence).toBe(0.9)
    expect(result.stage).toBe('classification')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('logs start, completion, and each warning', async () => {
    const log = createCapturingLogger()
    const warningStage: PipelineStage<null, number> = {
      name: 'row-parsing',
      async execute() {
        return {
          data: 42,
          confidence: 0.7,
          warnings: [
            { code: 'ROW_MISSING_BALANCE', message: 'row 3 has no balance', page: 2 },
            { code: 'ROW_DATE_INFERRED', message: 'row 5 date inferred from context' },
          ],
        }
      },
    }
    await runStage(warningStage, null, makeCtx(log))
    const events = log.entries.map(e => e.event)
    expect(events).toEqual(['stage_start', 'stage_done', 'stage_warning', 'stage_warning'])
    const done = log.entries[1]
    expect(done.fields?.confidence).toBe(0.7)
    expect(done.fields?.warnings).toBe(2)
    // Page-less warnings log page as null, never undefined (keeps JSON stable)
    expect(log.entries[3].fields?.page).toBeNull()
  })

  it('passes ParserError through untouched', async () => {
    const failing: PipelineStage<null, never> = {
      name: 'table-detection',
      async execute() {
        throw new ParserError('NO_TABLE_FOUND', 'nothing found', 'table-detection', { pages: 3 })
      },
    }
    await expect(runStage(failing, null, makeCtx())).rejects.toMatchObject({
      name: 'ParserError',
      code: 'NO_TABLE_FOUND',
      stage: 'table-detection',
      details: { pages: 3 },
    })
  })

  it('wraps unexpected exceptions as INTERNAL with the stage name', async () => {
    const buggy: PipelineStage<null, never> = {
      name: 'header-mapping',
      async execute() {
        throw new RangeError('index out of bounds')
      },
    }
    await expect(runStage(buggy, null, makeCtx())).rejects.toMatchObject({
      name: 'ParserError',
      code: 'INTERNAL',
      stage: 'header-mapping',
      message: 'index out of bounds',
    })
  })

  it('wraps non-Error throws too', async () => {
    const weird: PipelineStage<null, never> = {
      name: 'ocr',
      async execute() {
        // eslint-disable-next-line no-throw-literal
        throw 'string failure'
      },
    }
    await expect(runStage(weird, null, makeCtx())).rejects.toMatchObject({
      code: 'INTERNAL',
      stage: 'ocr',
      message: 'string failure',
    })
  })

  it('logs stage_failed with code and timing on failure', async () => {
    const log = createCapturingLogger()
    const failing: PipelineStage<null, never> = {
      name: 'validation',
      async execute() {
        throw new ParserError('VALIDATION_FAILED', 'balance mismatch', 'validation')
      },
    }
    await expect(runStage(failing, null, makeCtx(log))).rejects.toBeInstanceOf(ParserError)
    const failed = log.entries.find(e => e.event === 'stage_failed')
    expect(failed?.level).toBe('error')
    expect(failed?.fields?.code).toBe('VALIDATION_FAILED')
    expect(typeof failed?.fields?.ms).toBe('number')
  })
})
