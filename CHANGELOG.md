## 0.1.3 (2026-08-29)

### 首个稳定版 🎉

### Bug Fixes
- **折叠条与正文重叠、滚动不跟随：** 放弃覆盖层浮层方案（v0.1.2），折叠条改用目标元素自身的 `::before` 伪元素渲染，处在文档流中占真实布局空间——天然跟随滚动、永不与正文重叠，无需任何坐标计算与滚动监听
- **停止/暂停空白页崩溃（彻底修复）：** 对 React 的 DOM 侵入降为零——只添加 class 和 `data-dshfc-bar` 属性（文案存于属性，`content: attr()` 读取），不插入/移动/删除任何 DOM 节点

### Changed
- 架构重写：删除覆盖层、绝对定位、滚动/resize 监听、rAF 重定位等全部浮层机制
- 折叠条文案：单条显示「标签 · 预览」，多条相邻自动分组显示「折叠内容 N 项 · …」
- 展开后内容顶部显示「▴ 收起」条，点击收起（事件委托）
- React 重渲染重写 class 后，500ms 内定期扫描自动修复（heal）
- 插件卸载时清理所有添加的 class / 属性 / 样式

---

## 0.1.2 (2026-08-28)

> ⚠️ 此版本有已知问题（折叠条浮层与正文重叠、滚动不跟随），建议直接安装 0.1.3。

### Bug Fixes
- **Pause 空白页崩溃：** 彻底消除 React reconciliation 冲突。v0.1.1 的兄弟节点 `insertBefore` 方案仍会将折叠条插入 React 的 keyed 列表 (`[data-chat-flow]`)，导致 React 在流式/暂停时触发 `reconcileChildrenArray` 抛出 `NotFoundError`。本版本将所有折叠条 UI 移至 `document.body` 下的 `position:fixed` 覆盖层，完全脱离 React 虚拟 DOM 树，仅通过 `classList.add` 操作 React 元素（`height:0` 折叠，不破坏 DOM 结构）。

### Changed
- 架构重构：折叠条/收起条全部挂载到 `#dshfc-overlay`（body 子节点，React `#root` 之外），通过 `getBoundingClientRect` 绝对定位
- 折叠方式：用 `height:0` + `overflow:hidden` 替代 `display:none`，保证元素仍可测量位置
- 滚动重定位：`requestAnimationFrame` 驱动的 `repositionAll` 同步视口坐标
- 清理：移除 `expandUnit`/`collapseUnit`/`buildUnit`/`repositionAll` 中多余的 `getScrollContainer` 调用

### Known Issues
- 流式输出时折叠条可能短暂偏移（下一帧 raf 自动修正）

---

## 0.1.1 (2026-08-28)

### Bug Fixes
- **空白页崩溃：** 修复直接操作 React 管理的 DOM 节点导致 reconciliation 冲突、页面空白的问题。折叠条现在作为兄弟节点插入，不再用 `appendChild`/`removeChild` 移动 React 节点，目标元素通过 CSS class 控制显隐，留在原位不动。

### Changed
- 重写折叠/展开逻辑：移除 `buildElement`、`processSingle`、`processGroup`、`mergeIntoGroup`、`reGroup`、`flowAnchor`、`getScrollContainer` 等旧函数
- 新增 `processElement`：折叠条作为兄弟节点插入，不包裹目标元素
- 新增 `processGroup`：安全的分组逻辑——各自生成独立折叠条，前面插入组折叠条，子折叠条通过 CSS 隐藏
- 新增 `expandElement`/`collapseElement`/`toggleGroup`：基于 class 切换的显隐控制
- 新增收起按钮：组展开后顶部出现收起按钮，点击收起整组
- 简化 CSS：移除 wrapper/group-body/collapse-bar 等旧样式规则

---

## 0.1.0 (2025-08-28)

### Features
- Auto-fold think blocks, tool calls, tool results, and context injection messages
- Multi-level grouping: adjacent foldable blocks merge into a single group bar
- Streaming-safe: debounced DOM scanning catches elements during streaming
- Click to expand: each fold bar is clickable to reveal content
- Transparent styling: minimal neutral UI that blends with conversation

### Known Issues
- Cut-off fold bars at the bottom of the viewport during streaming