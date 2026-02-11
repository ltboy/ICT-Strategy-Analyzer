<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import KlineChartPanel from './components/KlineChartPanel.vue'
import { runChanAnalysis } from './core/chan'
import { runIctAnalysis } from './core/ict'
import { fetchBinanceKlines } from './data/binance'
import { readCsvFileToKlines } from './data/csv'
import {
  getLatestSnapshot,
  getSnapshotById,
  listSnapshotMetas,
  saveBinanceSnapshot,
  saveCsvSnapshot,
  saveManualSnapshot,
  type MarketSnapshotMeta
} from './data/localCache'
import type { BinanceInterval, KLine, PriceSource } from './types/market'

const source = ref<PriceSource>('binance')
const symbol = ref('BTCUSDT')
const interval = ref<BinanceInterval>('15m')
const limit = ref(500)
const status = ref('就绪')
const loading = ref(false)
const data = ref<KLine[]>([])
const csvFileName = ref<string>('')
const snapshots = ref<MarketSnapshotMeta[]>([])
const selectedSnapshotId = ref<string>('')

const showBis = ref(true)
const showSegments = ref(true)
const showZhongshus = ref(true)
const showIctBis = ref(false)

const chanResult = computed(() => runChanAnalysis(data.value))
const ictResult = computed(() => runIctAnalysis(data.value))
const intervalOptions: BinanceInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

function refreshSnapshots(): void {
  snapshots.value = listSnapshotMetas()
  if (!selectedSnapshotId.value && snapshots.value.length > 0) {
    selectedSnapshotId.value = snapshots.value[0].id
  }
}

function formatSnapshotTime(savedAt: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(savedAt)
}

function applySnapshotToForm(meta: MarketSnapshotMeta): void {
  source.value = meta.source

  if (meta.source === 'binance') {
    if (meta.context.symbol) {
      symbol.value = meta.context.symbol
    }
    if (meta.context.interval) {
      interval.value = meta.context.interval
    }
    if (meta.context.limit) {
      limit.value = meta.context.limit
    }
    csvFileName.value = ''
    return
  }

  csvFileName.value = meta.context.fileName ?? ''
}

function loadLatestSnapshotOnStartup(): void {
  const latest = getLatestSnapshot()
  if (!latest) {
    return
  }

  data.value = latest.data
  selectedSnapshotId.value = latest.id

  const matched = listSnapshotMetas().find((item) => item.id === latest.id)
  if (matched) {
    applySnapshotToForm(matched)
  }

  status.value = `已加载缓存：${latest.label}（${latest.data.length} 条）`
}

async function loadFromBinance(): Promise<void> {
  loading.value = true
  status.value = '正在请求币安永续行情…'

  try {
    const klines = await fetchBinanceKlines({
      symbol: symbol.value,
      interval: interval.value,
      limit: limit.value
    })

    data.value = klines

    const snapshot = saveBinanceSnapshot({
      symbol: symbol.value,
      interval: interval.value,
      limit: limit.value,
      data: klines
    })

    selectedSnapshotId.value = snapshot.id
    refreshSnapshots()
    status.value = `加载完成：${klines.length} 条`
  } catch (error) {
    status.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleCsvChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  loading.value = true
  status.value = `正在解析 CSV：${file.name}`

  try {
    const klines = await readCsvFileToKlines(file)
    data.value = klines
    csvFileName.value = file.name

    const snapshot = saveCsvSnapshot({
      fileName: file.name,
      data: klines
    })

    selectedSnapshotId.value = snapshot.id
    refreshSnapshots()
    status.value = `导入完成：${klines.length} 条`
  } catch (error) {
    status.value = error instanceof Error ? error.message : '导入失败'
  } finally {
    loading.value = false
    input.value = ''
  }
}

function loadSelectedSnapshot(): void {
  if (!selectedSnapshotId.value) {
    return
  }

  const snapshot = getSnapshotById(selectedSnapshotId.value)
  if (!snapshot) {
    status.value = '所选缓存不存在'
    refreshSnapshots()
    return
  }

  data.value = snapshot.data
  const meta = snapshots.value.find((item) => item.id === snapshot.id)
  if (meta) {
    applySnapshotToForm(meta)
  }

  status.value = `已加载缓存：${snapshot.label}（${snapshot.data.length} 条）`
}

function saveCurrentSnapshot(): void {
  if (data.value.length === 0) {
    status.value = '当前没有可保存数据'
    return
  }

  const snapshot = saveManualSnapshot({
    source: source.value,
    data: data.value,
    symbol: symbol.value,
    interval: interval.value,
    limit: limit.value,
    fileName: csvFileName.value || `manual-${Date.now()}.csv`
  })

  selectedSnapshotId.value = snapshot.id
  refreshSnapshots()
  status.value = `已保存缓存：${snapshot.label}`
}

onMounted(() => {
  refreshSnapshots()
  loadLatestSnapshotOnStartup()
})
</script>

<template>
  <a href="#main-content" class="skip-link">跳转到主内容</a>

  <main id="main-content" class="page">
    <header class="topbar">
      <div class="topbar-left">
        <strong class="brand">缠论前端</strong>

        <label>
          <span>数据源</span>
          <select v-model="source" name="source" autocomplete="off">
            <option value="binance">币安永续</option>
            <option value="csv">本地 CSV</option>
          </select>
        </label>

        <template v-if="source === 'binance'">
          <label>
            <span>合约</span>
            <input v-model="symbol" name="symbol" autocomplete="off" placeholder="BTCUSDT…" spellcheck="false" />
          </label>

          <label>
            <span>周期</span>
            <select v-model="interval" name="interval" autocomplete="off">
              <option v-for="item in intervalOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>

          <label>
            <span>数量</span>
            <input
              v-model.number="limit"
              name="limit"
              type="number"
              inputmode="numeric"
              min="50"
              max="1500"
              step="50"
              autocomplete="off"
            />
          </label>

          <button type="button" :disabled="loading" @click="loadFromBinance">
            {{ loading ? '加载中…' : '加载行情' }}
          </button>
        </template>

        <template v-else>
          <label>
            <span>CSV 文件</span>
            <input type="file" name="csv_file" accept=".csv,text/csv" :disabled="loading" @change="handleCsvChange" />
          </label>
        </template>

        <label>
          <span>缓存</span>
          <select v-model="selectedSnapshotId" name="snapshot" autocomplete="off">
            <option value="">选择缓存…</option>
            <option v-for="item in snapshots" :key="item.id" :value="item.id">
              {{ item.label }} · {{ item.count }} · {{ formatSnapshotTime(item.savedAt) }}
            </option>
          </select>
        </label>

        <button type="button" :disabled="loading || !selectedSnapshotId" @click="loadSelectedSnapshot">加载缓存</button>
        <button type="button" :disabled="loading || data.length === 0" @click="saveCurrentSnapshot">保存缓存</button>

        <label class="check-item"><input v-model="showBis" type="checkbox" name="show_bis" /> 笔</label>
        <label class="check-item"><input v-model="showSegments" type="checkbox" name="show_segments" /> 线段</label>
        <label class="check-item"><input v-model="showZhongshus" type="checkbox" name="show_zhongshus" /> 中枢</label>
        <label class="check-item"><input v-model="showIctBis" type="checkbox" name="show_ict_bis" /> ICT 笔</label>
      </div>

      <div class="topbar-right" aria-live="polite">
        <span>{{ status }}</span>
        <span>数据 {{ data.length }}</span>
        <span>分型 {{ chanResult.fractals.length }}</span>
        <span>笔 {{ chanResult.bis.length }}</span>
        <span>段 {{ chanResult.segments.length }}</span>
        <span>中枢 {{ chanResult.zhongshus.length }}</span>
        <span>ICT 笔 {{ ictResult.bis.length }}</span>
      </div>
    </header>

    <section class="chart-panel">
      <KlineChartPanel
        :data="data"
        :fractals="chanResult.fractals"
        :bis="chanResult.bis"
        :segments="chanResult.segments"
        :zhongshus="chanResult.zhongshus"
        :ict-fractals="ictResult.fractals"
        :ict-bis="ictResult.bis"
        :show-bis="showBis"
        :show-segments="showSegments"
        :show-zhongshus="showZhongshus"
        :show-ict-bis="showIctBis"
      />
    </section>
  </main>
</template>
