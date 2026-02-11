---
name: chan-visual-debug
description: 调试 KLineChart 前端绘制问题（笔/线段/中枢叠加层、坐标转换、拖拽缩放错位、重绘时机）。适用于“图形不显示”“矩形漂移”“缩放后错位”“中枢矩形消失”等可视化问题。
---

# chan-visual-debug

用于快速定位并修复图形层问题，尤其是中枢矩形叠加层。

## 1) 问题分类

先判断属于哪类：

- 数据问题：算法有结果，但传入图层为空或索引错
- 坐标问题：时间价位到像素转换错误
- 生命周期问题：图表 ready 前绘制、销毁后仍调用
- 重绘问题：缩放/拖拽/可视范围变化时未刷新
- 分层问题：canvas 层尺寸、DPR、定位或 z-index 不正确

## 2) 重点检查文件

- `src/components/KlineChartPanel.vue`
- `src/core/chan/index.ts`
- `src/core/chan/zhongshu.ts`

## 3) 固定修复顺序

1. 确认算法输出非空（先打点长度）
2. 确认坐标转换使用统一 API（绝对坐标模式）
3. 确认叠加 canvas 的宽高和 DPR 同步
4. 绑定 scroll/zoom/visible-range/pane-drag/data-ready 事件统一重绘
5. 检查组件卸载时取消监听，避免脏回调

## 4) 中枢矩形专项约束

- 左右边界来自起止时间，不要混用索引和时间
- 上下边界来自 `high/low`，不要用 close
- 若绘制库 overlay 不支持矩形，使用独立 canvas 层

## 5) 输出要求

- 告知根因（数据/坐标/生命周期/重绘中的哪一类）
- 给出最小补丁，不做无关 UI 重构
- 说明哪些交互场景已覆盖（拖拽、缩放、切换数据源）

## 参考

- `references/render-debug-checklist.md`

