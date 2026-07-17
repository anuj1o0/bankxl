/**
 * lib/parser/core/stage.ts — the single execution path for pipeline stages.
 *
 * All stages run through runStage(), which owns the cross-cutting contract:
 *   - wall-clock timing (fills StageResult.durationMs),
 *   - structured logging (start, completion with confidence/warnings, failure),
 *   - error normalization (anything a stage throws that isn't already a
 *     ParserError is wrapped as { code: 'INTERNAL', stage } so callers never
 *     see raw library exceptions).
 *
 * Stages therefore contain only their one job; none of them can forget to
 * time, log, or structure its failures.
 */
import { ParserError } from './errors'
import type { ParseContext, PipelineStage, StageResult } from './types'

/**
 * Executes a pipeline stage with timing, logging, and error normalization.
 *
 * @param stage - The stage to execute.
 * @param input - Typed input for the stage.
 * @param ctx - Per-document context (correlation id, version, logger).
 * @returns The stage's result with `durationMs` and `stage` filled in.
 * @throws {ParserError} Always a ParserError on failure — stage-thrown ones
 *   pass through untouched; anything else is wrapped with code 'INTERNAL'.
 */
export async function runStage<TIn, TOut>(
  stage: PipelineStage<TIn, TOut>,
  input: TIn,
  ctx: ParseContext
): Promise<StageResult<TOut>> {
  const t0 = Date.now()
  ctx.log.info('stage_start', { stage: stage.name })
  try {
    const partial = await stage.execute(input, ctx)
    const result: StageResult<TOut> = {
      ...partial,
      durationMs: Date.now() - t0,
      stage: stage.name,
    }
    ctx.log.info('stage_done', {
      stage: stage.name,
      ms: result.durationMs,
      confidence: result.confidence,
      warnings: result.warnings.length,
    })
    for (const w of result.warnings) {
      ctx.log.warn('stage_warning', { stage: stage.name, code: w.code, message: w.message, page: w.page ?? null })
    }
    return result
  } catch (err) {
    const durationMs = Date.now() - t0
    const parserError = ParserError.isParserError(err)
      ? err
      : new ParserError(
          'INTERNAL',
          err instanceof Error ? err.message : String(err),
          stage.name,
          {},
          { cause: err }
        )
    ctx.log.error('stage_failed', {
      stage: stage.name,
      ms: durationMs,
      code: parserError.code,
      message: parserError.message,
    })
    throw parserError
  }
}
