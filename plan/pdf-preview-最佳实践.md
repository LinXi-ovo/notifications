# PDF 预览最佳实践

## 概览

通知内容中的 PDF 附件链接 → 用户点击 → `PdfPreview.vue` 模态框 → iframe 加载 `pdf-viewer.html` → PDF.js canvas 渲染。

```
通知详情页（DetailView）
  │  querySelectorAll('a[href$=".pdf"]')
  │  e.preventDefault()
  ▼
PdfPreview 模态框
  │  iframe: /lab/pdf-viewer.html?file=encodeURIComponent(pdfUrl)
  ▼
pdf-viewer.html
  │  CDN 加载 PDF.js → pdfjsLib.getDocument(url)
  │  canvas 逐页渲染
  │  翻页/缩放控制
  ▼
用户看到 PDF 内容
```

---

## 1. 架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 渲染引擎 | PDF.js（canvas） | 不受服务器 Content-Disposition 影响，全浏览器兼容 |
| 集成方式 | iframe + viewer 页面 | 与主应用隔离，PDF.js 不打包进主 bundle |
| 参数传递 | `?file=encodeURIComponent(url)` | 简单可靠，无需后端配合 |
| viewer 加载方式 | CDN 引入 | viewer 页面独立加载，不影响主应用性能 |
| 跨域处理 | 注释 pdfjs-dist origin 校验 + CORS | 允许从 COS 跨域加载 |
| postinstall 补丁 | `dev_tools/patch-pdfjs.cjs` | `npm install` 后自动重打补丁 |

## 2. 代码结构

```
src/
  components/
    PdfPreview.vue          ← 模态框容器，iframe 指向 viewer

public/
  lab/
    pdf-viewer.html         ← PDF.js viewer 页，?file= 参数
    pdf-preview.html        ← 独立演示页（带说明/URL输入）

dev_tools/
  patch-pdfjs.cjs           ← postinstall 补丁脚本

solution/
  pdf-preview-via-cos.md    ← 方案文档

最佳实践/
  本文档                     ← 最佳实践
```

## 3. 跨域处理

### 问题

PDF.js 在 range 请求时校验 response origin 是否匹配，跨域时抛异常：
```
Error: Expected range response-origin "..." to match "..."
```

### 修复

注释掉 `pdfjs-dist` 中 `ensureResponseOrigin` 的 throw：

```js
function ensureResponseOrigin(rangeOrigin, origin) {
  // if (rangeOrigin !== origin) {
  //   throw new Error(`Expected range response-origin "${rangeOrigin}" to match "${origin}".`);
  // }
}
```

两个位置：
- `node_modules/pdfjs-dist/build/pdf.mjs`
- `node_modules/pdfjs-dist/legacy/build/pdf.mjs`

**postinstall 自动补丁**：`dev_tools/patch-pdfjs.cjs`

### 前提

COS 存储桶需允许跨域。在 COS 控制台配置：
```
存储桶 → 安全管理 → CORS 设置
添加规则：
  Origin: * （或你的前端域名）
  Method: GET, HEAD
  Header: *
```

## 4. Viewer 页设计

`public/lab/pdf-viewer.html` 是隔离的 viewer 页面。

### 关键 CSS

```css
html, body { height: 100%; width: 100%; overflow: hidden; }
body { display: flex; flex-direction: column; }
#viewport { flex: 1; overflow: auto; min-height: 0; }
```

- `html, body` 用 `height: 100%`（而非 `100vh`），适配 iframe 内嵌
- `#viewport` 用 `flex: 1` + `overflow: auto`，内容超出时滚动
- `min-height: 0` 允许 flex 子元素收缩

### URL 参数

```
/lab/pdf-viewer.html?file=https%3A%2F%2Fcos.example.com%2Ffile.pdf
```

`file` 参数是经过 `encodeURIComponent` 编码的 PDF 完整 URL。

## 5. 模态框高度管理

`PdfPreview.vue` 的关键布局链：

```html
<!-- 固定全屏遮罩 -->
<div class="fixed inset-0 ... flex items-center justify-center">
  <!-- 白卡：h-full + max-h-[90vh] → 先撑满再上限 -->
  <div class="... h-full max-h-[90vh] flex flex-col">
    <!-- 顶栏：固定高度 -->
    <div class="... shrink-0">📄 文件名  [⬇下载] [✕]</div>
    <!-- viewer 区域：flex-1 占剩余空间 -->
    <div class="flex-1 min-h-0 flex">
      <iframe class="w-full h-full" />
    </div>
  </div>
</div>
```

**重点**：白卡必须同时有 `h-full` + `max-h-[90vh]`。
- `h-full`：先撑满视口高度（父容器 `fixed inset-0` = 100vh）
- `max-h-[90vh]`：再裁剪到 90vh
- 两个配合 → Flex 子元素的 `flex: 1` 才能算出正确的剩余空间

**`v-if` 而非 `v-show`**：iframe 用 `v-if` 创建，配合 `nextTick` 确保父容器已有布局尺寸后再插入。`v-show` + `display:none` 会导致 iframe 内部高度计算为 0。

## 6. Viewer iframe 的 loading 状态管理

```js
watch(() => props.visible, (val) => {
  if (val && props.url) {
    loading.value = true
    showViewer.value = false
    nextTick(() => {
      iframeKey.value++       // 强制重建 iframe
      showViewer.value = true  // v-if 创建
    })
  }
})

function onIframeLoad() {
  loading.value = false  // iframe 加载完成 → 隐藏 spinner
}
```

流程：
```
visible=true → loading spin → nextTick → 创建 iframe
                                          ↓
                                   pdf-viewer.html 开始加载
                                          ↓
                                   @load → 隐藏 spin，显示 PDF
```

## 7. 错误处理

pdf-viewer.html 在以下情况显示错误：
- PDF 加载失败（网络错误、跨域、文件损坏）
- 缺少 `?file=` 参数

错误 UI 包含：
- ❌ 图标
- 错误消息
- 「在新标签页中打开」链接（兜底方案）

## 8. 调试与测试

### 模拟通知页

`/lab/mock-notification` — 模拟真实通知详情，包含 PDF 测试链接。

### 独立 viewer

打开 `/lab/pdf-viewer.html?file=<PDF_URL>` 可直接测试。

### 已知限制

- PDF.js 不支持所有 PDF 特性（部分加密、表单、字体子集等）
- 大 PDF（>50MB）在低端设备上渲染较慢
- CDN 加载 PDF.js 需要网络（首次打开时）

## 9. 升级维护

### 升级 pdfjs-dist

1. 更新 package.json：`"pdfjs-dist": "^新版本"`
2. 运行 `npm install`（自动触发 postinstall 补丁）
3. 测试 viewer 页功能
4. 检查 `ensureResponseOrigin` 在新版本中的位置和签名

### 更新 viewer CDN 版本

`public/lab/pdf-viewer.html` 中的 CDN 链接：
```
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/X.Y.Z/pdf.min.js"></script>
// worker:
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/X.Y.Z/pdf.worker.min.js'
```

与 `pdfjs-dist` 版本保持一致。

## 10. 方案对比总结

| 方案 | 优点 | 缺点 | 当前状态 |
|------|------|------|----------|
| **PDF.js viewer iframe** | COS Content-Disposition 无关，全浏览器兼容，app bundle 不膨胀 | CDN 需要网络 | ✅ 当前方案 |
| iframe 直连 COS | 零依赖，零代码 | COS 返回 attachment 时白屏 | ❌ 废弃 |
| COS 配置 inline | 零维护 | 默认域名不生效，需自定义域名 | ⏳ 可选优化 |
