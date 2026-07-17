import { describe, it, expect } from 'vitest'
import { buildLines, coalesceCells } from '../lines'
import type { PositionedTextItem } from '../../pdf/types'

function item(text: string, x: number, y: number, width = text.length * 5, height = 10): PositionedTextItem {
  return { text, x, y, width, height, fontName: 'F1' }
}

describe('buildLines', () => {
  it('groups items sharing a baseline into one line, sorted by x', () => {
    const lines = buildLines([item('B', 100, 50), item('A', 20, 50), item('C', 200, 50)])
    expect(lines).toHaveLength(1)
    expect(lines[0].items.map(i => i.text)).toEqual(['A', 'B', 'C'])
  })

  it('tolerates small vertical jitter within a line', () => {
    const lines = buildLines([item('A', 20, 50), item('B', 100, 51.5), item('C', 200, 49)])
    expect(lines).toHaveLength(1)
  })

  it('separates items on different baselines, top to bottom', () => {
    const lines = buildLines([item('LOWER', 20, 80), item('UPPER', 20, 50)])
    expect(lines).toHaveLength(2)
    expect(lines[0].items[0].text).toBe('UPPER')
    expect(lines[1].items[0].text).toBe('LOWER')
  })

  it('returns an empty array for no items', () => {
    expect(buildLines([])).toEqual([])
  })
})

describe('coalesceCells', () => {
  it('merges items with a small gap into one cell with a space', () => {
    // "Withdrawal" ends at x=20+50=70; "Amt." starts at 74 → gap 4 ≤ 8
    const [line] = buildLines([item('Withdrawal', 20, 50, 50), item('Amt.', 74, 50, 20)])
    const cells = coalesceCells(line)
    expect(cells).toHaveLength(1)
    expect(cells[0].text).toBe('Withdrawal Amt.')
  })

  it('concatenates touching runs without a space', () => {
    // "Bal" ends at 35; "ance" starts at 35.2 → gap < 1 → direct concat
    const [line] = buildLines([item('Bal', 20, 50, 15), item('ance', 35.2, 50, 20)])
    const cells = coalesceCells(line)
    expect(cells).toHaveLength(1)
    expect(cells[0].text).toBe('Balance')
  })

  it('keeps items with a large gap as separate cells', () => {
    const [line] = buildLines([item('Date', 20, 50, 22), item('Particulars', 120, 50, 55)])
    const cells = coalesceCells(line)
    expect(cells).toHaveLength(2)
    expect(cells.map(c => c.text)).toEqual(['Date', 'Particulars'])
  })

  it('tracks cell x-extents across merges', () => {
    const [line] = buildLines([item('Withdrawal', 20, 50, 50), item('Amt.', 74, 50, 20)])
    const [cell] = coalesceCells(line)
    expect(cell.x).toBe(20)
    expect(cell.xEnd).toBe(94)
  })
})
