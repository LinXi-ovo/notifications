/**
 * 任务系统 — 数据模型定义
 *
 * 所有类型以 JSDoc 注释定义，供 IDE 智能提示使用。
 * 运行时结构由 Pinia store 维护。
 */

/**
 * @typedef {'active' | 'archived'} MissionStatus
 */

/**
 * @typedef {Object} ExportMeta
 * @property {string|null} exportedAt
 * @property {boolean} includesSubMissions
 * @property {boolean} includesComments
 */

/**
 * @typedef {Object} Mission — 任务/项目容器
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {MissionStatus} status
 * @property {Role[]} roles
 * @property {TaskNode[]} nodes
 * @property {Edge[]} edges
 * @property {Assignment[]} assignments
 * @property {CustomField[]} customFields
 * @property {Reminder[]} reminders
 * @property {Permission[]} permissions
 * @property {JumpLink[]} jumpLinks
 * @property {string[]} tags
 * @property {string} version
 * @property {ExportMeta} exportMeta
 */

/**
 * @typedef {'todo' | 'in-progress' | 'completed' | 'blocked' | 'cancelled'} TaskStatus
 */

/**
 * @typedef {'single' | 'count' | 'all'} CompletionRule
 */

/**
 * @typedef {Object} CompletionRecord — 完成记录
 * @property {string} userId
 * @property {string} userName
 * @property {string} completedAt
 * @property {string} [comment]
 * @property {Object.<string, *>} [customValues]
 */

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Attachment
 * @property {string} name
 * @property {string} url
 * @property {string} mime
 */

/**
 * @typedef {Object} SubMissionSummary
 * @property {number} done
 * @property {number} total
 */

/**
 * @typedef {Object} TaskNode — 任务节点
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} content
 * @property {string} contentType
 * @property {string} assignedRole
 * @property {TaskStatus} status
 * @property {number} priority
 * @property {string|null} deadline
 * @property {string[]} allowedOperators
 * @property {string[]} allowedUsers
 * @property {CompletionRule} completionRule
 * @property {number} completionTarget
 * @property {CompletionRecord[]} completions
 * @property {Position} position
 * @property {string[]} tags
 * @property {Attachment[]} attachments
 * @property {Object.<string, *>} customValues
 * @property {import('./types').Comment[]} comments
 * @property {string|null} subMissionId
 * @property {SubMissionSummary|null} subMissionSummary
 * @property {JumpLink[]} jumpLinks
 */

/**
 * @typedef {Object} Edge — 依赖边
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string} [label]
 */

/**
 * @typedef {'free' | 'approval' | 'password' | 'delegated'} ClaimType
 */

/**
 * @typedef {Object} ClaimPolicy — 认领策略
 * @property {ClaimType} type
 * @property {string} [approverRole]
 * @property {string|null} [password]
 */

/**
 * @typedef {Object} Role — 角色
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} color
 * @property {string} emoji
 * @property {number} maxAssignees
 * @property {ClaimPolicy} claimPolicy
 */

/**
 * @typedef {'pending' | 'approved' | 'rejected'} AssignmentStatus
 */

/**
 * @typedef {Object} Assignment — 角色认领
 * @property {string} roleId
 * @property {string} userId
 * @property {string} assignedAt
 * @property {AssignmentStatus} status
 * @property {string} [approvedBy]
 * @property {string} [approvedAt]
 */

/**
 * @typedef {'text' | 'textarea' | 'number' | 'date' | 'select' | 'multi-select' | 'user' | 'boolean' | 'url' | 'file'} FieldType
 */

/**
 * @typedef {Object} CustomField — 自定义字段 Schema
 * @property {string} id
 * @property {string} label
 * @property {FieldType} type
 * @property {boolean} required
 * @property {*} defaultValue
 * @property {string|null} appliesToRole
 * @property {string[]} visibleToRoles
 * @property {string[]} editableByRoles
 * @property {number} order
 * @property {string[]|null} options
 */

/**
 * @typedef {'node' | 'mission' | 'notification'} JumpLinkType
 */

/**
 * @typedef {Object} JumpLink — 跳转链接
 * @property {JumpLinkType} type
 * @property {string} targetId
 * @property {string} [targetMissionId]
 * @property {string} label
 */

/**
 * @typedef {Object} Comment — 评论
 * @property {string} id
 * @property {string} nodeId
 * @property {string} author
 * @property {string} content
 * @property {string[]} mentions
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} parentId
 * @property {Attachment[]} attachments
 */

/**
 * @typedef {'deadline' | 'idle' | 'status-check' | 'mention'} ReminderType
 */

/**
 * @typedef {Object} ReminderTrigger
 * @property {string} [condition]
 * @property {number} [offset]
 * @property {string} [targetStatus]
 * @property {number} [idleDays]
 * @property {string} [sourceNodeId]
 * @property {string} [sourceCommentId]
 */

/**
 * @typedef {Object} ReminderAction
 * @property {'in-app' | 'email'} method
 * @property {string} message
 * @property {string} [targetRole]
 * @property {string} [targetUser]
 */

/**
 * @typedef {Object} Reminder — 催促提醒规则
 * @property {string} id
 * @property {string} missionId
 * @property {ReminderType} type
 * @property {ReminderTrigger} trigger
 * @property {ReminderAction} action
 * @property {boolean} enabled
 */

/**
 * @typedef {Object} Transition — 状态转换许可
 * @property {TaskStatus} from
 * @property {TaskStatus} to
 * @property {string} label
 */

/**
 * @typedef {Object} Permission — 角色级权限
 * @property {string} roleId
 * @property {Transition[]} transitions
 * @property {boolean} canComment
 * @property {boolean} canEditContent
 * @property {string[]} canViewFields
 * @property {string[]} canEditFields
 */

/**
 * @typedef {'auto' | 'all' | 'manual'} AggregationRule
 */

/**
 * @typedef {Object} SubMission — 嵌套子 DAG
 * @property {string} id
 * @property {string} title
 * @property {string} parentNodeId
 * @property {string} parentMissionId
 * @property {boolean} inheritRoles
 * @property {TaskNode[]} nodes
 * @property {Edge[]} edges
 * @property {Role[]} [roles]
 * @property {AggregationRule} aggregationRule
 */

/** 默认权限（角色级） */
export const DEFAULT_PERMISSIONS = {
  executor: {
    transitions: [
      { from: 'todo', to: 'in-progress', label: '开始执行' },
      { from: 'in-progress', to: 'completed', label: '标记完成' },
      { from: 'blocked', to: 'in-progress', label: '解除阻塞' }
    ],
    canComment: true,
    canEditContent: true,
    canViewFields: ['*'],
    canEditFields: ['*']
  },
  reviewer: {
    transitions: [
      { from: 'in-progress', to: 'completed', label: '审核通过' },
      { from: 'completed', to: 'completed', label: '已验证' }
    ],
    canComment: true,
    canEditContent: false,
    canViewFields: ['*'],
    canEditFields: []
  },
  approver: {
    transitions: [
      { from: 'completed', to: 'completed', label: '批准' }
    ],
    canComment: true,
    canEditContent: false,
    canViewFields: ['*'],
    canEditFields: []
  },
  admin: {
    transitions: [
      { from: 'todo', to: 'in-progress', label: '开始' },
      { from: 'in-progress', to: 'completed', label: '完成' },
      { from: 'completed', to: 'todo', label: '回退' },
      { from: 'blocked', to: 'todo', label: '解除阻塞' },
      { from: 'cancelled', to: 'todo', label: '恢复' }
    ],
    canComment: true,
    canEditContent: true,
    canViewFields: ['*'],
    canEditFields: ['*']
  },
  observer: {
    transitions: [],
    canComment: true,
    canEditContent: false,
    canViewFields: ['*'],
    canEditFields: []
  }
}

/** 生成短 ID（8 位） */
export function shortId() {
  return Math.random().toString(36).substring(2, 10)
}

/** 创建空 Mission */
export function createMission(title, createdBy) {
  const now = new Date().toISOString()
  return {
    id: `mission-${shortId()}`,
    title,
    description: '',
    createdBy,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    roles: [],
    nodes: [],
    edges: [],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: [],
    version: '3.0',
    exportMeta: {
      exportedAt: null,
      includesSubMissions: false,
      includesComments: false
    }
  }
}

/** 创建空 TaskNode */
export function createTaskNode(title, assignedRole, opts = {}) {
  return {
    id: `node-${shortId()}`,
    title,
    description: '',
    content: '',
    contentType: 'markdown',
    assignedRole,
    status: 'todo',
    priority: 0,
    deadline: null,
    allowedOperators: [],
    allowedUsers: [],
    completionRule: opts.completionRule || 'single',
    completionTarget: opts.completionTarget || 1,
    completions: [],
    position: opts.position || { x: 0, y: 0 },
    tags: [],
    attachments: [],
    customValues: {},
    comments: [],
    subMissionId: null,
    subMissionSummary: null,
    jumpLinks: []
  }
}

/** 创建空 Edge */
export function createEdge(source, target, label = '') {
  return {
    id: `edge-${shortId()}`,
    source,
    target,
    label
  }
}

/** 创建空 Role */
export function createRole(name, color, emoji, claimPolicy = { type: 'free' }) {
  return {
    id: `role-${shortId()}`,
    name,
    description: '',
    color,
    emoji,
    maxAssignees: 999,
    claimPolicy
  }
}
