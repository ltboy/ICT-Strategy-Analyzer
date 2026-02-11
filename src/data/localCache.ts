import type { BinanceInterval, KLine, PriceSource } from '../types/market'

const STORAGE_KEY = 'chanjs:market:snapshots:v1'
const MAX_SNAPSHOT_COUNT = 10

export interface MarketSnapshot {
  id: string
  source: PriceSource
  label: string
  savedAt: number
  context: {
    symbol?: string
    interval?: BinanceInterval
    limit?: number
    fileName?: string
  }
  data: KLine[]
}

export interface MarketSnapshotMeta {
  id: string
  source: PriceSource
  label: string
  savedAt: number
  count: number
  context: MarketSnapshot['context']
}

function readSnapshots(): MarketSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as MarketSnapshot[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((item) => Array.isArray(item.data)).sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

function persistSnapshots(list: MarketSnapshot[]): void {
  const snapshots = [...list].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_SNAPSHOT_COUNT)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
    return
  } catch {
    const fallback = [...snapshots]
    while (fallback.length > 1) {
      fallback.pop()
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
        return
      } catch {
        continue
      }
    }
    throw new Error('本地存储空间不足，无法保存行情快照')
  }
}

function upsertSnapshot(snapshot: MarketSnapshot): MarketSnapshot {
  const snapshots = readSnapshots()
  const next = snapshots.filter((item) => item.id !== snapshot.id)
  next.unshift(snapshot)
  persistSnapshots(next)
  return snapshot
}

export function buildBinanceSnapshotId(symbol: string, interval: BinanceInterval, limit: number): string {
  return `binance:${symbol.toUpperCase()}:${interval}:${limit}`
}

export function buildJsonSnapshotId(fileName: string): string {
  return `json:${fileName.trim().toLowerCase()}`
}

export function saveBinanceSnapshot(params: {
  symbol: string
  interval: BinanceInterval
  limit: number
  data: KLine[]
}): MarketSnapshot {
  return upsertSnapshot({
    id: buildBinanceSnapshotId(params.symbol, params.interval, params.limit),
    source: 'binance',
    label: `${params.symbol.toUpperCase()} ${params.interval} (${params.limit})`,
    savedAt: Date.now(),
    context: {
      symbol: params.symbol.toUpperCase(),
      interval: params.interval,
      limit: params.limit
    },
    data: params.data
  })
}

export function saveJsonSnapshot(params: { fileName: string; data: KLine[] }): MarketSnapshot {
  return upsertSnapshot({
    id: buildJsonSnapshotId(params.fileName),
    source: 'json',
    label: `JSON ${params.fileName}`,
    savedAt: Date.now(),
    context: {
      fileName: params.fileName
    },
    data: params.data
  })
}

export function saveManualSnapshot(params: {
  source: PriceSource
  data: KLine[]
  symbol?: string
  interval?: BinanceInterval
  limit?: number
  fileName?: string
}): MarketSnapshot {
  if (params.source === 'binance') {
    if (!params.symbol || !params.interval || !params.limit) {
      throw new Error('缺少币安快照参数')
    }
    return saveBinanceSnapshot({
      symbol: params.symbol,
      interval: params.interval,
      limit: params.limit,
      data: params.data
    })
  }

  return saveJsonSnapshot({
    fileName: params.fileName ?? `manual-${new Date().toISOString()}`,
    data: params.data
  })
}

export function listSnapshotMetas(): MarketSnapshotMeta[] {
  return readSnapshots().map((item) => ({
    id: item.id,
    source: item.source,
    label: item.label,
    savedAt: item.savedAt,
    count: item.data.length,
    context: item.context
  }))
}

export function getSnapshotById(id: string): MarketSnapshot | null {
  const item = readSnapshots().find((snapshot) => snapshot.id === id)
  return item ?? null
}

export function getLatestSnapshot(): MarketSnapshot | null {
  const snapshots = readSnapshots()
  return snapshots.length > 0 ? snapshots[0] : null
}
