export interface KLine {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type BinanceInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'

export interface BinanceKlineQuery {
  symbol: string
  interval: BinanceInterval
  limit?: number
  startTime?: number
  endTime?: number
}

export type PriceSource = 'binance' | 'json'
