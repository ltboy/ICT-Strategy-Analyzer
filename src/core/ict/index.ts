import type { KLine } from '../../types/market'
import { buildBis } from '../chan/bi'
import { detectFractals } from '../chan/fractal'
import type { Bi } from '../chan'
import type { IctBi, IctResult } from './types'

function toIctBis(bis: Bi[]): IctBi[] {
  return bis.map((item) => ({
    ...item,
    label: 'ict-bi'
  }))
}

export function runIctAnalysis(klines: KLine[]): IctResult {
  const fractals = detectFractals(klines)
  const bis = toIctBis(buildBis(fractals))

  return {
    fractals,
    bis
  }
}

export * from './types'
