import type { KLine } from '../../types/market'
import type { Fractal } from './types'

// 分型识别：使用三根 K 线的局部极值。
// - 顶分型：中间 K 线高点同时高于左右
// - 底分型：中间 K 线低点同时低于左右
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
