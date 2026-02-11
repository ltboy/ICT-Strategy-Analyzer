import type { Bi, Fractal } from '../chan'

export type IctFractal = Fractal
export type IctStructureDirection = 'up' | 'down'
export type IctStructureKind = 'bos'

export interface IctBi extends Bi {
  label: 'ict-bi'
}

export interface IctStructureEvent {
  id: string
  kind: IctStructureKind
  direction: IctStructureDirection
  brokenFrom: Fractal
  confirmedBy: Fractal
  brokenPrice: number
}

export interface IctResult {
  fractals: IctFractal[]
  bis: IctBi[]
  bosEvents: IctStructureEvent[]
}
