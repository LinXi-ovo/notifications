/**
 * 评论 Store — 薄封装层
 *
 * 评论数据存储在 mission.currentMission.nodes[n].comments[] 中（layoutData 序列化）
 * 本 store 提供便捷的 CRUD 操作，底层调用 missionStore。
 */
import { defineStore } from 'pinia'
import { shortId } from '@/types/mission'
import { useMissionStore } from './mission'

export const useMissionCommentStore = defineStore('missionComment', {
  actions: {
    /**
     * 获取某节点的所有评论（按时间排序）
     * @param {string} nodeId
     * @returns {import('@/types/mission').Comment[]}
     */
    getComments(nodeId) {
      const ms = useMissionStore()
      if (!ms.currentMission) return []
      const node = ms.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return []
      return (node.comments || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    },

    /**
     * 获取顶级评论（无 parentId）
     * @param {string} nodeId
     * @returns {import('@/types/mission').Comment[]}
     */
    getTopLevelComments(nodeId) {
      return this.getComments(nodeId).filter(c => !c.parentId)
    },

    /**
     * 获取某个评论的回复
     * @param {string} nodeId
     * @param {string} parentId
     * @returns {import('@/types/mission').Comment[]}
     */
    getReplies(nodeId, parentId) {
      return this.getComments(nodeId).filter(c => c.parentId === parentId)
    },

    /**
     * 获取节点评论数量
     * @param {string} nodeId
     * @returns {number}
     */
    getCommentCount(nodeId) {
      return this.getComments(nodeId).length
    },

    /**
     * 添加评论
     * @param {string} nodeId
     * @param {string} author - 用户名
     * @param {string} content
     * @param {string|null} parentId - 回复的评论 ID
     * @returns {import('@/types/mission').Comment|null}
     */
    addComment(nodeId, author, content, parentId = null) {
      const ms = useMissionStore()
      if (!ms.currentMission) return null
      const node = ms.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return null
      if (!node.comments) node.comments = []

      const now = new Date().toISOString()
      const comment = {
        id: `cmt-${shortId()}`,
        nodeId,
        author,
        content,
        mentions: extractMentions(content),
        createdAt: now,
        updatedAt: now,
        parentId,
        attachments: []
      }

      node.comments.push(comment)
      ms.currentMission.updatedAt = now
      ms._saveMission()
      return comment
    },

    /**
     * 更新评论
     * @param {string} nodeId
     * @param {string} commentId
     * @param {string} content
     * @returns {boolean}
     */
    updateComment(nodeId, commentId, content) {
      const ms = useMissionStore()
      if (!ms.currentMission) return false
      const node = ms.currentMission.nodes.find(n => n.id === nodeId)
      if (!node || !node.comments) return false
      const comment = node.comments.find(c => c.id === commentId)
      if (!comment) return false

      comment.content = content
      comment.updatedAt = new Date().toISOString()
      comment.mentions = extractMentions(content)
      ms.currentMission.updatedAt = comment.updatedAt
      ms._saveMission()
      return true
    },

    /**
     * 删除评论
     * @param {string} nodeId
     * @param {string} commentId
     * @returns {boolean}
     */
    deleteComment(nodeId, commentId) {
      const ms = useMissionStore()
      if (!ms.currentMission) return false
      const node = ms.currentMission.nodes.find(n => n.id === nodeId)
      if (!node || !node.comments) return false
      node.comments = node.comments.filter(c => c.id !== commentId && c.parentId !== commentId)
      ms.currentMission.updatedAt = new Date().toISOString()
      ms._saveMission()
      return true
    }
  }
})

/**
 * 从文本中提取 @提及的用户名
 * @param {string} text
 * @returns {string[]}
 */
function extractMentions(text) {
  if (!text) return []
  const matches = text.match(/@(\w+)/g)
  if (!matches) return []
  return matches.map(m => m.slice(1))
}
