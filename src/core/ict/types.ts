import type { Bi, Fractal } from '../chan'

export type IctFractal = Fractal

export interface IctBi extends Bi {
  label: 'ict-bi'
}

export interface IctResult {
  fractals: IctFractal[]
  bis: IctBi[]
}

