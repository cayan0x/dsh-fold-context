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