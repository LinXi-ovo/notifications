/**
 * 提醒 Store
 *
 * 提醒数据存储在 mission.reminders[] 数组中（layoutData 序列化）
 * 提供 CRUD + 检查到期提醒的逻辑。
 */
import { defineStore } from 'pinia'
import { shortId } from '@/types/mission'
import { useMissionStore } from './mission'

export const useMissionReminderStore = defineStore('missionReminder', {
  state: () => ({
    /** 已触发的提醒列表（UI 用） */
    triggered: []
  }),

  actions: {
    /**
     * 获取当前 Mission 的所有提醒
     * @returns {import('@/types/mission').Reminder[]}
     */
    getReminders() {
      const ms = useMissionStore()
      return ms.currentMission?.reminders || []
    },

    /**
     * 添加提醒
     * @param {Object} data
     * @param {'deadline'|'idle'|'status-check'|'manual'} data.type
     * @param {Object} data.trigger
     * @param {Object} data.action
     * @returns {import('@/types/mission').Reminder|null}
     */
    addReminder(data) {
      const ms = useMissionStore()
      if (!ms.currentMission) return null
      if (!ms.currentMission.reminders) ms.currentMission.reminders = []

      const reminder = {
        id: `rem-${shortId()}`,
        missionId: ms.currentMission.id,
        type: data.type || 'manual',
        trigger: data.trigger || {},
        action: data.action || { method: 'in-app', message: '' },
        enabled: true
      }

      ms.currentMission.reminders.push(reminder)
      ms.currentMission.updatedAt = new Date().toISOString()
      ms._saveMission()
      return reminder
    },

    /**
     * 更新提醒
     * @param {string} reminderId
     * @param {Object} patch
     */
    updateReminder(reminderId, patch) {
      const ms = useMissionStore()
      if (!ms.currentMission?.reminders) return
      const idx = ms.currentMission.reminders.findIndex(r => r.id === reminderId)
      if (idx === -1) return
      Object.assign(ms.currentMission.reminders[idx], patch)
      ms.currentMission.updatedAt = new Date().toISOString()
      ms._saveMission()
    },

    /**
     * 删除提醒
     * @param {string} reminderId
     */
    removeReminder(reminderId) {
      const ms = useMissionStore()
      if (!ms.currentMission?.reminders) return
      ms.currentMission.reminders = ms.currentMission.reminders.filter(r => r.id !== reminderId)
      ms.currentMission.updatedAt = new Date().toISOString()
      ms._saveMission()
    },

    /**
     * 检查到期提醒（调用后触发匹配的提醒）
     * @param {string} nodeId
     * @returns {Array} 已触发的提醒消息列表
     */
    checkReminders(nodeId = null) {
      const ms = useMissionStore()
      if (!ms.currentMission) return []
      const now = Date.now()
      const triggered = []

      for (const r of ms.currentMission.reminders || []) {
        if (!r.enabled) continue

        // deadline 类型
        if (r.type === 'deadline' && r.trigger.condition) {
          const targetNode = ms.currentMission.nodes.find(n => n.id === r.trigger.sourceNodeId)
          if (targetNode?.deadline) {
            const deadline = new Date(targetNode.deadline).getTime()
            const offset = (r.trigger.offset || 0) * 3600000 // hours → ms
            // 在截止时间前 offset 小时触发
            if (deadline - offset <= now && targetNode.status !== 'completed') {
              triggered.push({
                reminderId: r.id,
                message: r.action.message || `节点「${targetNode.title}」即将截止`,
                targetNode: targetNode.id
              })
            }
          }
        }

        // manual 类型（手动发送的提醒）
        if (r.type === 'manual') {
          if (!nodeId || r.trigger.sourceNodeId === nodeId) {
            triggered.push({
              reminderId: r.id,
              message: r.action.message,
              targetNode: r.trigger.sourceNodeId
            })
          }
        }
      }

      this.triggered = triggered
      return triggered
    },

    /**
     * 清除已触发的提醒
     */
    clearTriggered() {
      this.triggered = []
    }
  }
})
