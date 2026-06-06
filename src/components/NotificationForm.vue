<template>
  <div class="bg-white rounded-lg shadow-sm border p-6">
    <h2 class="text-lg font-bold text-gray-800 mb-4 m-0">{{ isEdit ? '编辑通知' : '新建通知' }}</h2>

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
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">分类</label>
              <select v-model="form.type" class="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                <option value="">无</option>
                <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.icon }} {{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">优先级</label>
              <select v-model="form.priority" class="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                <option :value="0">普通</option>
                <option :value="1">⭐ 置顶</option>
                <option :value="2">🔴 重要</option>
                <option :value="3">🚨 紧急</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">截止日期</label>
              <input type="date" v-model="form.deadline" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">来源群组</label>
              <input v-model="form.sourceGroup" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">发布人</label>
              <input v-model="form.sourcePerson" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">原文链接</label>
            <input v-model="form.originalLink" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">标签（逗号分隔）</label>
            <input v-model="tagsInput" placeholder="考试, 重要, 紧急" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
          </div>
        </div>
      </details>

      <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

      <div class="flex gap-2">
        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <button type="button" class="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 cursor-pointer border-none" @click="$emit('cancel')">
          取消
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { createNotification, updateNotification } from '@/api/notification'
import { getCategories } from '@/api/category'
import { DEFAULT_CATEGORIES } from '@/utils/constants'
import { useUserStore } from '@/stores/user'
import WgEditor from '@/components/WgEditor.vue'

const props = defineProps({
  notification: { type: Object, default: null }
})

const userStore = useUserStore()

const emit = defineEmits(['saved', 'cancel'])

const isEdit = ref(false)
const saving = ref(false)
const error = ref('')
const categories = ref([])
const tagsInput = ref('')

const form = reactive({
  title: '',
  content: '',
  type: '',
  priority: 0,
  deadline: '',
  sourceGroup: '',
  sourcePerson: '',
  originalLink: '',
  tags: [],
  status: 'active'
})

onMounted(async () => {
  try {
    categories.value = await getCategories()
    // 补入 DEFAULT_CATEGORIES 中 Bmob 缺失的分类
    for (const defCat of DEFAULT_CATEGORIES) {
      if (defCat.value === 'test') continue // test 单独处理
      if (!categories.value.some(c => c.value === defCat.value)) {
        categories.value.push({ ...defCat })
      }
    }
    // 确保 test 分类存在（允许管理员创建测试通知）
    const testCat = DEFAULT_CATEGORIES.find(c => c.value === 'test')
    if (testCat && !categories.value.some(c => c.value === 'test')) {
      categories.value.push({ ...testCat })
    }
  } catch (e) { /* ignore */ }

  if (props.notification) {
    isEdit.value = true
    Object.assign(form, {
      title: props.notification.title || '',
      content: props.notification.content || '',
      type: props.notification.type || '',
      priority: props.notification.priority ?? 0,
      deadline: props.notification.deadline || '',
      sourceGroup: props.notification.sourceGroup || '',
      sourcePerson: props.notification.sourcePerson || '',
      originalLink: props.notification.originalLink || '',
      tags: props.notification.tags || [],
      status: props.notification.status || 'active'
    })
    tagsInput.value = (props.notification.tags || []).join(', ')
  }
})

async function handleSave() {
  error.value = ''
  saving.value = true
  try {
    const data = {
      ...form,
      tags: tagsInput.value ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []
    }
    // 新建通知时自动填入创建者姓名
    if (!isEdit.value && !data.sourcePerson && userStore.isLoggedIn) {
      data.sourcePerson = userStore.username
    }
    if (isEdit.value && props.notification?.id) {
      await updateNotification(props.notification.id, data)
    } else {
      await createNotification(data)
    }
    emit('saved')
  } catch (e) {
    error.value = e.error || e.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>
