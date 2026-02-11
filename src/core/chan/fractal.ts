import type { KLine } from '../../types/market'
import type { Fractal } from './types'

export function detectFractals(klines: KLine[]): Fractal[] {
  if (klines.length < 3) {
    return []
  }

  const result: Fractal[] = []

  for (let index = 1; index < klines.length - 1; index += 1) {
    const left = klines[index - 1]
    const middle = klines[index]
    const right = klines[index + 1]

    const isTop = middle.high > left.high && middle.high > right.high
    const isBottom = middle.low < left.low && middle.low < right.low

    if (isTop) {
      result.push({ kind: 'top', index, kline: middle })
      continue
    }

    if (isBottom) {
      result.push({ kind: 'bottom', index, kline: middle })
    }
  }

  return result
}

