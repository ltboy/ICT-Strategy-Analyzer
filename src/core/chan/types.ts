import type { KLine } from '../../types/market'

export type FractalKind = 'top' | 'bottom'

export interface Fractal {
  kind: FractalKind
  index: number
  kline: KLine
}

export type BiDirection = 'up' | 'down'

export interface Bi {
  direction: BiDirection
  from: Fractal
  to: Fractal
}

export type SegmentDirection = 'up' | 'down'

export interface Segment {
  direction: SegmentDirection
  from: Fractal
  to: Fractal
  high: number
  low: number
  startFractalIndex: number
  endFractalIndex: number
  startBiIndex: number
  endBiIndex: number
  isSure: boolean
}

export interface Zhongshu {
  id: string
  startSegmentIndex: number
  endSegmentIndex: number
  startBiIndex: number
  endBiIndex: number
  start: Fractal
  end: Fractal
  high: number
  low: number
}

export interface ChanResult {
  fractals: Fractal[]
  bis: Bi[]
  segments: Segment[]
  zhongshus: Zhongshu[]
}
