import type { Bi, Segment, Zhongshu } from './types'

interface BiRangeItem {
  biIndex: number
  bi: Bi
  high: number
  low: number
}

function toBiRangeItem(bi: Bi, biIndex: number): BiRangeItem {
  return {
    biIndex,
    bi,
    high: Math.max(bi.from.kline.high, bi.to.kline.high),
    low: Math.min(bi.from.kline.low, bi.to.kline.low)
  }
}

function overlapRange(items: BiRangeItem[]): { high: number; low: number } | null {
  if (items.length === 0) {
    return null
  }

  let minHigh = Number.POSITIVE_INFINITY
  let maxLow = Number.NEGATIVE_INFINITY

  for (const item of items) {
    minHigh = Math.min(minHigh, item.high)
    maxLow = Math.max(maxLow, item.low)
  }

  if (minHigh <= maxLow) {
    return null
  }

  return {
    high: minHigh,
    low: maxLow
  }
}

export function buildZhongshus(segments: Segment[], bis: Bi[]): Zhongshu[] {
  if (segments.length === 0 || bis.length < 2) {
    return []
  }

  const result: Zhongshu[] = []
  const freeItems: BiRangeItem[] = []

  const findSegmentIndexByBi = (biIndex: number): number => {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      if (biIndex >= segment.startBiIndex && biIndex <= segment.endBiIndex) {
        return index
      }
    }
    return segments.length - 1
  }

  const tryConstructFromFreeItems = (): void => {
    if (freeItems.length < 2) {
      return
    }

    const pair = freeItems.slice(-2)
    const overlap = overlapRange(pair)
    if (!overlap) {
      return
    }

    const begin = pair[0]
    const end = pair[1]
    result.push({
      id: `zs-${begin.biIndex}-${end.biIndex}`,
      startSegmentIndex: findSegmentIndexByBi(begin.biIndex),
      endSegmentIndex: findSegmentIndexByBi(end.biIndex),
      startBiIndex: begin.biIndex,
      endBiIndex: end.biIndex,
      start: begin.bi.from,
      end: end.bi.to,
      high: overlap.high,
      low: overlap.low
    })

    freeItems.length = 0
  }

  const tryAddToLastZhongshu = (item: BiRangeItem): boolean => {
    if (result.length === 0) {
      return false
    }

    const last = result[result.length - 1]
    const overlap = overlapRange([
      { biIndex: last.startBiIndex, bi: item.bi, high: last.high, low: last.low },
      item
    ])
    if (!overlap) {
      return false
    }

    last.endBiIndex = item.biIndex
    last.endSegmentIndex = findSegmentIndexByBi(item.biIndex)
    last.end = item.bi.to
    last.high = overlap.high
    last.low = overlap.low
    return true
  }

  for (const segment of segments) {
    for (let biIndex = segment.startBiIndex; biIndex <= segment.endBiIndex; biIndex += 1) {
      const bi = bis[biIndex]
      if (!bi || bi.direction === segment.direction) {
        continue
      }

      const item = toBiRangeItem(bi, biIndex)
      if (!tryAddToLastZhongshu(item)) {
        freeItems.push(item)
        tryConstructFromFreeItems()
      }
    }
  }

  return result
}
