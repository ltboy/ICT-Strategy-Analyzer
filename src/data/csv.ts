import type { KLine } from '../types/market'

const TIME_KEYS = ['time', 'timestamp', 'date', 'datetime']
const OPEN_KEYS = ['open', 'o']
const HIGH_KEYS = ['high', 'h']
const LOW_KEYS = ['low', 'l']
const CLOSE_KEYS = ['close', 'c']
const VOLUME_KEYS = ['volume', 'vol', 'v']

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function findIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeKey)
  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate)
    if (index >= 0) {
      return index
    }
  }
  return -1
}

function parseTimestamp(raw: string): number {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('CSV 存在空时间字段')
  }

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) {
    if (numeric > 1_000_000_000_000) {
      return numeric
    }
    if (numeric > 1_000_000_000) {
      return numeric * 1000
    }
  }

  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) {
    throw new Error(`无法解析时间: ${trimmed}`)
  }
  return parsed
}

function parseNumber(raw: string, fieldName: string): number {
  const value = Number(raw.trim())
  if (!Number.isFinite(value)) {
    throw new Error(`无法解析 ${fieldName}: ${raw}`)
  }
  return value
}

export function parseCsvToKlines(content: string): KLine[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV 内容不足，至少需要表头和一行数据')
  }

  const headers = lines[0].split(',')
  const timeIndex = findIndex(headers, TIME_KEYS)
  const openIndex = findIndex(headers, OPEN_KEYS)
  const highIndex = findIndex(headers, HIGH_KEYS)
  const lowIndex = findIndex(headers, LOW_KEYS)
  const closeIndex = findIndex(headers, CLOSE_KEYS)
  const volumeIndex = findIndex(headers, VOLUME_KEYS)

  if ([timeIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex].some((index) => index < 0)) {
    throw new Error('CSV 表头缺少必要字段: time/open/high/low/close/volume')
  }

  const result: KLine[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',')
    if (cols.length < headers.length) {
      continue
    }

    const record: KLine = {
      timestamp: parseTimestamp(cols[timeIndex]),
      open: parseNumber(cols[openIndex], 'open'),
      high: parseNumber(cols[highIndex], 'high'),
      low: parseNumber(cols[lowIndex], 'low'),
      close: parseNumber(cols[closeIndex], 'close'),
      volume: parseNumber(cols[volumeIndex], 'volume')
    }
    result.push(record)
  }

  result.sort((a, b) => a.timestamp - b.timestamp)
  return result
}

export async function readCsvFileToKlines(file: File): Promise<KLine[]> {
  const content = await file.text()
  return parseCsvToKlines(content)
}

