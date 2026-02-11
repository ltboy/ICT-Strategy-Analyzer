# Chan 算法说明（笔 / 线段 / 中枢）

本文档对应当前项目实现，目标是帮助你后续快速改算法。核心代码位于：

- `src/core/chan/fractal.ts`
- `src/core/chan/bi.ts`
- `src/core/chan/segment.ts`
- `src/core/chan/zhongshu.ts`
- `src/core/chan/index.ts`

## 1. 总体流程

当前计算链路：

1. 从 K 线识别分型（`detectFractals`）
2. 分型归一化后生成笔（`buildBis`）
3. 基于笔生成线段（`buildSegments`）
4. 基于线段 + 笔生成中枢（`buildZhongshus`）

示例入口：

```ts
import { runChan } from '@/core/chan'

const result = runChan(klines)
// result.fractals / result.bis / result.segments / result.zhongshus
```

---

## 2. 笔（Bi）逻辑

实现文件：`src/core/chan/bi.ts`

### 2.1 输入输出

- 输入：分型数组 `Fractal[]`
- 输出：笔数组 `Bi[]`

### 2.2 核心规则

1. 先做“同类分型归一化”
   - `top -> top` 只保留更高的顶
   - `bottom -> bottom` 只保留更低的底
2. 归一化后，只有相邻“异类分型”（top/bottom 交替）才能成笔
3. 笔方向由起点分型决定
   - 起点是 `bottom` => `up`
   - 起点是 `top` => `down`

### 2.3 简化代码示例

```ts
function buildBis(fractals: Fractal[]): Bi[] {
  const normalized = normalizeFractals(fractals)
  const result: Bi[] = []

  for (let i = 1; i < normalized.length; i += 1) {
    const from = normalized[i - 1]
    const to = normalized[i]
    if (from.kind === to.kind) continue

    result.push({
      direction: from.kind === 'bottom' ? 'up' : 'down',
      from,
      to
    })
  }

  return result
}
```

### 2.4 可改造点

- 若你希望更贴近 `chan.py` 的严格笔定义，可加入“最小 K 线间隔”或“包含关系处理”。
- 目前笔构造依赖分型质量，若分型过密，后续线段会抖动。

---

## 3. 线段（Segment）逻辑

实现文件：`src/core/chan/segment.ts`

### 3.1 输入输出

- 输入：`Bi[]`
- 输出：`Segment[]`

### 3.2 当前实现思路（Def 风格简化版）

1. 从第 3 笔开始，用 `bi[i]` 对比 `bi[i-2]` 判断“突破”：
   - 向上笔：终点高点高于 `i-2` 的终点高点
   - 向下笔：终点低点低于 `i-2` 的终点低点
2. 用 `peakBiIndex` 维护候选“峰值笔”
3. 若出现同向新突破，只更新峰值笔（保留更极值）
4. 若出现反向候选，且与当前峰值笔间距 `> 2`，确认前一段线段
5. 收尾时补一条 `isSure=false` 的未确认线段
6. 最后执行一次“同向末端延伸”，避免最后一段无法更新到新高/新低

### 3.3 简化代码示例

```ts
for (let i = 2; i < bis.length; i += 1) {
  const current = bis[i]
  const prev2 = bis[i - 2]
  const isBreak =
    (current.direction === 'up' && current.to.kline.high > prev2.to.kline.high) ||
    (current.direction === 'down' && current.to.kline.low < prev2.to.kline.low)

  if (!isBreak) continue

  if (peakBiIndex === null) {
    peakBiIndex = i
    continue
  }

  const peak = bis[peakBiIndex]

  if (peak.direction === current.direction) {
    // 同向继续创新高/新低，更新峰值
    peakBiIndex = pickBetterPeak(peakBiIndex, i)
    continue
  }

  if (i - peakBiIndex > 2) {
    segments.push(createSegmentByPeak(peakBiIndex))
    peakBiIndex = i
  }
}
```

### 3.4 你最常改的两个位置

- **转折确认强度**：`i - peakBiIndex > 2`
  - 调大：线段更稳、数量更少
  - 调小：线段更灵敏、数量更多
- **突破判定**：`i` vs `i-2`
  - 可替换为“特征序列”或更接近 `chan.py` 的递归确认

---

## 4. 中枢（Zhongshu）逻辑

实现文件：`src/core/chan/zhongshu.ts`

### 4.1 输入输出

- 输入：`segments: Segment[]` + `bis: Bi[]`
- 输出：`Zhongshu[]`

### 4.2 当前实现规则

1. 在每条线段范围内，收集“与线段方向相反”的笔作为候选
2. 用最近 2 个候选笔尝试构建中枢起点
3. 重叠区间判定：
   - `high = min(item.high...)`
   - `low = max(item.low...)`
   - 只有 `high > low` 才算有中枢
4. 已有中枢时，新候选若仍与中枢区间重叠，则延伸中枢
5. 不重叠则结束当前中枢，重新开始寻找下一中枢

### 4.3 简化代码示例

```ts
function overlap(items: { high: number; low: number }[]) {
  const high = Math.min(...items.map(x => x.high))
  const low = Math.max(...items.map(x => x.low))
  return high > low ? { high, low } : null
}

if (!tryExtendLastZhongshu(item)) {
  freeItems.push(item)
  const seed = overlap(freeItems.slice(-2))
  if (seed) {
    createZhongshu(seed)
    freeItems.length = 0
  }
}
```

### 4.4 可改造点

- 想更贴近 `chan.py` 可改成“三段重叠起中枢”而不是“两笔重叠起中枢”。
- 可引入“中枢级别”“扩展中枢”“离开中枢三买三卖前提”等状态。

---

## 5. 图形绘制映射（你改 UI 时最常用）

- 笔：按 `bi.from.index -> bi.to.index` 画折线
- 线段：按 `segment.from.index -> segment.to.index` 画粗线/高亮线
- 中枢：按 `start/end` 时间与 `high/low` 画矩形（当前项目使用独立 canvas 层）

中枢矩形关键：

- 坐标转换使用 `chart.convertToPixel(..., { absolute: true })`
- 在 `scroll/zoom/visible-range/pane-drag/data-ready` 事件里统一重绘

---

## 6. 与 chan.py 的对齐建议（下一步）

如果你下一步目标是“更贴合 `chan.py`”，建议按这个顺序迭代：

1. 先收敛笔定义（分型包含关系、最小间隔、合法笔过滤）
2. 再替换线段确认（引入特征序列 + 缺口处理 + 递归确认）
3. 最后升级中枢（由线段级重叠驱动，补齐扩展/延伸规则）

这样改动成本最低，也最容易肉眼核对图形结果。

---

## 7. 快速定位修改入口

- 笔归一化：`src/core/chan/bi.ts`
- 线段突破与确认阈值：`src/core/chan/segment.ts`
- 中枢重叠判定与延伸：`src/core/chan/zhongshu.ts`
- 叠加图形绘制：`src/components/KlineChartPanel.vue`

---

## 8. 常见疑问（实盘案例）

### Q1：为什么 `2026-02-07 03:45（UTC+8）` 不是笔的顶点？

结论：它是“原始顶分型”，但在“同类分型归一化”后被替换掉了，所以不会成为最终笔端点。

原因拆解：

1. 该 K 线满足三根 K 的顶分型条件（中间高点高于左右高点），因此会先进入原始分型集合。
2. 之后又出现了同类顶分型，且高点更高（例如后续更高顶）。
3. 当前规则对连续 `top -> top` 只保留更高者，因此 `03:45` 顶分型被后续更高顶替换。
4. 笔是由“归一化后的相邻异类分型”生成，所以笔顶点会落在替换后的那个更高顶上。

补充说明：

- 当前实现**不使用**“跌破该顶分型最低点就锁定该顶分型”的确认机制。
- 若要这种行为，可新增模式（如 SMC 风格确认分型）并与当前 chan 模式并存。
