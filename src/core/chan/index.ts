import type { KLine } from '../../types/market'
import { buildBis } from './bi'
import { detectFractals } from './fractal'
import { buildSegments } from './segment'
import type { ChanResult } from './types'
import { buildZhongshus } from './zhongshu'

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
