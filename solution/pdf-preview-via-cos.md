# PDF 预览方案：PDF.js viewer iframe + ?file= 参数

## 架构

```
用户点击 PDF 链接（<a href="...pdf">）
    │
    ▼
DetailView 拦截点击 → 打开 PdfPreview 模态框
    │
    ▼
PdfPreview.vue 构建 viewer URL：
  /lab/pdf-viewer.html?file=encodeURIComponent(pdfUrl)
    │
    ▼
iframe 加载 pdf-viewer.html
    │
    ▼
pdf-viewer.html：
  从 URL 参数 ?file= 获取 PDF 地址
  CDN 加载 PDF.js → canvas 逐页渲染
  自带翻页、缩放、下载、打开按钮
```

## 关键文件

| 文件 | 作用 |
|------|------|
| `src/components/PdfPreview.vue` | 模态框容器，iframe 指向 viewer |
| `public/lab/pdf-viewer.html` | PDF.js viewer 页，`?file=` 参数接收 URL |
| `dev_tools/patch-pdfjs.cjs` | postinstall 脚本，注释掉 PDF.js origin 校验 |
| `solution/pdf-preview-via-cos.md` | 本文档 |

## PDF.js 跨域补丁

PDF.js 在 range 请求时校验 `response-origin` 是否匹配，跨域（COS）时会抛异常。

**修补方法**：`ensureResponseOrigin` 中的 `throw` 注释掉

文件位置（手动修改 + postinstall 脚本自动修补）：
```
node_modules/pdfjs-dist/build/pdf.mjs          → ensureResponseOrigin
node_modules/pdfjs-dist/legacy/build/pdf.mjs   → ensureResponseOrigin
```

**postinstall 自动修补**：`dev_tools/patch-pdfjs.cjs`
```json
// package.json
"scripts": {
  "postinstall": "node dev_tools/patch-pdfjs.cjs"
}
```

## 方案对比

| 方案 | 维护量 | 特点 |
|------|--------|------|
| **PDF.js viewer (当前)** | 低 | viewer 独立于主应用，通过 iframe + ?file= 集成 |
| iframe 直连 COS | 零 | 受 Content-Disposition 影响，会白屏 |
| COS 配置 inline | 零维护 | 需绑定自定义域名才能生效 |

## lab 目录

`public/lab/` 下的测试页面：

| 页面 | 说明 |
|------|------|
| `pdf-viewer.html` | 实际使用的 PDF.js viewer（PdfPreview.vue 加载） |
| `pdf-preview.html` | PDF.js 独立演示页（带说明、URL 输入框） |

## COS 配置（可选）

如想让 COS URL 直接预览而非下载：
```
存储桶 → 数据处理 → 高级设置 → 自定义头部
文件后缀: .pdf
Header: Content-Disposition = inline
```

当前方案不依赖此配置也能正常预览。
