# 编辑器数据分离策略 📋

> 解决 wangEditor 不支持自定义元素渲染的问题
> 方案：显示层与数据层分离，类似 Obsidian `[[wikilink]]` 模式

## 问题

wangEditor 基于 slate.js，只支持它认识的 HTML 元素。
`<div data-mermaid>` 之类的自定义元素会导致：
- 编辑器内不可见（空白）
- 尝试注册自定义元素 → snabbdom VNode 兼容问题 → 白屏
- 字符串替换方案 → 数据丢失风险

## 方案：双链式数据分离

### 核心思路

```
┌─────────────────────────────────────────────┐
│  编辑器内（显示层）                           │
│  📊 [Mermaid: graph TD]                      │  ← 纯文本，wangEditor 原生支持
│  🔊 [音频: 说明录音.mp3]                      │  ← 同上
│  📎 [文件: 考场分布图.pdf]                    │  ← 同上
├─────────────────────────────────────────────┤
│  隐藏数据区（数据层）                          │
│  mermaidMap = {                              │
│    'mermaid-001': 'graph TD\n  A[开始]...',   │
│    'mermaid-002': 'sequenceDiagram\n  ...'    │
│  }                                           │
├─────────────────────────────────────────────┤
│  保存时合并                                  │
│  [Mermaid: mermaid-001] → <div data-mermaid="graph TD..."> │
└─────────────────────────────────────────────┘
```

### 三步流程

#### ① 加载（Bmob → 编辑器）

```
Bmob 内容:     <div data-mermaid="CODE"></div>
                ↓ 解析器提取
显示层:        📊 [Mermaid] graph TD
数据层:        { 'mermaid-001': 'CODE' }
                ↓ 只将显示层传给 wangEditor
编辑器看到:    📊 [Mermaid] graph TD  (纯文本段落)
```

#### ② 编辑（用户交互）

```
用户看到:      📊 [Mermaid] graph TD
                ↓ 点击/双击
弹出对话框:    (Mermaid 代码编辑器)
                ↓ 用户修改代码
数据层更新:    { 'mermaid-001': '新代码' }
                ↓ 关闭对话框
编辑器显示:    📊 [Mermaid] graph TD  (不变)
```

#### ③ 保存（编辑器 → Bmob）

```
wangEditor 输出: 📊 [Mermaid] graph TD
                 ↓ 合并器
Bmob 内容:       <div data-mermaid="CODE"></div>
```

### 名词定义

| 概念 | 说明 | 示例 |
|------|------|------|
| **占位符** | 编辑器内可见的纯文本标记 | `📊 [Mermaid] graph TD` |
| **数据 ID** | 唯一标识，关联数据层 | `mermaid-001` |
| **数据层** | 存储不可渲染的原始代码 | `Map<ID, 原始代码>` |
| **合并器** | 占位符 → 原始 HTML | 将 `[Mermaid: ID]` 替换为 `<div data-mermaid>` |
| **解析器** | 原始 HTML → 占位符 | 将 `<div data-mermaid>` 替换为 `[Mermaid: ID]` |
| **编辑器** | 只显示占位符 | wangEditor |

### 数据类型扩展

除了 Mermaid，所有 wangEditor 不原生支持的内容类型都用此方案：

| 类型 | 占位符 | 数据层 | 存储格式 |
|------|--------|--------|----------|
| Mermaid 流程图 | `📊 [Mermaid] 第一行` | Mermaid 代码 | `<div data-mermaid>` |
| 音频 | `🔊 [音频] 文件名.mp3` | COS URL | `<p><audio src="">` |
| 文件附件 | `📎 [文件] 文件名.pdf` | COS URL | `<p><a href="">📎</a></p>` |

> 注：音频/文件目前 wangEditor 自定义菜单已能正常工作（通过 `dangerouslyInsertHtml`），暂不需要迁移到此方案。仅 Mermaid 需要。

## 实施步骤

### Phase 1：核心机制

- [ ] 实现 `parseContent(html)` 解析器
  - 扫描 `<div data-mermaid="CODE">` → 分配 UUID → 存入 mermaidMap
  - 替换为 `📊 [Mermaid] 第一行代码` 占位符文本
  - 返回纯文本 HTML（只含 wangEditor 认识的元素）
  
- [ ] 实现 `mergeContent(html, dataMap)` 合并器
  - 扫描文本中的 `📊 [Mermaid]` 模式 → 从 mermaidMap 查代码
  - 替换回 `<div data-mermaid="CODE">`
  - 返回完整 HTML

- [ ] 实现 `MermaidEditor.vue` 组件
  - 模态框形式，包含 textarea + 语法高亮
  - 插入/编辑/删除 Mermaid 代码
  - 实时预览（调用 mermaid.render）

### Phase 2：编辑器集成

- [ ] 更新 `WgEditor.vue`
  - 加载时：`valueHtml.value = parseContent(props.modelValue)`
  - 保存时：`emit('update:modelValue', mergeContent(editor.getHtml(), mermaidMap))`
  - 暴露 mermaidMap 给自定义 UI

- [ ] 更新 `custom-menus.js` Mermaid 按钮
  - 不再用 prompt 弹窗
  - 打开 `MermaidEditor.vue` 对话框
  - 插入占位符 `📊 [Mermaid] 第一行` + 更新 mermaidMap

- [ ] 占位符点击编辑
  - 点击编辑器内的 `📊 [Mermaid] ...` 文本 → 检测到模式 → 打开 MermaidEditor
  - 修改 mermaidMap 中的代码

### Phase 3：清理

- [ ] 删除 `mermaid-plugin.js`（不再需要自定义元素注册）
- [ ] 全面测试（插入/编辑/保存/详情页渲染）
- [ ] 更新 PLAN.md

## 为什么这个方案更好

| 对比 | 之前方案 | 新方案 |
|------|---------|--------|
| 编辑器可见性 | ❌ 空白 / 占位符靠 hack | ✅ 纯文本占位符，原生支持 |
| 数据安全 | ⚠️ 字符串替换可能丢数据 | ✅ 数据层独立，不依赖编辑器 |
| 可编辑性 | ❌ 只能 prompt 弹窗 | ✅ 专用编辑器 + 预览 |
| 扩展性 | ❌ 每个自定义类型都要适配 | ✅ 统一模式，加类型只需增加 map |
| 白屏风险 | ✅ 已解决 | ✅ 纯文本，零风险 |
| 复杂度 | ⚠️ 全靠 mermaid-plugin.js 撑着 | ✅ 清晰的分离架构 |

## 与 Obsidian 双链对比

```
Obsidian:    [[笔记名称]]    → 渲染时显示笔记内容
本方案:      📊 [Mermaid ID] → 渲染时显示 SVG 图表
                        ↑ 都通过 ID 关联数据
```
