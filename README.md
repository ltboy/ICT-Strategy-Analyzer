# Chan JS Frontend（Bun + Vue + KLineChart）

参考项目：`https://github.com/Vespa314/chan.py`

当前实现目标：
- 前端展示 K 线
- 支持两种行情输入（Binance USDT 永续 / 本地 JSON）
- 提供缠论基础结构（分型、笔、线段、中枢）
- 支持行情本地缓存，便于复用同一批数据

## 1. 启动方式

```bash
npm install
bun run dev
```

构建：

```bash
bun run build
```

## 2. 行情数据来源

### 2.1 Binance（USDT 永续）

- 端点：`https://fapi.binance.com/fapi/v1/klines`
- 参数：`symbol`、`interval`、`limit`（可扩展 `startTime`、`endTime`）
- 实现文件：`src/data/binance.ts`

### 2.2 本地 JSON 导入

- 支持数组格式 K 线对象：`timestamp/open/high/low/close/volume`
- `timestamp` 支持秒或毫秒时间戳（会自动归一）
- 实现文件：`src/data/json.ts`

## 3. 本地缓存机制

实现文件：`src/data/localCache.ts`

### 3.1 缓存行为

- 每次从 Binance 加载成功后自动保存快照
- 每次 JSON 导入成功后自动保存快照
- 可在界面点击“保存当前行情”手动保存
- 页面启动时自动尝试加载最近一次缓存

### 3.2 缓存结构

- 存储位置：浏览器 `localStorage`
- Key：`chanjs:market:snapshots:v1`
- 保存内容：数据源、标签、保存时间、上下文参数（symbol/interval/limit/fileName）、K 线数组
- 默认最多保留 10 份快照（按时间倒序）

### 3.3 注意事项

- 本地缓存容量受浏览器限制；若容量不足会自动降级保留更少快照。
- 缓存仅用于本机当前浏览器，不会自动同步到服务器。

## 4. 笔（Bi）实现逻辑

实现文件：`src/core/chan/bi.ts`

### 4.1 处理流程

1. 输入分型序列（来自 `detectFractals`）
2. 对连续同类分型做归一化（top 取更高，bottom 取更低）
3. 使用归一化后的相邻异类分型生成一笔

### 4.2 归一化规则

- `top -> top`：只保留高点更高的分型
- `bottom -> bottom`：只保留低点更低的分型
- 类型切换时（top/bottom）才将前一个分型写入结果

### 4.3 方向定义

- 起点是 `bottom`，该笔方向为 `up`
- 起点是 `top`，该笔方向为 `down`

### 4.4 为什么修复了“笔断联”

之前方向受 `close` 价格影响，极端情况下会出现方向判定与分型类型不一致，导致绘制端点取值（high/low）错位，视觉上像“断联”。

现在方向由起点分型类型直接决定，且笔由归一化后的相邻异类分型生成，因此相邻笔在共享分型处会严格衔接。

## 5. 线段（Segment）实现逻辑（贴近 chan.py 的 Def 思路）

实现文件：`src/core/chan/segment.ts`

### 5.1 处理流程

1. 在笔序列中用 `idx` 与 `idx-2` 对比识别“峰值笔”（上笔创新高/下笔创新低）。
2. 连续同方向峰值做极值合并（保留更高或更低峰）。
3. 相邻反向峰值间生成线段，要求至少覆盖 3 笔跨度。
4. 最后一条线段标记为 `isSure=false`，用于表示未确认段（图上以虚线显示）。

### 5.2 属性定义

- 方向：由线段起点分型类型决定（`bottom -> up`，`top -> down`）
- 区间：由线段覆盖的全部笔求 `high/low`
- 索引：保留 `startBiIndex/endBiIndex`，用于中枢构造与后续买卖点扩展

## 6. 中枢（Zhongshu）实现逻辑（贴近 chan.py 的 normal 思路）

实现文件：`src/core/chan/zhongshu.ts`

### 6.1 处理流程

1. 按线段范围遍历笔，仅收集“与线段方向相反”的笔作为中枢候选。
2. normal 模式下，最近 2 笔有重叠（`min(high) > max(low)`）即构成中枢起点。
3. 后续反向笔若仍与中枢区间重叠，则延伸当前中枢；否则结束并尝试构造新中枢。

### 6.2 输出定义

- 起止线段索引：`startSegmentIndex / endSegmentIndex`
- 起止笔索引：`startBiIndex / endBiIndex`
- 起止分型：中枢入场笔起点分型与当前尾笔终点分型
- 中枢区间：`high / low`（叠加区间）

> 说明：当前实现优先保证“可解释、可视化、可迭代”，还未完全覆盖 `chan.py` 中 `chan` 算法分段、特征序列、未确认段递归回溯等全部细节。

## 7. 界面图层控制

- 在页面右侧控制卡中可开关 3 层叠加：
  - Pens（笔）
  - Segments（线段）
  - Zhongshu（中枢）
- 图表组件实现：`src/components/KlineChartPanel.vue`

## 8. 当前目录结构（核心）

- `src/App.vue`：页面交互、数据加载、缓存管理
- `src/components/KlineChartPanel.vue`：KLineChart 渲染与笔绘制
- `src/data/binance.ts`：Binance 行情适配
- `src/data/json.ts`：JSON 解析
- `src/data/localCache.ts`：本地缓存
- `src/core/chan/fractal.ts`：分型识别
- `src/core/chan/bi.ts`：笔构建
- `src/core/chan/segment.ts`：线段构建
- `src/core/chan/zhongshu.ts`：中枢识别

## 9. ICT 指标（当前实现范围）

当前新增了 ICT 基础模块（v0）：

- 入口：`src/core/ict/index.ts`
- 类型：`src/core/ict/types.ts`
- 规则：分型与笔复用当前 Chan 同一套逻辑
- 页面：新增 `ICT 笔` 开关，仅用于独立显示 ICT 线条层

说明：

- 目前只实现了 ICT 的“结构基础层（分型/笔）”。
- 其余 ICT 概念（如 FVG、OB、流动性）暂未启用，等待后续规划后分阶段接入。

更新：当前已增加 ICT 的结构事件：

- BOS（Break of Structure）

并在页面增加“Chan 结构 / ICT 结构”互斥模式：

- 选择 `ICT 结构` 时，Chan 的笔/线段/中枢会自动清空显示。
- 选择 `Chan 结构` 时，ICT 的笔/BOS 会自动清空显示。
