<template>
  <div class="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
    <!-- 文字格式 -->
    <button v-for="btn in textButtons" :key="btn.action"
      :class="toolBtnClass(btn.active?.() || false)"
      @click="btn.action()"
      :title="btn.title"
      v-html="btn.icon"
    ></button>

    <span class="w-px h-5 bg-gray-300 mx-1"></span>

    <!-- 媒体插入 -->
    <button v-for="btn in mediaButtons" :key="btn.action"
      :class="toolBtnClass(false)"
      @click="btn.handler"
      :title="btn.title"
      v-html="btn.icon"
    ></button>

    <span class="w-px h-5 bg-gray-300 mx-1"></span>

    <!-- HTML 源码 -->
    <button
      :class="toolBtnClass(showSource)"
      @click="$emit('toggle-source')"
      title="HTML 源码"
    >
      &lt;/&gt;
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  editor: { type: Object, default: null },
  showSource: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-source', 'insert-image', 'insert-audio', 'insert-video', 'insert-file', 'insert-link'])

const ed = computed(() => props.editor)

const textButtons = computed(() => [
  { title: '加粗', icon: '<b>B</b>', action: () => ed.value && ed.value.chain().focus().toggleBold().run(), active: () => ed.value?.isActive('bold') },
  { title: '斜体', icon: '<i class="italic">I</i>', action: () => ed.value && ed.value.chain().focus().toggleItalic().run(), active: () => ed.value?.isActive('italic') },
  { title: '下划线', icon: '<u>U</u>', action: () => ed.value && ed.value.chain().focus().toggleUnderline().run(), active: () => ed.value?.isActive('underline') },
  { title: '标题1', icon: 'H1', action: () => ed.value && ed.value.chain().focus().toggleHeading({ level: 1 }).run(), active: () => ed.value?.isActive('heading', { level: 1 }) },
  { title: '标题2', icon: 'H2', action: () => ed.value && ed.value.chain().focus().toggleHeading({ level: 2 }).run(), active: () => ed.value?.isActive('heading', { level: 2 }) },
  { title: '标题3', icon: 'H3', action: () => ed.value && ed.value.chain().focus().toggleHeading({ level: 3 }).run(), active: () => ed.value?.isActive('heading', { level: 3 }) },
  { title: '无序列表', icon: '•≡', action: () => ed.value && ed.value.chain().focus().toggleBulletList().run(), active: () => ed.value?.isActive('bulletList') },
  { title: '有序列表', icon: '1.', action: () => ed.value && ed.value.chain().focus().toggleOrderedList().run(), active: () => ed.value?.isActive('orderedList') },
])

const mediaButtons = computed(() => [
  { title: '插入图片', icon: '🖼️', handler: () => emit('insert-image') },
  { title: '插入音频', icon: '🎵', handler: () => emit('insert-audio') },
  { title: '插入视频', icon: '🎬', handler: () => emit('insert-video') },
  { title: '插入文件', icon: '📎', handler: () => emit('insert-file') },
  { title: '插入链接', icon: '🔗', handler: () => emit('insert-link') },
])

function toolBtnClass(active) {
  return active
    ? 'w-7 h-7 flex items-center justify-center rounded text-xs font-medium bg-blue-100 text-blue-600 cursor-pointer border-none'
    : 'w-7 h-7 flex items-center justify-center rounded text-xs text-gray-600 hover:bg-gray-200 cursor-pointer border-none'
}
</script>
