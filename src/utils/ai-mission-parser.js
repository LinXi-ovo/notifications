/**
 * AI 任务生成解析器
 *
 * 将 AI 按照 doc/skills/任务生成助手.md 格式输出的 JSON
 * 解析为完整的 Mission 对象，供 store 导入。
 *
 * 使用流程：
 *   1. AI 根据通知内容生成 JSON（遵循 skill 规范）
 *   2. 用户将 JSON 粘贴到"AI 导入"对话框
 *   3. parseAiMission(json) → Mission 对象
 *   4. store.importMission(mission) → 写入 localStorage
 */

import { createRole, shortId } from '@/types/mission'

/** 解析 AI 输出的 JSON 字符串为 Mission 对象 */
export function parseAiMission(jsonStr) {
  let data
  try {
    data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
  } catch (e) {
    throw new Error('JSON 解析失败: ' + e.message)
  }

  // 校验必填字段
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('缺少必填字段: title')
  }
  if (!Array.isArray(data.roles)) {
    throw new Error('缺少必填字段: roles（必须是数组）')
  }
  if (!Array.isArray(data.nodes)) {
    throw new Error('缺少必填字段: nodes（必须是数组）')
  }

  // ── 构建 Roles ──
  const roleMap = {}  // name → Role 对象
  const roles = data.roles.map((r, i) => {
    // claimPolicy 支持两种格式：
    //   字符串: "free" | "approval" | "password" | "delegated"
    //   对象:   { type: "password", password: "abc123" }
    let claimPolicy
    if (typeof r.claimPolicy === 'object' && r.claimPolicy !== null) {
      claimPolicy = { ...r.claimPolicy }
    } else {
      claimPolicy = { type: r.claimPolicy || 'free' }
    }

    const role = createRole(
      r.name || `角色${i + 1}`,
      r.color || defaultColor(i),
      r.emoji || defaultEmoji(i),
      claimPolicy
    )

    // 支持 maxAssignees（可选，默认 999）
    if (typeof r.maxAssignees === 'number') {
      role.maxAssignees = r.maxAssignees
    }

    roleMap[role.name] = role
    return role
  })

  if (!roles.length) {
    throw new Error('至少需要一个角色')
  }

  // ── 构建 Nodes ──
  const nodeMap = {}   // title → TaskNode 对象
  const nodes = data.nodes.map((n, i) => {
    // 查找角色
    const targetRole = roles.find(r => r.name === n.assignedRole)
    if (!targetRole) {
      throw new Error(`节点 "${n.title}" 引用了不存在的角色 "${n.assignedRole}"`)
    }

    const node = {
      id: `node-${shortId()}`,
      title: n.title || `节点${i + 1}`,
      description: n.description || '',
      content: n.content || '',
      contentType: 'markdown',
      assignedRole: targetRole.id,
      status: 'todo',
      priority: n.priority || 1,
      deadline: n.deadline || null,
      allowedOperators: [],
      allowedUsers: [],
      completionRule: n.completionRule || 'single',
      completionTarget: n.completionRule === 'count' ? (n.completionTarget || 10) : 1,
      completions: [],
      position: { x: 0, y: i * 150 },
      tags: n.tags || [],
      attachments: [],
      customValues: {},
      comments: [],
      subMissionId: null,
      subMissionSummary: null,
      jumpLinks: []
    }

    nodeMap[node.title] = node
    return node
  })

  // ── 构建 Edges（从 dependsOn 解析） ──
  const edges = []
  data.nodes.forEach((n) => {
    if (n.dependsOn && Array.isArray(n.dependsOn)) {
      n.dependsOn.forEach(depTitle => {
        const targetNode = nodeMap[n.title]
        const sourceNode = nodeMap[depTitle]
        if (!sourceNode) {
          // dependsOn 引用了不存在的节点，但先不报错，只跳过并警告
          console.warn(`节点 "${n.title}" 的 dependsOn 引用了不存在的节点 "${depTitle}"，已跳过`)
          return
        }
        edges.push({
          id: `edge-${shortId()}`,
          source: sourceNode.id,
          target: targetNode.id,
          label: ''
        })
      })
    }
  })

  // ── 构建 Mission ──
  const now = new Date().toISOString()
  const mission = {
    id: `mission-${shortId()}`,
    title: data.title,
    description: data.description || '',
    createdBy: 'ai-generator',
    createdAt: now,
    updatedAt: now,
    status: 'active',
    roles,
    nodes,
    edges,
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: data.tags || ['AI'],
    version: '3.0',
    exportMeta: {
      exportedAt: null,
      includesSubMissions: false,
      includesComments: false
    }
  }

  return mission
}

// ── 默认颜色/图标 ──
const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']
const EMOJIS = ['🟢', '🟡', '🔵', '🔴', '🟣', '🩷']

function defaultColor(i) { return COLORS[i % COLORS.length] }
function defaultEmoji(i) { return EMOJIS[i % EMOJIS.length] }
