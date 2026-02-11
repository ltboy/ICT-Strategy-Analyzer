import type { BinanceKlineQuery, KLine } from '../types/market'

const BASE_URL = 'https://fapi.binance.com'

type BinanceRawKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
]

// 将查询参数转为 Binance 接口所需的 query string
function toQueryString(query: BinanceKlineQuery): string {
  const searchParams = new URLSearchParams()
  searchParams.set('symbol', query.symbol.toUpperCase())
  searchParams.set('interval', query.interval)
  searchParams.set('limit', String(query.limit ?? 500))
  if (query.startTime !== undefined) {
    searchParams.set('startTime', String(query.startTime))
  }
  if (query.endTime !== undefined) {
    searchParams.set('endTime', String(query.endTime))
  }
  return searchParams.toString()
}

// 拉取 Binance USDT 永续 K 线，并统一转换为项目内部 KLine 结构
export async function fetchBinanceKlines(query: BinanceKlineQuery): Promise<KLine[]> {
  const url = `${BASE_URL}/fapi/v1/klines?${toQueryString(query)}`
  const response = await fetch(url)

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Binance 请求失败: ${response.status} ${message}`)
  }

  const payload = (await response.json()) as BinanceRawKline[]

  return payload.map((row) => ({
    timestamp: row[0],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5])
  }))
}
