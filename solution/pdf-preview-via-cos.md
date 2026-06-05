# PDF 预览方案：COS + iframe

## 问题

腾讯云 COS 存储的 PDF 文件在浏览器中直接打开时，COS 默认返回 `Content-Disposition: attachment` 或缺少正确的 CORS 头，导致：
- 浏览器直接下载而非预览
- pdf.js 跨域加载失败

## 方案对比

| 方案 | 维护量 | 兼容性 | 体验 |
|------|--------|--------|------|
| **pdf.js**（旧方案） | 高 — 需维护 worker、cmaps | 好 — 所有浏览器 | 自定义翻页，但容易 CORS 失败 |
| **iframe 直接预览**（当前方案） | 零维护 | 现代浏览器内置 PDF 阅读器 | 浏览器原生翻页/缩放/搜索 |
| COS 配置 `Content-Disposition: inline` | 需要 COS 控制台操作 | 好 | 可直接打开预览 |

## 实现

### PdfPreview.vue

```vue
<template>
  <div class="fixed inset-0 z-50 bg-black/80" @click.self="close">
    <div class="bg-white rounded-lg max-w-4xl mx-4 max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b">
        <span>📄 {{ filename }}</span>
        <a :href="url" target="_blank">⬇ 下载</a>
        <button @click="close">✕</button>
      </div>
      <div class="flex-1 bg-gray-100">
        <iframe :src="url" class="w-full h-full border-none"></iframe>
      </div>
    </div>
  </div>
</template>
```

### 关键点

1. **iframe `src` 直接指向 COS URL**
   - 浏览器自动处理 PDF 渲染（内置 PDF 阅读器）
   - 不需要 pdf.js 的 worker 和 cmap 文件

2. **下载按钮保留**
   - 用户仍可下载 PDF
   - `target="_blank"` 确保下载行为

3. **错误回退**
   - iframe 加载失败时显示「直接打开查看」链接
   - 用户可手动在新标签页打开

4. **PDF 链接检测**
   - 使用方法：`querySelectorAll('a[href$=".pdf"]')`
   - 拦截点击 → `e.preventDefault()` → 打开 PdfPreview

## COS 配置优化（可选）

如需让 COS URL 直接预览而非下载，在 COS 控制台设置：

```
存储桶 → 数据处理 → 高级设置 → 自定义头部
添加规则：
  文件后缀: .pdf
  Header: Content-Disposition = inline
```

## 旧方案文件

- `PdfPreview.vue` 旧版使用 pdf.js（已移除）
- `PdfPreview.vue` 新版使用 iframe
