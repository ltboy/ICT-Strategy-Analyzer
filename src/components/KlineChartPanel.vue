<script setup lang="ts">
import { ActionType, dispose, init, LineType, type ActionCallback, type Chart } from 'klinecharts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Bi, Fractal, Segment, Zhongshu } from '../core/chan'
import type { IctBi, IctFractal } from '../core/ict'
import type { KLine } from '../types/market'

const props = defineProps<{
  data: KLine[]
  fractals: Fractal[]
  bis: Bi[]
  segments: Segment[]
  zhongshus: Zhongshu[]
  ictFractals: IctFractal[]
  ictBis: IctBi[]
  showBis: boolean
  showSegments: boolean
  showZhongshus: boolean
  showIctBis: boolean
}>()

const host = ref<HTMLDivElement | null>(null)
const chartDom = ref<HTMLDivElement | null>(null)
const rectLayer = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null
let resizeObserver: ResizeObserver | null = null
const chartActionUnsubscribers: Array<() => void> = []

function toChartData(data: KLine[]) {
  return data.map((item) => ({
    timestamp: item.timestamp,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume
  }))
}

function toBiPoint(kind: 'start' | 'end', bi: Bi): { timestamp: number; value: number } {
  if (kind === 'start') {
    return {
      timestamp: bi.from.kline.timestamp,
      value: bi.direction === 'up' ? bi.from.kline.low : bi.from.kline.high
    }
  }
  return {
    timestamp: bi.to.kline.timestamp,
    value: bi.direction === 'up' ? bi.to.kline.high : bi.to.kline.low
  }
}

function toSegmentPoint(kind: 'start' | 'end', segment: Segment): { timestamp: number; value: number } {
  if (kind === 'start') {
    return {
      timestamp: segment.from.kline.timestamp,
      value: segment.direction === 'up' ? segment.from.kline.low : segment.from.kline.high
    }
  }

  return {
    timestamp: segment.to.kline.timestamp,
    value: segment.direction === 'up' ? segment.to.kline.high : segment.to.kline.low
  }
}

function clearRectLayer(): void {
  if (!rectLayer.value || !host.value) {
    return
  }
  const ctx = rectLayer.value.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.clearRect(0, 0, host.value.clientWidth, host.value.clientHeight)
}

function drawZhongshuRects(): void {
  if (!props.showZhongshus || !chart || !rectLayer.value || !host.value) {
    clearRectLayer()
    return
  }

  const ctx = rectLayer.value.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, host.value.clientWidth, host.value.clientHeight)
  ctx.fillStyle = 'rgba(240, 185, 11, 0.14)'
  ctx.strokeStyle = '#f0b90b'
  ctx.lineWidth = 1

  for (const zhongshu of props.zhongshus) {
    const pixels = chart.convertToPixel(
      [
        { timestamp: zhongshu.start.kline.timestamp, value: zhongshu.high },
        { timestamp: zhongshu.end.kline.timestamp, value: zhongshu.low }
      ],
      { absolute: true }
    ) as Array<{ x?: number; y?: number }>

    if (!Array.isArray(pixels) || pixels.length < 2) {
      continue
    }

    const p1 = pixels[0]
    const p2 = pixels[1]

    if (typeof p1.x !== 'number' || typeof p1.y !== 'number' || typeof p2.x !== 'number' || typeof p2.y !== 'number') {
      continue
    }

    const x = Math.min(p1.x, p2.x)
    const y = Math.min(p1.y, p2.y)
    const width = Math.abs(p1.x - p2.x)
    const height = Math.abs(p1.y - p2.y)

    if (width <= 0 || height <= 0) {
      continue
    }

    ctx.fillRect(x, y, width, height)
    ctx.strokeRect(x, y, width, height)
  }
}

function drawOverlays(): void {
  if (!chart) {
    return
  }

  chart.removeOverlay({ groupId: 'chan-bi' })
  chart.removeOverlay({ groupId: 'chan-segment' })
  chart.removeOverlay({ groupId: 'ict-bi' })

  if (props.showBis) {
    for (const bi of props.bis) {
      chart.createOverlay({
        name: 'segment',
        groupId: 'chan-bi',
        points: [toBiPoint('start', bi), toBiPoint('end', bi)],
        styles: {
          line: {
            color: bi.direction === 'up' ? '#2e86de' : '#f0b90b',
            size: 1
          }
        }
      })
    }
  }

  if (props.showSegments) {
    for (const segment of props.segments) {
      chart.createOverlay({
        name: 'segment',
        groupId: 'chan-segment',
        points: [toSegmentPoint('start', segment), toSegmentPoint('end', segment)],
        styles: {
          line: {
            color: segment.direction === 'up' ? '#0ecb81' : '#f6465d',
            size: 2,
            style: segment.isSure ? LineType.Solid : LineType.Dashed
          }
        }
      })
    }
  }

  if (props.showIctBis) {
    for (const bi of props.ictBis) {
      chart.createOverlay({
        name: 'segment',
        groupId: 'ict-bi',
        points: [toBiPoint('start', bi), toBiPoint('end', bi)],
        styles: {
          line: {
            color: bi.direction === 'up' ? '#7aebc3' : '#ff8fa1',
            size: 1
          }
        }
      })
    }
  }

  drawZhongshuRects()
}

function setupChartStyles(chartInstance: Chart): void {
  chartInstance.setStyles({
    grid: {
      horizontal: { color: '#2b3139' },
      vertical: { color: '#2b3139' }
    },
    candle: {
      bar: {
        upColor: '#0ecb81',
        downColor: '#f6465d',
        noChangeColor: '#848e9c'
      }
    },
    xAxis: {
      axisLine: { color: '#2b3139' },
      tickLine: { color: '#2b3139' },
      tickText: { color: '#848e9c' }
    },
    yAxis: {
      axisLine: { color: '#2b3139' },
      tickLine: { color: '#2b3139' },
      tickText: { color: '#848e9c' }
    }
  })
}

function syncRectLayerSize(): void {
  if (!rectLayer.value || !host.value) {
    return
  }

  const width = host.value.clientWidth
  const height = host.value.clientHeight
  const dpr = window.devicePixelRatio || 1

  rectLayer.value.width = Math.max(1, Math.floor(width * dpr))
  rectLayer.value.height = Math.max(1, Math.floor(height * dpr))
  rectLayer.value.style.width = `${width}px`
  rectLayer.value.style.height = `${height}px`

  const ctx = rectLayer.value.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function renderAll(): void {
  if (!chart) {
    return
  }
  chart.applyNewData(toChartData(props.data))
  chart.scrollToRealTime()
  drawOverlays()
}

function attachChartActions(chartInstance: Chart): void {
  const redraw: ActionCallback = () => {
    drawZhongshuRects()
  }

  const actionTypes: ActionType[] = [
    ActionType.OnScroll,
    ActionType.OnZoom,
    ActionType.OnVisibleRangeChange,
    ActionType.OnPaneDrag,
    ActionType.OnDataReady
  ]

  for (const actionType of actionTypes) {
    chartInstance.subscribeAction(actionType, redraw)
    chartActionUnsubscribers.push(() => {
      chartInstance.unsubscribeAction(actionType, redraw)
    })
  }
}

function ensureChartInitialized(): void {
  if (chart || !chartDom.value) {
    return
  }

  if (chartDom.value.clientWidth <= 0 || chartDom.value.clientHeight <= 0) {
    return
  }

  const chartInstance = init(chartDom.value)
  if (!chartInstance) {
    return
  }

  chart = chartInstance
  setupChartStyles(chartInstance)
  attachChartActions(chartInstance)
  syncRectLayerSize()
  renderAll()
}

onMounted(() => {
  if (!host.value || !chartDom.value) {
    return
  }

  ensureChartInitialized()

  resizeObserver = new ResizeObserver(() => {
    syncRectLayerSize()

    if (!chart) {
      ensureChartInitialized()
      return
    }
    chart.resize()
    drawOverlays()
  })

  resizeObserver.observe(host.value)
  requestAnimationFrame(() => {
    ensureChartInitialized()
    drawOverlays()
  })
})

watch(
  () => props.data,
  () => {
    if (!chart) {
      ensureChartInitialized()
    }
    renderAll()
  },
  { deep: true }
)

watch(
  () => [props.bis, props.segments, props.zhongshus, props.showBis, props.showSegments, props.showZhongshus],
  () => {
    drawOverlays()
  },
  { deep: true }
)

watch(
  () => [props.ictBis, props.showIctBis],
  () => {
    drawOverlays()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  while (chartActionUnsubscribers.length > 0) {
    const unsubscribe = chartActionUnsubscribers.pop()
    unsubscribe?.()
  }

  if (chartDom.value) {
    dispose(chartDom.value)
  }

  chart = null
})
</script>

<template>
  <div ref="host" class="chart-host">
    <div ref="chartDom" class="chart" />
    <canvas ref="rectLayer" class="rect-layer" />
  </div>
</template>
