# Mermaid 流程图设计

## 问题

wangEditor（基于 Slate.js）不支持自定义 HTML 元素渲染。直接在编辑器中插入 `<div data-mermaid="CODE">` 会导致：
- 编辑器内不可见（空白）
- 尝试注册自定义元素 → snabbdom VNode 兼容问题 → 白屏

## 方案：数据分离（Token/Map 模式）

核心思路：编辑器只接触纯文本，原始数据存在独立的数据结构中。

```
┌─ wangEditor ───────────────────────┐
│  [[!mermaid_abc123]]               │  ← 纯文本 Token
├────────────────────────────────────┤
│  Map（内存中）                     │
│  mermaid_abc123 → "graph TD..."    │  ← 原始代码
├────────────────────────────────────┤
│  渲染器（详情页 / 预览）            │
│  Token → 查 Map → SVG              │
└────────────────────────────────────┘
```

### 三个核心操作

**parseMermaid(html)** — 加载时，HTML → Token
```
输入: <div data-mermaid="graph TD"></div><p>text</p>
输出: {
  html: "[[!id]]<p>text</p>",
  map:  { id: { code: "graph TD" } }
}
```

**mergeMermaid(html, map)** — 保存时，Token → HTML
```
输入: "[[!id]]<p>text</p>" + { id: { code: "graph TD" } }
输出: { html: '<div data-mermaid="graph TD"></div><p>text</p>', map }
```

**MermaidManager** — 管理对话框
- 新建/编辑/删除 Mermaid 条目
- 实时 SVG 预览
- 复制 Token `[[!id]]` 到剪贴板，用户自行粘贴到编辑器
- 手动清除未使用的条目（懒清除）

### 编码安全

见 [mermaid/encoding-safety.md](mermaid/encoding-safety.md)

## 为什么不用其他方案

| 方案 | 结果 |
|------|------|
| 注册自定义 slate 元素 + snabbdom 渲染 | snabbdom 版本冲突 → 白屏 |
| 字符串替换 div↔p 标签 | 保存时数据可能丢失 |
| 自定义元素 parseHtml + elemToHtml | 依赖 wangEditor 内容模型 |
| **Token/Map 分离**（最终方案） | ✅ 纯文本，零依赖，数据独立 |

## 文件结构

```
src/
├── utils/mermaid-token.js         # parseMermaid / mergeMermaid / extractUsedIds
├── components/MermaidManager.vue  # 管理对话框
├── components/WgEditor.vue        # 编辑器集成（加载时 parse，保存时 merge）
├── components/WgEditor/
│   ├── custom-menus.js            # 📊 按钮 → 打开 MermaidManager
│   └── mermaid-plugin.js          # 备用方案（slate 自定义元素）
design/
├── mermaid.md                     # 本文件
└── mermaid/
    └── encoding-safety.md         # 编码安全机制
```
