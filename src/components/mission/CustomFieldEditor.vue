<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
      <!-- header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">📋 自定义字段管理</h2>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="flex-1 overflow-auto p-4 space-y-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">自定义字段会附加到每个任务节点上，按角色控制可见性和编辑权限。</p>

        <!-- 字段列表 -->
        <div v-for="(field, idx) in localFields" :key="field._key" class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">字段 {{ idx + 1 }}</span>
            <button class="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" @click="removeField(idx)">🗑️ 移除</button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">字段标签</label>
              <input v-model="field.label" type="text" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="如：学号" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">字段类型</label>
              <select v-model="field.type" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                <option value="text">文本</option>
                <option value="textarea">多行文本</option>
                <option value="number">数字</option>
                <option value="date">日期</option>
                <option value="select">下拉选择</option>
                <option value="multi-select">多选</option>
                <option value="boolean">布尔值</option>
                <option value="url">链接</option>
              </select>
            </div>
          </div>

          <!-- select/multi-select 选项 -->
          <div v-if="field.type === 'select' || field.type === 'multi-select'">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">选项（每行一个）</label>
            <textarea v-model="field._optionsText" rows="3" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono resize-none" placeholder="选项A&#10;选项B&#10;选项C"></textarea>
          </div>

          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input v-model="field.required" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
              必填
            </label>
            <div class="text-sm text-gray-400">
              排序: <input v-model.number="field.order" type="number" min="0" class="w-16 px-1 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none" />
            </div>
          </div>

          <!-- 可见性/编辑性配置 -->
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                可见角色 <span class="text-gray-400 font-normal">(空=所有人可见)</span>
              </label>
              <div class="space-y-1 max-h-24 overflow-y-auto">
                <label v-for="r in roles" :key="r.id" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input :checked="field.visibleToRoles.includes(r.id)" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" @change="toggleVisibleRole(field, r.id)" />
                  {{ r.emoji }} {{ r.name }}
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                可编辑角色 <span class="text-gray-400 font-normal">(空=只读)</span>
              </label>
              <div class="space-y-1 max-h-24 overflow-y-auto">
                <label v-for="r in roles" :key="r.id" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input :checked="field.editableByRoles.includes(r.id)" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" @change="toggleEditableRole(field, r.id)" />
                  {{ r.emoji }} {{ r.name }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!localFields.length" class="text-center py-8 text-gray-400 dark:text-gray-500">
          <p class="text-3xl mb-2">📋</p>
          <p class="text-sm">暂无自定义字段</p>
        </div>

        <!-- 添加字段按钮 -->
        <button class="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors" @click="addField">
          ＋ 添加字段
        </button>
      </div>

      <!-- footer -->
      <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="$emit('close')">取消</button>
        <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { shortId } from '@/types/mission'

const props = defineProps({
  /** 当前自定义字段数组 */
  fields: { type: Array, default: () => [] },
  /** 任务的角色列表，用于配置可见性/编辑性 */
  roles: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'save'])

/** 本地副本 */
const localFields = ref(props.fields.map(f => ({
  ...f,
  _key: f.id || shortId(),
  _optionsText: Array.isArray(f.options) ? f.options.join('\n') : ''
})))

const roles = computed(() => props.roles)

function addField() {
  localFields.value.push({
    id: `cf-${shortId()}`,
    _key: shortId(),
    label: '',
    type: 'text',
    required: false,
    defaultValue: null,
    appliesToRole: null,
    visibleToRoles: [],
    editableByRoles: [],
    order: localFields.value.length,
    options: null,
    _optionsText: ''
  })
}

function removeField(idx) {
  localFields.value.splice(idx, 1)
}

function toggleVisibleRole(field, roleId) {
  const idx = field.visibleToRoles.indexOf(roleId)
  if (idx === -1) field.visibleToRoles.push(roleId)
  else field.visibleToRoles.splice(idx, 1)
}

function toggleEditableRole(field, roleId) {
  const idx = field.editableByRoles.indexOf(roleId)
  if (idx === -1) field.editableByRoles.push(roleId)
  else field.editableByRoles.splice(idx, 1)
}

function save() {
  // 清理内部字段，解析选项文本
  const result = localFields.value.map(f => {
    const cleaned = { ...f }
    delete cleaned._key

    // 解析选项
    if (cleaned.type === 'select' || cleaned.type === 'multi-select') {
      cleaned.options = cleaned._optionsText
        ? cleaned._optionsText.split('\n').map(s => s.trim()).filter(Boolean)
        : []
    }
    delete cleaned._optionsText
    return cleaned
  })

  emit('save', result)
}
</script>
