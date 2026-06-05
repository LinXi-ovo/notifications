# HTML 编码安全机制

## 问题

Mermaid 代码（以及其他自定义内容）通过 HTML 属性 `data-mermaid="CODE"` 存储。
属性值中不能直接包含某些字符（`"` `>` `<` `&`），否则会破坏 HTML 结构。

## 两个方向

### ① 保存方向（编辑器/Map → Bmob）

```
原始代码            graph TD\n  A --> B{判断?}
                      ↓ escAttr()
HTML 属性值          graph TD\n  A --&gt; B{判断?}
                      ↓ 插入到 HTML
Bmob 存储           <div data-mermaid="graph TD
  A --&gt; B{判断?}"></div>
```

**函数**: `wrapDiv()` 中的 `escAttr()`  
**位置**: `src/utils/mermaid-token.js`  
**编码表**:

| 字符 | 编码后 | 原因 |
|------|--------|------|
| `"` | `&quot;` | 属性值定界符 |
| `>` | `&gt;` | HTML 标签结束符 |
| `<` | `&lt;` | HTML 标签开始符 |
| `&` | `&amp;` | HTML 实体开始符 |

> 不编码会怎样？  
> `A[点击"确认"]` 中的 `"` 会提前结束 `data-mermaid` 属性值。  
> `A > B` 中的 `>` 在某些 HTML 上下文中可能被解释为标签结束。

### ② 加载方向（Bmob → 编辑器/Map）

```
Bmob 内容           <div data-mermaid="graph TD
  A --&gt; B{判断?}"></div>
                      ↓ regex 提取属性值（原文，不解码）
提取到               graph TD\n  A --&gt; B{判断?}
                      ↓ decodeEntities()
存入 Map             graph TD\n  A --> B{判断?}
```

**函数**: `parseMermaid()` 中的 `decodeEntities()`  
**位置**: `src/utils/mermaid-token.js`  
**解码表**:

| 编码 | 解码后 |
|------|--------|
| `&amp;` | `&` |
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&quot;` | `"` |
| `&#39;` | `'` |

> 不解码会怎样？  
> Map 中存的是 `--&gt;` 而非 `-->`。  
> 下次保存时 `escAttr()` 把 `&` 再编码为 `&amp;` → `&amp;gt;` → **双重编码**。  
> Mermaid 渲染引擎不认识 `&amp;gt;` → 语法报错。

## 双重编码的完整链条

```
正确:
  A --> B
    ↓ escAttr()        [保存]
  A --&gt; B
    ↓ decodeEntities() [加载]
  A --> B               ✅

双重编码:
  A --> B
    ↓ escAttr()        [第一次保存]
  A --&gt; B
    ↓ (缺少解码)       [加载时没 decode]
  A --&gt; B            ← Map 中存的是编码后的
    ↓ escAttr()        [第二次保存]
  A --&amp;gt; B         ← `&` → `&amp;`
    ↓ Mermaid 渲染
  语法错误 💥
```

## 安全机制的完整数据流

```
编辑器 Token:  [[!mermaid_abc123]]
       │
       ▼  mergeMermaid()
       │   扫描 [[!id]]
       │   查 Map 取原始代码
       │   escAttr() 编码 → <div data-mermaid="...">
       ▼
Bmob HTML:  <div data-mermaid="CODE"></div>
       │
       ▼  parseMermaid()
       │   正则提取属性值
       │   decodeEntities() 解码
       │   生成 ID → 存入 Map
       ▼
编辑器 Token:  [[!mermaid_abc123]]
```

## 相关文件

| 文件 | 作用 |
|------|------|
| `src/utils/mermaid-token.js` | `escAttr()` / `decodeEntities()` / `wrapDiv()` |
| `src/components/WgEditor.vue` | 加载时调 `parseMermaid`，保存时调 `mergeMermaid` |
| `src/components/WgEditor/mermaid-plugin.js` | 备用方案（自定义元素），也有自己的 `mermaidToHtml` |
| `src/views/DetailView.vue` | 读取 `<div data-mermaid>` 直接传 mermaid.render() |
