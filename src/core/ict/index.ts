import type { KLine } from '../../types/market'
import { buildBis } from '../chan/bi'
import { detectFractals } from '../chan/fractal'
import type { Bi } from '../chan'
import type { Fractal } from '../chan'
import type { IctBi, IctResult, IctStructureEvent, IctStructureKind } from './types'

// ICT 笔目前复用 Chan 的笔定义，仅在类型上打标方便 UI 分层
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

// 结构事件统一定义：
// - BOS：与当前趋势同向的结构突破（延续）
// - CHOCH：与当前趋势反向的结构突破（反转）
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

function detectStructureEvents(bis: Bi[]): { bosEvents: IctStructureEvent[]; chochEvents: IctStructureEvent[] } {
  const swings = toSwingFractalsFromBis(bis)
  if (swings.length < 3) {
    return { bosEvents: [], chochEvents: [] }
  }

  let lastTop: Fractal | null = null
  let lastBottom: Fractal | null = null
  let trendDirection: 'up' | 'down' | null = null

  const bosEvents: IctStructureEvent[] = []
  const chochEvents: IctStructureEvent[] = []

  for (const swing of swings) {
    if (swing.kind === 'top') {
      if (lastTop && swing.kline.high > lastTop.kline.high) {
        // 上破前顶：若此前是下行趋势 => CHOCH，否则 => BOS
        const kind: IctStructureKind = trendDirection === 'down' ? 'choch' : 'bos'
        const event = createStructureEvent(kind, 'up', lastTop, swing)
        if (kind === 'bos') {
          bosEvents.push(event)
        } else {
          chochEvents.push(event)
        }
        trendDirection = 'up'
      }
      if (!lastTop || swing.kline.high >= lastTop.kline.high) {
        lastTop = swing
      }
      continue
    }

    if (lastBottom && swing.kline.low < lastBottom.kline.low) {
      // 下破前底：若此前是上行趋势 => CHOCH，否则 => BOS
      const kind: IctStructureKind = trendDirection === 'up' ? 'choch' : 'bos'
      const event = createStructureEvent(kind, 'down', lastBottom, swing)
      if (kind === 'bos') {
        bosEvents.push(event)
      } else {
        chochEvents.push(event)
      }
      trendDirection = 'down'
    }
    if (!lastBottom || swing.kline.low <= lastBottom.kline.low) {
      lastBottom = swing
    }
  }

  return { bosEvents, chochEvents }
}

export function runIctAnalysis(klines: KLine[]): IctResult {
  // ICT 分型/笔复用 Chan 逻辑，结构事件单独计算
  const fractals = detectFractals(klines)
  const chanBis = buildBis(fractals)
  const bis = toIctBis(chanBis)
  const { bosEvents, chochEvents } = detectStructureEvents(chanBis)

  return {
    fractals,
    bis,
    bosEvents,
    chochEvents
  }
}

export * from './types'
