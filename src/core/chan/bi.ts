import type { Bi, Fractal } from './types'

// 同类分型比较：
// - 顶分型保留更高顶
// - 底分型保留更低底
function isBetterFractal(candidate: Fractal, current: Fractal): boolean {
  if (candidate.kind !== current.kind) {
    return false
  }
  if (candidate.kind === 'top') {
    return candidate.kline.high >= current.kline.high
  }
  return candidate.kline.low <= current.kline.low
}

function normalizeFractals(fractals: Fractal[]): Fractal[] {
  if (fractals.length === 0) {
    return []
  }

  const normalized: Fractal[] = []
  let prev = fractals[0]

  for (let i = 1; i < fractals.length; i += 1) {
    const current = fractals[i]

    if (current.kind === prev.kind) {
      // 连续同类分型只保留极值，避免同向噪声分型造成笔断裂
      if (isBetterFractal(current, prev)) {
        prev = current
      }
      continue
    }

    normalized.push(prev)
    prev = current
  }

  normalized.push(prev)
  return normalized
}

function directionOf(from: Fractal): 'up' | 'down' {
  // 由起点分型决定笔方向，避免受收盘价波动干扰
  return from.kind === 'bottom' ? 'up' : 'down'
}

export function buildBis(fractals: Fractal[]): Bi[] {
  const normalized = normalizeFractals(fractals)
  if (normalized.length < 2) {
    return []
  }

  const result: Bi[] = []

  for (let i = 1; i < normalized.length; i += 1) {
    const from = normalized[i - 1]
    const to = normalized[i]

    if (from.kind === to.kind) {
      continue
    }

    // 笔由归一化后相邻异类分型组成
    result.push({
      direction: directionOf(from),
      from,
      to
    })
  }

  return result
}
