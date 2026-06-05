# 编辑器数据分离方案

## 背景

wangEditor 基于 slate.js 内容模型，只保留其原生支持的 HTML 元素。
自定义元素（如 `<div data-mermaid>`）在编辑器中要么不可见，要么需要复杂的自定义渲染插件。

先后尝试了三种方案：

| 方案 | 结果 |
|------|------|
| 注册自定义 slate 元素 + snabbdom VNode 渲染 | snabbdom 版本冲突 → 白屏 |
| 字符串替换 div ↔ p 标签 | 编辑器内可见，但保存时数据可能丢失 |
| 自定义元素 parseHtml + elemToHtml + children 文本 | 编辑器内可见，但渲染依赖 wangEditor 的 slate 模型 |

**更根本的解法：不让 wangEditor 接触它不认识的内容。**

## 方案

编辑器中只放纯文本 Token，原始数据放在独立的数据结构中，保存时重新合并。

```
┌─ 编辑器 (wangEditor) ─────────────────────┐
│  这是一段普通文本。                         │
│  📊 [Mermaid] graph TD                    │  ← 纯文本 Token
│  这是另一段文本。                           │
├────────────────────────────────────────────┤
│  数据层 (Map)                              │
│  mermaid_abc123 → "graph TD\n  A[开始]..." │  ← 原始 Mermaid 代码
│  mermaid_def456 → "sequenceDiagram\n  ..." │
├────────────────────────────────────────────┤
│  渲染器 (详情页 / 预览)                     │
│  Token → 查找 Map → mermaid.render() → SVG │
└────────────────────────────────────────────┘
```

### 三个核心操作

#### 1. 解析（HTML → 编辑器内容）

```
输入:  <div data-mermaid="graph TD\n  A→B"></div><p>普通文本</p>
执行:  扫描 → 提取代码 → 分配 ID → 存入 Map → 替换为 Token
输出:  📊 [Mermaid] graph TD<p>普通文本</p>
      Map: { mermaid_abc123: "graph TD\n  A→B" }
```

#### 2. 编辑（用户交互）

- 用户点击 Token `📊 [Mermaid] graph TD` 时，系统识别出它是 Token
- 弹出 MermaidEditor 对话框，从 Map 取出当前代码供编辑
- 用户修改代码 → Map 更新 → 对话框关闭
- 编辑器中 Token 文字不变（但下次解析会用新代码）

#### 3. 合并（编辑器内容 → HTML）

```
输入:  📊 [Mermaid] graph TD<p>普通文本</p>
      Map: { mermaid_abc123: "graph TD\n  A→B" }
执行:  扫描 Token → 查找 Map → 替换为原始 HTML
输出:  <div data-mermaid="graph TD\n  A→B"></div><p>普通文本</p>
```

### Token 设计

```
格式:  📊 [Mermaid] <第一行代码摘要>
ID:    mermaid_<8位随机字符>     (存储在 data-mermaid-id 属性中)
摘要:  代码第一行，截取前 40 字符，用于编辑器内识别
```

Token 在编辑器中是纯文本段落，wangEditor 完全原生支持。
用户不可在编辑器中直接修改 Token 内容（修改了也只是改了显示文本，不影响实际数据）。

### 数据流向完整图

```
                       解析器 (parse)
Bmob  ──→  <div data-mermaid="CODE">  ──→  📊 [Mermaid] firstLine  ──→  wangEditor
  ↑                                                                    ↓
  │                            合并器 (merge)                          │
  └────  <div data-mermaid="CODE">  ←────  📊 [Mermaid] firstLine  ←──┘
                                              ↑ 用户点击 → 编辑对话框
                                              │ Map 中的代码更新
                                              └── 独立 UI，不影响编辑器
```

## 当前 mermaid-plugin.js 的状态

当前已注册了 `parseElemsHtml` + `elemToHtml`，编辑器内通过 children 文本显示首行代码。这个方案能工作，但：

- 依赖 wangEditor 的 slate 元素模型（可能随版本升级变化）
- parseElemsHtml 只能处理 `<div data-mermaid>`，不能同时处理其他自定义类型
- 数据耦合在编辑器中，无法独立管理

数据分离方案可以逐步替换它，两套可以共存，不影响现有通知。

## 实施计划

### Phase 1：核心工具函数

- `parseMermaid(html)` — 从 HTML 中提取 Mermaid 代码，返回 `{ html: string, map: Record<string, string> }`
- `mergeMermaid(html, map)` — 将 Token 替换回原始 HTML
- 单测：传入示例 HTML，验证 round-trip 无数据丢失

### Phase 2：编辑器集成

- `WgEditor.vue` 加载时调用 `parseMermaid`，保存时调用 `mergeMermaid`
- 自定义菜单 `📊` 改为打开 MermaidEditor 对话框（不再用 prompt）
- MermaidEditor 对话框：textarea 编辑代码 + 实时预览 SVG + 确认/取消

### Phase 3：编辑已有 Token

- 点击编辑器内的 `📊 [Mermaid] ...` → 检测到 Token 模式 → 打开 MermaidEditor
- 自动定位到对应 Map 中的代码
- 保存时更新 Map

### Phase 4（可选）

- 移除 `mermaid-plugin.js`（不再需要）
- 将此模式扩展到其他 wangEditor 不支持的内容类型
