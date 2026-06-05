<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
      <!-- header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">⏰ 催促提醒</h2>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="flex-1 overflow-auto p-4 space-y-4">
        <!-- 选择目标节点 -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">目标节点（可选）</label>
          <select v-model="targetNodeId" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部节点</option>
            <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.title }} ({{ statusLabel(n.status) }})</option>
          </select>
        </div>

        <!-- 提醒消息 -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">催促消息</label>
          <textarea v-model="message" rows="3" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="例如：请尽快填写信息表，截止日期将至..."></textarea>
        </div>

        <!-- 已有提醒列表 -->
        <div>
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">已设提醒</h3>
          <div v-if="localReminders.length" class="space-y-2">
            <div v-for="r in localReminders" :key="r.id" class="flex items-start justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs px-1.5 py-0.5 rounded font-medium" :class="r.type === 'manual' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'">
                    {{ typeLabel(r.type) }}
                  </span>
                  <span v-if="r.enabled" class="text-xs text-green-500">🟢 启用</span>
                  <span v-else class="text-xs text-gray-400">⚪ 禁用</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 truncate">{{ r.action.message || '无消息' }}</p>
                <p v-if="r.trigger.sourceNodeId" class="text-xs text-gray-400 mt-0.5">
                  节点: {{ getNodeName(r.trigger.sourceNodeId) }}
                </p>
              </div>
              <div class="flex items-center gap-1 ml-2 shrink-0">
                <button class="text-xs px-1.5 py-0.5 text-gray-400 hover:text-green-500" @click="toggleReminder(r.id)" :title="r.enabled ? '禁用' : '启用'">
                  {{ r.enabled ? '⏸' : '▶️' }}
                </button>
                <button class="text-xs px-1.5 py-0.5 text-gray-400 hover:text-red-500" @click="deleteReminder(r.id)">🗑️</button>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400 dark:text-gray-500 text-center py-3">暂无提醒</p>
        </div>

        <!-- 触发提醒 -->
        <div v-if="reminderStore.triggered.length" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg p-3">
          <h4 class="text-xs font-semibold text-orange-600 mb-1">🔔 已触发的提醒</h4>
          <div v-for="t in reminderStore.triggered" :key="t.reminderId" class="text-sm text-orange-700 dark:text-orange-300 mb-1">
            {{ t.message }}
          </div>
          <button class="text-xs text-orange-500 hover:text-orange-700 mt-1" @click="reminderStore.clearTriggered()">清除</button>
        </div>
      </div>

      <!-- footer -->
      <div class="flex justify-between items-center px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <button class="text-xs px-2 py-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors" @click="checkNow" :disabled="!nodes.length">
          🔔 检查到期
        </button>
        <div class="flex gap-2">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="$emit('close')">关闭</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!message.trim()" @click="saveManualReminder">
            ＋ 添加提醒
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMissionStore } from '@/stores/mission'
import { useMissionReminderStore } from '@/stores/mission-reminder'

const emit = defineEmits(['close'])

const missionStore = useMissionStore()
const reminderStore = useMissionReminderStore()

const targetNodeId = ref('')
const message = ref('')

const nodes = computed(() => missionStore.currentMission?.nodes || [])
const localReminders = computed(() => reminderStore.getReminders())

function getNodeName(nodeId) {
  return missionStore.currentMission?.nodes.find(n => n.id === nodeId)?.title || nodeId
}

function statusLabel(s) {
  const map = { 'todo': '未开始', 'in-progress': '进行中', 'completed': '已完成', 'blocked': '阻塞', 'cancelled': '已取消' }
  return map[s] || s
}

function typeLabel(type) {
  const map = { 'deadline': '⏰ 截止', 'idle': '⏸ 空闲', 'status-check': '🔄 状态', 'manual': '📣 手动' }
  return map[type] || type
}

function saveManualReminder() {
  reminderStore.addReminder({
    type: 'manual',
    trigger: { sourceNodeId: targetNodeId.value || null },
    action: { method: 'in-app', message: message.value.trim() }
  })
  message.value = ''
}

function deleteReminder(reminderId) {
  if (!confirm('确定删除此提醒？')) return
  reminderStore.removeReminder(reminderId)
}

function toggleReminder(reminderId) {
  const r = localReminders.value.find(r => r.id === reminderId)
  if (r) reminderStore.updateReminder(reminderId, { enabled: !r.enabled })
}

function checkNow() {
  reminderStore.checkReminders(targetNodeId.value || undefined)
}

onMounted(() => {
  reminderStore.checkReminders()
})
</script>
