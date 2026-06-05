<template>
  <div v-if="visibleFields.length" class="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
    <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📋 自定义字段</h4>

    <div v-for="field in visibleFields" :key="field.id" class="space-y-1">
      <label class="block text-xs font-medium text-gray-600 dark:text-gray-300">
        {{ field.label }}
        <span v-if="field.required" class="text-red-400">*</span>
      </label>

      <!-- 文本 -->
      <input v-if="field.type === 'text'" :value="getValue(field.id)" @input="setValue(field.id, $event.target.value)" type="text"
        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        :class="fieldClass(field)" :readonly="!isEditable(field)" :disabled="!isEditable(field)" :placeholder="field.required ? '必填' : '可选'" />

      <!-- 多行文本 -->
      <textarea v-else-if="field.type === 'textarea'" :value="getValue(field.id)" @input="setValue(field.id, $event.target.value)" rows="3"
        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        :class="fieldClass(field)" :readonly="!isEditable(field)" :disabled="!isEditable(field)" :placeholder="field.required ? '必填' : '可选'"></textarea>

      <!-- 数字 -->
      <input v-else-if="field.type === 'number'" :value="getValue(field.id)" @input="setValue(field.id, parseFloat($event.target.value) || 0)" type="number"
        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        :class="fieldClass(field)" :readonly="!isEditable(field)" :disabled="!isEditable(field)" />

      <!-- 日期 -->
      <input v-else-if="field.type === 'date'" :value="getValue(field.id)" @input="setValue(field.id, $event.target.value)" type="date"
        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        :class="fieldClass(field)" :readonly="!isEditable(field)" :disabled="!isEditable(field)" />

      <!-- 下拉选择 -->
      <select v-else-if="field.type === 'select'" :value="getValue(field.id)" @change="setValue(field.id, $event.target.value)"
        class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
        :class="fieldClass(field)" :disabled="!isEditable(field)">
        <option value="">请选择...</option>
        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <!-- 多选 -->
      <div v-else-if="field.type === 'multi-select'" class="space-y-1">
        <label v-for="opt in field.options" :key="opt" class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer" :class="!isEditable(field) ? 'opacity-70' : ''">
          <input type="checkbox" :checked="(getValue(field.id) || []).includes(opt)" @change="toggleMulti(field.id, opt)" :disabled="!isEditable(field)"
            class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
          {{ opt }}
        </label>
      </div>

      <!-- 布尔 -->
      <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
        <input type="checkbox" :checked="!!getValue(field.id)" @change="setValue(field.id, $event.target.checked)" :disabled="!isEditable(field)"
          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
        <span>是 / 否</span>
      </label>

      <!-- URL -->
      <div v-else-if="field.type === 'url'">
        <input :value="getValue(field.id)" @input="setValue(field.id, $event.target.value)" type="url"
          class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
          :class="fieldClass(field)" :readonly="!isEditable(field)" :disabled="!isEditable(field)" placeholder="https://..." />
        <a v-if="getValue(field.id)" :href="getValue(field.id)" target="_blank" class="text-xs text-blue-500 hover:underline mt-0.5 inline-block">↗ 打开链接</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  /** 上级的 Node 对象（需要 customValues） */
  node: { type: Object, required: true },
  /** 自定义字段 Schema 列表 */
  fields: { type: Array, default: () => [] }
})

const emit = defineEmits(['update'])

const missionStore = useMissionStore()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin && missionStore.adminBypass)

/** 对当前用户可见的字段（按角色过滤） */
const visibleFields = computed(() => {
  if (!userStore.username) return []
  return props.fields.filter(f => {
    // checkFieldPermission 处理可见性
    const perm = missionStore.checkFieldPermission(userStore.username, f.id)
    return perm !== 'hidden'
  })
})

function fieldClass(field) {
  const perm = getFieldPerm(field)
  if (perm === 'readonly') return 'bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-default'
  return ''
}

function getFieldPerm(field) {
  if (isAdmin.value) return 'editable'
  return missionStore.checkFieldPermission(userStore.username, field.id)
}

function isEditable(field) {
  return getFieldPerm(field) === 'editable'
}

function getValue(fieldId) {
  return props.node.customValues?.[fieldId] ?? null
}

function setValue(fieldId, val) {
  if (!isEditable(fields.value.find(f => f.id === fieldId))) return
  const values = { ...(props.node.customValues || {}), [fieldId]: val }
  emit('update', values)
}

function toggleMulti(fieldId, opt) {
  const current = getValue(fieldId) || []
  const next = current.includes(opt)
    ? current.filter(v => v !== opt)
    : [...current, opt]
  setValue(fieldId, next)
}

const fields = computed(() => props.fields)
</script>
