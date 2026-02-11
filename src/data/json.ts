import type { KLine } from '../types/market'

function ensureNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  throw new Error(`JSON 字段无效: ${fieldName}`)
}

function normalizeTimestamp(raw: unknown): number {
  const value = ensureNumber(raw, 'timestamp')
  if (value > 1_000_000_000_000) {
    return value
  }
  if (value > 1_000_000_000) {
    return value * 1000
  }
  throw new Error('JSON timestamp 格式错误，需为秒或毫秒时间戳')
}

function toKLine(item: Record<string, unknown>, index: number): KLine {
  const timestamp = normalizeTimestamp(item.timestamp ?? item.time)
  const open = ensureNumber(item.open, `open@${index}`)
  const high = ensureNumber(item.high, `high@${index}`)
  const low = ensureNumber(item.low, `low@${index}`)
  const close = ensureNumber(item.close, `close@${index}`)
  const volume = ensureNumber(item.volume ?? 0, `volume@${index}`)

  return {
    timestamp,
    open,
    high,
    low,
    close,
    volume
  }
}

export function parseJsonToKlines(content: string): KLine[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('JSON 解析失败，请检查文件格式')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON 顶层必须是数组')
  }

  const result = parsed.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`JSON 第 ${index + 1} 项不是对象`) 
    }
    return toKLine(item as Record<string, unknown>, index)
  })

  result.sort((a, b) => a.timestamp - b.timestamp)
  return result
}

export async function readJsonFileToKlines(file: File): Promise<KLine[]> {
  const content = await file.text()
  return parseJsonToKlines(content)
}

