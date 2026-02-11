# 渲染调试检查清单

## A. 数据链路

- `runChan()` 是否返回预期数量结构
- 传入组件的 `bis/segments/zhongshus` 是否同步更新
- 切换 Binance/CSV 后是否触发重算

## B. 坐标转换

- 时间与价格是否都通过图表 API 转像素
- 是否统一使用绝对坐标（避免滚动容器偏移）
- 缩放后坐标是否重算而非复用旧缓存

## C. 画布层

- canvas CSS 尺寸与实际像素尺寸是否一致
- 是否按设备像素比（DPR）缩放
- 画布定位是否覆盖主图 pane

## D. 事件与生命周期

- 已监听：scroll / zoom / visible range / pane drag / data ready
- 卸载组件时是否取消监听
- 重复初始化是否先销毁旧实例

## E. 中枢矩形

- `left < right` 且 `top < bottom`
- `high > low` 才绘制
- 多中枢绘制顺序稳定，避免闪烁

