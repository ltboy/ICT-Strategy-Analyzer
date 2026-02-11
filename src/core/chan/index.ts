import type { KLine } from '../../types/market'
import { buildBis } from './bi'
import { detectFractals } from './fractal'
import { buildSegments } from './segment'
import type { ChanResult } from './types'
import { buildZhongshus } from './zhongshu'

// Chan 主入口：按 分型 -> 笔 -> 线段 -> 中枢 的顺序计算
export function runChanAnalysis(klines: KLine[]): ChanResult {
  const fractals = detectFractals(klines)
  const bis = buildBis(fractals)
  const segments = buildSegments(bis)
  const zhongshus = buildZhongshus(segments, bis)

  return {
    fractals,
    bis,
    segments,
    zhongshus
  }
}

export * from './types'
