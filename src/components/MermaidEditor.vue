<template>
  <teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @mousedown.self="onBackdrop"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <!-- 标题 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 m-0">{{ isEdit ? '编辑' : '新建' }} Mermaid 流程图</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
        </div>

        <!-- 编辑区 -->
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">Mermaid 代码</label>
            <textarea
              v-model="code"
              class="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows="8"
              spellcheck="false"
              placeholder="粘贴或输入 Mermaid 代码..."
            ></textarea>
          </div>

          <!-- 预览 -->
          <div>
            <label class="block text-sm text-gray-600 mb-1">预览</label>
            <div
              ref="previewRef"
              class="w-full min-h-[100px] p-4 border border-gray-200 rounded bg-white flex items-center justify-center overflow-x-auto"
            >
              <div v-if="!code.trim()" class="text-xs text-gray-400">输入代码后自动预览</div>
              <div v-else-if="previewLoading" class="text-xs text-gray-400">⏳ 渲染中...</div>
              <div v-else-if="previewError" class="text-xs text-red-500 text-center w-full">
                <p class="mb-1">⚠️ 渲染失败</p>
                <pre class="text-left p-2 bg-red-50 rounded text-xs whitespace-pre-wrap">{{ previewError }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            class="px-4 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer"
            @click="close"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 cursor-pointer border-none disabled:opacity-50"
            :disabled="!code.trim()"
            @click="confirm"
          >
            {{ isEdit ? '保存修改' : '插入' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  code: { type: String, default: '' },
})
const emit = defineEmits(['close', 'save'])

const previewRef = ref(null)
const code = ref(props.code || '')
const previewLoading = ref(false)
const previewError = ref('')

const isEdit = computed(() => !!props.code)

// 外部 code 变化同步
watch(() => props.code, (val) => {
  code.value = val || ''
})

// 代码变化触发预览
watch(code, (val) => {
  if (val.trim()) renderPreview(val)
})

async function renderPreview(codeText) {
  previewLoading.value = true
  previewError.value = ''
  const container = previewRef.value
  if (!container) return
  // 清除旧 SVG
  container.querySelectorAll('svg').forEach(s => s.remove())

  const clean = codeText.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
  if (!clean) { previewLoading.value = false; return }

  try {
    const mod = await import('mermaid')
    const mermaid = mod.default || mod
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    const id = `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { svg } = await mermaid.render(id, clean)
    container.innerHTML += svg
    const svgEl = container.querySelector('svg:last-child')
    if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
  } catch (e) {
    previewError.value = e.message || String(e)
  } finally {
    previewLoading.value = false
  }
}

function onBackdrop() {
  if (window.getSelection()?.toString()) return
  close()
}

function close() {
  emit('close')
}

function confirm() {
  if (!code.value.trim()) return
  emit('save', code.value.trim())
}

// 打开时自动聚焦预览
watch(() => props.visible, (val) => {
  if (val && code.value.trim()) {
    nextTick(() => renderPreview(code.value))
  }
})
</script>
