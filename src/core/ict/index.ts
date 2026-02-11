import type { KLine } from '../../types/market'
import { buildBis } from '../chan/bi'
import { detectFractals } from '../chan/fractal'
import type { Bi } from '../chan'
import type { Fractal } from '../chan'
import type { IctBi, IctResult, IctStructureEvent, IctStructureKind } from './types'

function toIctBis(bis: Bi[]): IctBi[] {
  return bis.map((item) => ({
    ...item,
    label: 'ict-bi'
  }))
}

function toSwingFractalsFromBis(bis: Bi[]): Fractal[] {
  if (bis.length === 0) {
    return []
  }

  const swings: Fractal[] = [bis[0].from]
  for (const bi of bis) {
    swings.push(bi.to)
  }
  return swings
}

function createStructureEvent(
  kind: IctStructureKind,
  direction: 'up' | 'down',
  brokenFrom: Fractal,
  confirmedBy: Fractal
): IctStructureEvent {
  return {
    id: `${kind}-${direction}-${brokenFrom.index}-${confirmedBy.index}`,
    kind,
    direction,
    brokenFrom,
    confirmedBy,
    brokenPrice: direction === 'up' ? brokenFrom.kline.high : brokenFrom.kline.low
  }
}

function detectBosEvents(bis: Bi[]): IctStructureEvent[] {
  const swings = toSwingFractalsFromBis(bis)
  if (swings.length < 3) {
    return []
  }

  let lastTop: Fractal | null = null
  let lastBottom: Fractal | null = null
  const bosEvents: IctStructureEvent[] = []

  for (const swing of swings) {
    if (swing.kind === 'top') {
      if (lastTop && swing.kline.high > lastTop.kline.high) {
        const kind: IctStructureKind = 'bos'
        const event = createStructureEvent(kind, 'up', lastTop, swing)
        bosEvents.push(event)
      }
      if (!lastTop || swing.kline.high >= lastTop.kline.high) {
        lastTop = swing
      }
      continue
    }

    if (lastBottom && swing.kline.low < lastBottom.kline.low) {
      const kind: IctStructureKind = 'bos'
      const event = createStructureEvent(kind, 'down', lastBottom, swing)
      bosEvents.push(event)
    }
    if (!lastBottom || swing.kline.low <= lastBottom.kline.low) {
      lastBottom = swing
    }
  }

  return bosEvents
}

export function runIctAnalysis(klines: KLine[]): IctResult {
  const fractals = detectFractals(klines)
  const chanBis = buildBis(fractals)
  const bis = toIctBis(chanBis)
  const bosEvents = detectBosEvents(chanBis)

  return {
    fractals,
    bis,
    bosEvents
  }
}

export * from './types'
