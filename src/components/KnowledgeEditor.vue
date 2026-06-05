<template>
  <div class="bg-white rounded-lg shadow-sm border p-6">
    <h2 class="text-lg font-bold text-gray-800 mb-4 m-0">{{ isEdit ? '编辑资讯' : '新增资讯' }}</h2>

    <form @submit.prevent="handleSave" class="space-y-4">
      <!-- 标题 -->
      <div>
        <label class="block text-sm text-gray-600 mb-1">标题 *</label>
        <input
          v-model="form.title"
          class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>

      <!-- 富文本编辑器 -->
      <div>
        <label class="block text-sm text-gray-600 mb-1">内容 *</label>
        <WgEditor v-model="form.content" />
      </div>

      <!-- 更多选项 -->
      <details class="text-sm">
        <summary class="cursor-pointer text-gray-500 hover:text-gray-700">更多选项</summary>
        <div class="mt-3 space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">分类</label>
              <select v-model="form.category" class="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                <option value="">无</option>
                <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">优先级</label>
              <select v-model="form.priority" class="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                <option :value="0">普通</option>
                <option :value="1">📌 置顶</option>
                <option :value="2">🔴 必读</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">来源</label>
              <input v-model="form.source" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" placeholder="如: 图书馆" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">标签（逗号分隔）</label>
              <input v-model="tagsInput" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" placeholder="如: 图书馆, 借阅" />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">封面图 URL（可选）</label>
              <input v-model="form.coverImage" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" placeholder="https://..." />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input id="knowledge-isActive" v-model="form.isActive" type="checkbox" class="rounded" />
            <label for="knowledge-isActive" class="text-sm text-gray-600">启用推送</label>
          </div>
        </div>
      </details>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          class="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none transition-colors"
        >
          {{ isEdit ? '保存修改' : '发布' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 cursor-pointer border-none transition-colors"
          @click="$emit('cancel')"
        >
          取消
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import WgEditor from '@/components/WgEditor.vue'
import { KNOWLEDGE_CATEGORIES } from '@/types/knowledge'

const props = defineProps({
  item: { type: Object, default: null }
})

const emit = defineEmits(['saved', 'cancel'])

const isEdit = computed(() => !!props.item)

const categories = KNOWLEDGE_CATEGORIES

const form = ref({
  title: '',
  content: '',
  category: '',
  source: '',
  priority: 0,
  tags: [],
  isActive: true,
  coverImage: ''
})

const tagsInput = ref('')

onMounted(() => {
  if (props.item) {
    form.value = {
      title: props.item.title || '',
      content: props.item.content || '',
      category: props.item.category || '',
      source: props.item.source || '',
      priority: props.item.priority ?? 0,
      tags: props.item.tags || [],
      isActive: props.item.isActive !== false,
      coverImage: props.item.coverImage || ''
    }
    tagsInput.value = (props.item.tags || []).join(', ')
  }
})

async function handleSave() {
  const data = {
    ...form.value,
    tags: tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  }
  if (!data.title || !data.content) return
  emit('saved', data)
}
</script>
