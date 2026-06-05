<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 模拟导航栏 -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <router-link to="/settings" class="flex items-center gap-2 no-underline text-sm text-blue-500">
          ← 返回设置
        </router-link>
        <span class="text-xs text-gray-400">🔬 实验室 · 模拟通知</span>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-6">
      <!-- 模拟通知卡片 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <!-- 分类 + 优先级 -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">🧪 测试</span>
        </div>

        <!-- 标题 -->
        <h1 class="text-2xl font-bold text-gray-900 mb-3 m-0">🔬 [模拟通知] PDF 预览测试</h1>

        <!-- 元信息 -->
        <div class="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
          <span>实验室</span>
          <span>·</span>
          <span>内部测试</span>
          <span>·</span>
          <span>{{ now }}</span>
        </div>

        <hr class="border-gray-200 mb-6" />

        <!-- 正文 -->
        <div ref="contentRef" class="prose prose-sm max-w-none text-gray-800 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800">
          <p>这是一个模拟通知，用来测试 PDF 预览功能。</p>
          <p>点击下面的链接测试 PDF.js 预览效果：</p>

          <p>
            <a
              href="https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf"
              target="_blank"
            >📄 Mozilla PDF.js 示例文档（小文件，适合测试）</a>
          </p>
          <p>
            <a
              href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
              target="_blank"
            >📄 W3C 示例 PDF（极简，1 页）</a>
          </p>

          <hr class="my-4" />

          <p>你也可以输入自己的 PDF 链接测试：</p>
          <div class="not-prose flex gap-2 mb-4">
            <input
              v-model="customUrl"
              type="text"
              placeholder="输入 PDF 链接..."
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              @keydown.enter="openCustom"
            />
            <button
              class="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none shrink-0"
              @click="openCustom"
            >预览</button>
          </div>

          <p v-if="savedCosUrl" class="text-xs text-gray-400">
            已保存的 COS PDF 链接（如有则自动加载）：
            <a :href="savedCosUrl" target="_blank" class="text-blue-500">{{ savedCosFileName }}</a>
          </p>
        </div>
      </div>
    </main>

    <!-- PDF 预览 -->
    <PdfPreview :visible="pdfPreview.show" :url="pdfPreview.url" :filename="pdfPreview.filename" @close="pdfPreview.show = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import PdfPreview from '@/components/PdfPreview.vue'

const contentRef = ref(null)
const customUrl = ref('')
const now = ref(new Date().toLocaleDateString('zh-CN'))
const savedCosUrl = ref('')
const savedCosFileName = ref('')

const pdfPreview = ref({ show: false, url: '', filename: '' })

onMounted(async () => {
  await nextTick()
  // 查找内容中的 PDF 链接，绑定点击预览
  if (!contentRef.value) return
  const pdfLinks = contentRef.value.querySelectorAll('a[href$=".pdf"]')
  pdfLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const urlParts = a.href.split('/')
      const filename = decodeURIComponent(urlParts[urlParts.length - 1]) || 'document.pdf'
      pdfPreview.value = { show: true, url: a.href, filename }
    })
  })
})

function openCustom() {
  if (!customUrl.value.trim()) return
  const url = customUrl.value.trim()
  const filename = url.split('/').pop() || 'document.pdf'
  pdfPreview.value = { show: true, url, filename }
}
</script>
