import type { Bi, Segment } from './types'

function isUpSeg(current: Bi, previous2: Bi): boolean {
  return current.to.kline.high > previous2.to.kline.high
}

function isDownSeg(current: Bi, previous2: Bi): boolean {
  return current.to.kline.low < previous2.to.kline.low
}

function segmentRange(bis: Bi[], startBiIndex: number, endBiIndex: number): { high: number; low: number } {
  let high = Number.NEGATIVE_INFINITY
  let low = Number.POSITIVE_INFINITY

  for (let index = startBiIndex; index <= endBiIndex; index += 1) {
    const bi = bis[index]
    high = Math.max(high, bi.from.kline.high, bi.to.kline.high)
    low = Math.min(low, bi.from.kline.low, bi.to.kline.low)
  }

  return { high, low }
}

function createSegment(bis: Bi[], startBiIndex: number, endBiIndex: number, isSure: boolean): Segment {
  const fromBi = bis[startBiIndex]
  const toBi = bis[endBiIndex]
  const range = segmentRange(bis, startBiIndex, endBiIndex)

  return {
    direction: fromBi.direction,
    from: fromBi.from,
    to: toBi.to,
    high: range.high,
    low: range.low,
    startFractalIndex: fromBi.from.index,
    endFractalIndex: toBi.to.index,
    startBiIndex,
    endBiIndex,
    isSure
  }
}

function replaceLastSegmentEnd(last: Segment, bis: Bi[], newEndBiIndex: number): void {
  const updated = createSegment(bis, last.startBiIndex, newEndBiIndex, last.isSure)
  last.to = updated.to
  last.high = updated.high
  last.low = updated.low
  last.endFractalIndex = updated.endFractalIndex
  last.endBiIndex = updated.endBiIndex
}

export function buildSegments(bis: Bi[]): Segment[] {
  if (bis.length < 3) {
    return []
  }

  // 参考 chan.py 的 SegListDef：
  // - 使用 idx 与 idx-2 的突破关系识别候选峰笔
  // - 反向候选峰之间至少隔 2 根笔才确认新线段
  const segments: Segment[] = []
  let peakBiIndex: number | null = null

  for (let index = 0; index < bis.length; index += 1) {
    if (index < 2) {
      continue
    }

    const current = bis[index]
    const previous2 = bis[index - 2]
    const isBreak = (current.direction === 'up' && isUpSeg(current, previous2)) ||
      (current.direction === 'down' && isDownSeg(current, previous2))

    if (!isBreak) {
      continue
    }

    if (peakBiIndex === null) {
      if (segments.length === 0 || current.direction !== segments[segments.length - 1].direction) {
        peakBiIndex = index
      }
      continue
    }

    const peakBi = bis[peakBiIndex]

    if (peakBi.direction === current.direction) {
      // 同向持续创新高/低，更新峰笔
      const better = current.direction === 'up'
        ? current.to.kline.high >= peakBi.to.kline.high
        : current.to.kline.low <= peakBi.to.kline.low
      if (better) {
        peakBiIndex = index
      }
      continue
    }

    // 反向：至少间隔两笔才确认
    if (index - peakBiIndex <= 2) {
      continue
    }

    const startBiIndex = segments.length === 0 ? 0 : segments[segments.length - 1].endBiIndex + 1
    if (peakBiIndex >= startBiIndex) {
      segments.push(createSegment(bis, startBiIndex, peakBiIndex, true))
    }

    peakBiIndex = index
  }

  // 收尾：若仍有候选峰，补一条未确认线段
  if (peakBiIndex !== null) {
    const startBiIndex = segments.length === 0 ? 0 : segments[segments.length - 1].endBiIndex + 1
    if (peakBiIndex >= startBiIndex) {
      segments.push(createSegment(bis, startBiIndex, peakBiIndex, false))
    }
  }

  // 若末尾有同向更高/更低点，更新最后一段终点（类似 sure_seg_update_end）
  if (segments.length > 0) {
    const last = segments[segments.length - 1]
    for (let index = last.endBiIndex + 1; index < bis.length; index += 1) {
      const bi = bis[index]
      if (bi.direction !== last.direction) {
        continue
      }

      const extend = last.direction === 'up'
        ? bi.to.kline.high > last.to.kline.high
        : bi.to.kline.low < last.to.kline.low

      if (extend) {
        replaceLastSegmentEnd(last, bis, index)
      }
    }
  }

  return segments
}

