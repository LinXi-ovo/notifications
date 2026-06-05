/**
 * 任务系统 — 预设场景数据
 *
 * 用于调试模式下一键加载预设任务，方便测试。
 * 每个预设是一个返回完整 Mission 对象的函数。
 *
 * 使用方式：
 * 1. 设置页开启调试模式
 * 2. 任务图页顶部显示 🧪 调试工具栏
 * 3. 点击预设按钮加载
 */

import { createRole, shortId } from '@/types/mission'

/** 生成短 ID */
function mid() { return `mission-${shortId()}` }
function nid() { return `node-${shortId()}` }
function eid() { return `edge-${shortId()}` }

/** 当前时间戳 */
function now() { return new Date().toISOString() }
function daysFromNow(d) { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString() }

// ──────────────────────────────────────────────
// 预设 1: 班级材料提交（来自 DESIGN 5.1）
// ──────────────────────────────────────────────

export function presetClassMaterialSubmission() {
  const roleMember = createRole('普通成员', '#3B82F6', '🟢', { type: 'free' })
  const roleMonitor = createRole('班长', '#F59E0B', '👨‍🎓', {
    type: 'approval', approverRole: 'leader'
  })
  const roleLeader = createRole('负责人', '#EF4444', '🔴', { type: 'delegated' })

  const node1 = {
    id: nid(), title: '填写个人信息表',
    description: '每位同学填写个人基本信息，包括姓名、学号、联系方式',
    content: '请按模板填写姓名、学号、学院、联系方式。',
    contentType: 'markdown',
    assignedRole: roleMember.id,
    status: 'in-progress', priority: 1, deadline: daysFromNow(7),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'count', completionTarget: 30,
    completions: [
      { userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} },
      { userId: 'lisi', userName: '李四', completedAt: now(), customValues: {} },
      { userId: 'wangwu', userName: '王五', completedAt: now(), customValues: {} }
    ],
    position: { x: 0, y: 0 },
    tags: ['个人信息'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '班长汇总',
    description: '班长收集本班所有成员的信息表，汇总为 Excel',
    content: '汇总本班成员信息，检查完整性后提交。',
    contentType: 'markdown',
    assignedRole: roleMonitor.id,
    status: 'blocked', priority: 2, deadline: daysFromNow(10),
    allowedOperators: [roleMonitor.id], allowedUsers: [],
    completionRule: 'count', completionTarget: 5,
    completions: [],
    position: { x: 0, y: 150 },
    tags: ['汇总'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node3 = {
    id: nid(), title: '提交汇总表',
    description: '将汇总后的材料提交给负责人审核',
    content: '班长将完整的汇总表提交至负责人处。',
    contentType: 'markdown',
    assignedRole: roleMonitor.id,
    status: 'todo', priority: 2, deadline: daysFromNow(12),
    allowedOperators: [roleMonitor.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: ['提交'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node4 = {
    id: nid(), title: '审核确认',
    description: '负责人审核提交的汇总材料',
    content: '检查材料完整性、准确性，通过后归档。',
    contentType: 'markdown',
    assignedRole: roleLeader.id,
    status: 'todo', priority: 3, deadline: daysFromNow(15),
    allowedOperators: [roleLeader.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 450 },
    tags: ['审核'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node5 = {
    id: nid(), title: '归档完成',
    description: '全部流程完成，材料归档',
    content: '',
    contentType: 'markdown',
    assignedRole: roleLeader.id,
    status: 'todo', priority: 3, deadline: daysFromNow(20),
    allowedOperators: [roleLeader.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 600 },
    tags: ['归档'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '📋 班级材料提交（测试预设）',
    description: '普通成员填写 → 班长汇总 → 负责人审核',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleMember, roleMonitor, roleLeader],
    nodes: [node1, node2, node3, node4, node5],
    edges: [
      { id: eid(), source: node1.id, target: node2.id, label: '需全员填写完' },
      { id: eid(), source: node2.id, target: node3.id, label: '汇总完成' },
      { id: eid(), source: node3.id, target: node4.id, label: '提交后审核' },
      { id: eid(), source: node4.id, target: node5.id, label: '审核通过' }
    ],
    assignments: [],
    customFields: [
      {
        id: 'cf-score', label: '综测分数', type: 'number',
        required: false, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: ['*'],
        order: 1, options: null
      },
      {
        id: 'cf-department', label: '学院', type: 'text',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: ['*'],
        order: 2, options: null
      }
    ],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试', '班级'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 2: 评奖评优（来自 DESIGN 5.2）
// ──────────────────────────────────────────────

export function presetEvaluation() {
  const roleExecutor = createRole('执行人', '#10B981', '🟢', { type: 'free' })
  const roleReviewer = createRole('审核员', '#3B82F6', '🔵', { type: 'free' })
  const roleApprover = createRole('审批人', '#8B5CF6', '🟣', { type: 'delegated' })

  const node1 = {
    id: nid(), title: '发布通知',
    description: '发布评奖评优通知，说明评选标准和流程',
    content: '2026 年秋季评奖评优工作现已启动...\n\n原始通知见 [[notif:notif-xyz123]]',
    contentType: 'markdown',
    assignedRole: roleExecutor.id,
    status: 'completed', priority: 1, deadline: daysFromNow(-3),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [{ userId: 'admin', userName: '管理员', completedAt: now(), customValues: {} }],
    position: { x: 0, y: 0 },
    tags: ['通知'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '材料收集',
    description: '收集申请人的各项证明材料',
    content: '收集成绩单、获奖证书、综测材料。',
    contentType: 'markdown',
    assignedRole: roleExecutor.id,
    status: 'in-progress', priority: 2, deadline: daysFromNow(5),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'count', completionTarget: 10,
    completions: [
      { userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} },
      { userId: 'lisi', userName: '李四', completedAt: now(), customValues: {} },
      { userId: 'wangwu', userName: '王五', completedAt: now(), customValues: {} }
    ],
    position: { x: 0, y: 150 },
    tags: ['材料'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node3 = {
    id: nid(), title: '综测评审',
    description: '对申请材料进行综测评分 (含子任务)',
    content: '执行人录入分数，审核员校验，审批人批准。',
    contentType: 'markdown',
    assignedRole: roleReviewer.id,
    status: 'todo', priority: 3, deadline: daysFromNow(10),
    allowedOperators: [roleExecutor.id, roleReviewer.id], allowedUsers: [],
    completionRule: 'all', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: ['评审'], attachments: [],
    customValues: { 'cf-score': null, 'cf-eligibility': null },
    comments: [],
    subMissionId: 'sub-eval-001',
    subMissionSummary: { done: 0, total: 3 },
    jumpLinks: []
  }

  const node4 = {
    id: nid(), title: '公示',
    description: '公示评选结果',
    content: '将评选结果公示 7 天，接受异议。',
    contentType: 'markdown',
    assignedRole: roleReviewer.id,
    status: 'todo', priority: 4, deadline: daysFromNow(17),
    allowedOperators: [roleReviewer.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 450 },
    tags: ['公示'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node5 = {
    id: nid(), title: '名单发布',
    description: '发布最终获奖名单',
    content: '审批通过名单见 [[node:' + node4.id + ']]',
    contentType: 'markdown',
    assignedRole: roleApprover.id,
    status: 'todo', priority: 5, deadline: daysFromNow(25),
    allowedOperators: [roleApprover.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 600 },
    tags: ['发布'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '🏆 秋季评奖评优（测试预设）',
    description: '发布通知 → 材料收集 → 综测评审 → 公示 → 名单发布',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleExecutor, roleReviewer, roleApprover],
    nodes: [node1, node2, node3, node4, node5],
    edges: [
      { id: eid(), source: node1.id, target: node2.id, label: '' },
      { id: eid(), source: node2.id, target: node3.id, label: '' },
      { id: eid(), source: node3.id, target: node4.id, label: '评审通过' },
      { id: eid(), source: node4.id, target: node5.id, label: '公示期满' }
    ],
    assignments: [],
    customFields: [
      {
        id: 'cf-score', label: '综测分数', type: 'number',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleExecutor.id],
        order: 1, options: null
      },
      {
        id: 'cf-eligibility', label: '是否符合资格', type: 'boolean',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: [roleApprover.id], editableByRoles: [],
        order: 2, options: null
      }
    ],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试', '评优'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 3: 审批流（简化版，来自 DESIGN 5.3）
// ──────────────────────────────────────────────

export function presetApprovalFlow() {
  const roleInitiator = createRole('发起人', '#3B82F6', '📝', { type: 'free' })
  const roleSupervisor = createRole('主管', '#F59E0B', '👨‍💼', {
    type: 'approval', approverRole: 'admin'
  })
  const roleFinance = createRole('财务', '#EF4444', '💰', { type: 'delegated' })
  const roleGM = createRole('总经理', '#8B5CF6', '👔', { type: 'delegated' })

  const node1 = {
    id: nid(), title: '提交采购申请',
    description: '填写采购申请表，说明采购物品、数量、预算',
    content: '申请采购办公设备一批，预算 ¥50,000。',
    contentType: 'markdown',
    assignedRole: roleInitiator.id,
    status: 'completed', priority: 1, deadline: daysFromNow(-2),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [{ userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} }],
    position: { x: 0, y: 0 },
    tags: ['申请'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '主管审批',
    description: '部门主管审批采购申请',
    content: '审批采购合理性。完成规则：任意 2 位主管批准即可。',
    contentType: 'markdown',
    assignedRole: roleSupervisor.id,
    status: 'in-progress', priority: 2, deadline: daysFromNow(3),
    allowedOperators: [roleSupervisor.id], allowedUsers: [],
    completionRule: 'count', completionTarget: 2,
    completions: [
      { userId: 'lisi', userName: '李四主管', completedAt: now(), customValues: {} }
    ],
    position: { x: 0, y: 150 },
    tags: ['审批'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node3 = {
    id: nid(), title: '财务审核',
    description: '财务部门审核预算和付款条件',
    content: '审核预算合规性、付款方式。',
    contentType: 'markdown',
    assignedRole: roleFinance.id,
    status: 'todo', priority: 3, deadline: daysFromNow(7),
    allowedOperators: [roleFinance.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: ['财务'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node4 = {
    id: nid(), title: '总经理批准',
    description: '总经理最终批准',
    content: '最终审批确认。',
    contentType: 'markdown',
    assignedRole: roleGM.id,
    status: 'todo', priority: 4, deadline: daysFromNow(10),
    allowedOperators: [roleGM.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 450 },
    tags: ['批准'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node5 = {
    id: nid(), title: '归档',
    description: '采购流程完成，文件归档',
    content: '',
    contentType: 'markdown',
    assignedRole: roleInitiator.id,
    status: 'todo', priority: 5, deadline: daysFromNow(15),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 600 },
    tags: ['归档'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '✅ 采购审批流（测试预设）',
    description: '发起 → 主管审批(需2人) → 财务审核 → 总经理批准 → 归档',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleInitiator, roleSupervisor, roleFinance, roleGM],
    nodes: [node1, node2, node3, node4, node5],
    edges: [
      { id: eid(), source: node1.id, target: node2.id, label: '' },
      { id: eid(), source: node2.id, target: node3.id, label: '' },
      { id: eid(), source: node3.id, target: node4.id, label: '' },
      { id: eid(), source: node4.id, target: node5.id, label: '' }
    ],
    assignments: [],
    customFields: [
      {
        id: 'cf-amount', label: '采购金额', type: 'number',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleInitiator.id],
        order: 1, options: null
      },
      {
        id: 'cf-supplier', label: '供应商', type: 'text',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleInitiator.id],
        order: 2, options: null
      }
    ],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试', '审批'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 4: 快速单人测试（单节点 single 模式）
// ──────────────────────────────────────────────

export function presetQuickSingle() {
  const role = createRole('执行人', '#10B981', '🟢', { type: 'free' })
  const node = {
    id: nid(), title: '快速测试节点（单人）',
    description: '这是一个单人完成模式的测试节点。点击即可标记完成。',
    content: '测试内容。',
    contentType: 'markdown',
    assignedRole: role.id,
    status: 'todo', priority: 1, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 0 },
    tags: ['测试'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '🧪 快速单人测试',
    description: '单节点 · single 模式 · 快速验证',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [role],
    nodes: [node],
    edges: [],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 5: 快速多人测试（count 模式 + 依赖）
// ──────────────────────────────────────────────

export function presetQuickCount() {
  const roleMember = createRole('成员', '#3B82F6', '🟢', { type: 'free' })
  const roleLeader = createRole('组长', '#F59E0B', '👤', { type: 'free' })

  const node1 = {
    id: nid(), title: '成员填写（需 3 人完成）',
    description: '累计 3 人完成即可进入下一阶段。',
    content: '',
    contentType: 'markdown',
    assignedRole: roleMember.id,
    status: 'in-progress', priority: 1, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'count', completionTarget: 3,
    completions: [
      { userId: 'user1', userName: '用户1', completedAt: now(), customValues: {} }
    ],
    position: { x: 0, y: 0 },
    tags: [], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '组长审核（单人）',
    description: '成员完成 3 人后，组长审核。',
    content: '',
    contentType: 'markdown',
    assignedRole: roleLeader.id,
    status: 'blocked', priority: 2, deadline: null,
    allowedOperators: [roleLeader.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 150 },
    tags: [], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node3 = {
    id: nid(), title: '归档完成',
    description: '',
    content: '',
    contentType: 'markdown',
    assignedRole: roleLeader.id,
    status: 'todo', priority: 3, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: [], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '🧪 快速多人测试',
    description: '2 节点 · count(3人)+single · 验证依赖阻塞',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleMember, roleLeader],
    nodes: [node1, node2, node3],
    edges: [
      { id: eid(), source: node1.id, target: node2.id, label: '需3人完成' },
      { id: eid(), source: node2.id, target: node3.id, label: '' }
    ],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 6: 权限模型演示 — 全部 4 种认领策略
// ──────────────────────────────────────────────

export function presetAllClaimTypes() {
  const roleFree = createRole('自由成员', '#10B981', '🟢', { type: 'free', maxAssignees: 10 })
  const roleApproval = createRole('需审批角色', '#F59E0B', '🟡', {
    type: 'approval', maxAssignees: 3, approverRole: 'admin'
  })
  const rolePassword = createRole('口令角色', '#8B5CF6', '🟣', {
    type: 'password', maxAssignees: 5, password: 'test123'
  })
  const roleDelegated = createRole('委派角色', '#EF4444', '🔴', {
    type: 'delegated', maxAssignees: 2
  })

  const node1 = {
    id: nid(), title: '自由认领节点',
    description: '任何人都可以自由认领并操作此节点',
    content: '此节点 assignedRole=自由成员，认领后即可操作。',
    contentType: 'markdown',
    assignedRole: roleFree.id,
    status: 'todo', priority: 1, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 0 },
    tags: ['自由'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '需审核节点',
    description: '需要先通过审批认领角色，才能操作此节点',
    content: '点击认领后 status=pending，管理员批准后才能操作。',
    contentType: 'markdown',
    assignedRole: roleApproval.id,
    status: 'todo', priority: 2, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 150 },
    tags: ['审核'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node3 = {
    id: nid(), title: '口令节点',
    description: '需要输入正确口令 (test123) 才能认领角色',
    content: '认领时需要输入口令。',
    contentType: 'markdown',
    assignedRole: rolePassword.id,
    status: 'todo', priority: 3, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: ['口令'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node4 = {
    id: nid(), title: '委派节点',
    description: '只能由管理员委派角色后才能操作',
    content: '无法自荐认领，必须在设置中由管理员委派。',
    contentType: 'markdown',
    assignedRole: roleDelegated.id,
    status: 'todo', priority: 4, deadline: null,
    allowedOperators: [roleDelegated.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 450 },
    tags: ['委派'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '🔐 认领策略演示（全部 4 种）',
    description: '自由 · 审批 · 口令 · 委派 — 4 种认领策略各一个节点',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleFree, roleApproval, rolePassword, roleDelegated],
    nodes: [node1, node2, node3, node4],
    edges: [],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试', '权限'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 7: 角色权限差异测试（不同角色不同转换）
// ──────────────────────────────────────────────

export function presetTransitionPermissions() {
  const roleExecutor = createRole('执行人', '#10B981', '🟢', { type: 'free', maxAssignees: 3 })
  const roleReviewer = createRole('审核员', '#3B82F6', '🔵', { type: 'free', maxAssignees: 2 })
  const roleApprover = createRole('审批人', '#8B5CF6', '🟣', { type: 'free', maxAssignees: 1 })
  const roleObserver = createRole('观察员', '#9CA3AF', '⚪', { type: 'free', maxAssignees: 5 })

  const node = {
    id: nid(), title: '权限测试节点',
    description: '不同角色对此节点有不同的状态转换权限',
    content: '执行人: todo→进行中→完成 | 审核员: 进行中→完成 | 审批人: 无转换 | 观察员: 无',
    contentType: 'markdown',
    assignedRole: roleExecutor.id,
    status: 'todo', priority: 1, deadline: null,
    allowedOperators: [roleExecutor.id, roleReviewer.id, roleApprover.id, roleObserver.id],
    allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 0 },
    tags: ['权限测试'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  // 审批完成节点（仅审批人可操作）
  const node2 = {
    id: nid(), title: '终审节点',
    description: '仅审批人和管理员可操作',
    content: '审批人可以批准通过。观察员只能查看。',
    contentType: 'markdown',
    assignedRole: roleApprover.id,
    status: 'todo', priority: 2, deadline: null,
    allowedOperators: [roleApprover.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 150 },
    tags: ['终审'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '🎭 角色权限差异测试（4 种角色）',
    description: '执行人/审核员/审批人/观察员 — 各有不同的 transitions',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleExecutor, roleReviewer, roleApprover, roleObserver],
    nodes: [node, node2],
    edges: [{ id: eid(), source: node.id, target: node2.id, label: '通过后终审' }],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],  // 使用 DEFAULT_PERMISSIONS 自动匹配
    jumpLinks: [],
    tags: ['测试', '权限'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 8: 完整班级提交（带完整的 permissions）
// ──────────────────────────────────────────────

export function presetFullPermissionsFlow() {
  const roleMember = createRole('普通成员', '#3B82F6', '🟢', { type: 'free', maxAssignees: 30 })
  const roleMonitor = createRole('班长', '#F59E0B', '👨‍🎓', {
    type: 'approval', maxAssignees: 5, approverRole: 'admin'
  })
  const roleLeader = createRole('负责人', '#EF4444', '🔴', { type: 'delegated', maxAssignees: 1 })

  const nFill = {
    id: nid(), title: '填写信息表',
    description: '每位同学填写个人信息',
    content: '请按模板填写姓名、学号、学院。',
    contentType: 'markdown',
    assignedRole: roleMember.id,
    status: 'in-progress', priority: 1, deadline: daysFromNow(7),
    allowedOperators: [], allowedUsers: [],
    completionRule: 'count', completionTarget: 30,
    completions: [
      { userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} },
      { userId: 'lisi', userName: '李四', completedAt: now(), customValues: {} }
    ],
    position: { x: 0, y: 0 },
    tags: ['填写'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const nCollect = {
    id: nid(), title: '班长汇总',
    description: '收集本班所有信息表',
    content: '汇总后提交给负责人。',
    contentType: 'markdown',
    assignedRole: roleMonitor.id,
    status: 'blocked', priority: 2, deadline: daysFromNow(10),
    allowedOperators: [roleMonitor.id], allowedUsers: [],
    completionRule: 'count', completionTarget: 5,
    completions: [],
    position: { x: 0, y: 150 },
    tags: ['汇总'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const nSubmit = {
    id: nid(), title: '提交审核',
    description: '提交汇总材料给负责人',
    content: '',
    contentType: 'markdown',
    assignedRole: roleMonitor.id,
    status: 'todo', priority: 3, deadline: daysFromNow(12),
    allowedOperators: [roleMonitor.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 300 },
    tags: ['提交'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const nReview = {
    id: nid(), title: '负责人审核',
    description: '负责人审核汇总材料',
    content: '检查完整性后通过。',
    contentType: 'markdown',
    assignedRole: roleLeader.id,
    status: 'todo', priority: 4, deadline: daysFromNow(15),
    allowedOperators: [roleLeader.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 450 },
    tags: ['审核'], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '📋 权限完整版·班级提交',
    description: '带完整 permissions 配置的班级材料提交流程',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleMember, roleMonitor, roleLeader],
    nodes: [nFill, nCollect, nSubmit, nReview],
    edges: [
      { id: eid(), source: nFill.id, target: nCollect.id, label: '30人填完' },
      { id: eid(), source: nCollect.id, target: nSubmit.id, label: '汇总完成' },
      { id: eid(), source: nSubmit.id, target: nReview.id, label: '提交审核' }
    ],
    assignments: [],
    customFields: [
      {
        id: 'cf-score', label: '综测分数', type: 'number',
        required: false, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleMember.id],
        order: 1, options: null
      },
      {
        id: 'cf-review', label: '审核意见', type: 'text',
        required: false, defaultValue: null, appliesToRole: null,
        visibleToRoles: [roleMonitor.id, roleLeader.id], editableByRoles: [roleLeader.id],
        order: 2, options: null
      }
    ],
    reminders: [],
    permissions: [
      {
        roleId: roleMember.id,
        transitions: [
          { from: 'todo', to: 'in-progress', label: '开始填写' },
          { from: 'in-progress', to: 'completed', label: '提交完成' }
        ],
        canComment: true,
        canEditContent: false,
        canViewFields: ['*'],
        canEditFields: ['cf-score']
      },
      {
        roleId: roleMonitor.id,
        transitions: [
          { from: 'blocked', to: 'in-progress', label: '开始汇总' },
          { from: 'in-progress', to: 'completed', label: '汇总完成' },
          { from: 'todo', to: 'in-progress', label: '提交' }
        ],
        canComment: true,
        canEditContent: true,
        canViewFields: ['*'],
        canEditFields: ['*']
      },
      {
        roleId: roleLeader.id,
        transitions: [
          { from: 'todo', to: 'in-progress', label: '开始审核' },
          { from: 'in-progress', to: 'completed', label: '审核通过' },
          { from: 'completed', to: 'todo', label: '退回' }
        ],
        canComment: true,
        canEditContent: false,
        canViewFields: ['*'],
        canEditFields: []
      }
    ],
    jumpLinks: [],
    tags: ['测试', '权限'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 9: 字段可见性测试
// ──────────────────────────────────────────────

export function presetFieldVisibility() {
  const roleExecutor = createRole('执行人', '#10B981', '🟢', { type: 'free', maxAssignees: 3 })
  const roleReviewer = createRole('审核员', '#3B82F6', '🔵', { type: 'free', maxAssignees: 2 })
  const roleApprover = createRole('审批人', '#8B5CF6', '🟣', { type: 'free', maxAssignees: 1 })

  const node = {
    id: nid(), title: '字段可见性测试',
    description: '不同角色看到不同的自定义字段',
    content: '执行人: 全部可编 → 审核员: 全部可见、部分可编 → 审批人: 全部只读',
    contentType: 'markdown',
    assignedRole: roleExecutor.id,
    status: 'in-progress', priority: 1, deadline: null,
    allowedOperators: [roleExecutor.id, roleReviewer.id, roleApprover.id],
    allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 0 },
    tags: ['字段测试'], attachments: [],
    customValues: { 'cf-name': '张三', 'cf-score': 95, 'cf-comment': '优秀' },
    comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '👁️ 字段可见性测试',
    description: '不同角色对同一字段有 hidden/readonly/editable 三种权限',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleExecutor, roleReviewer, roleApprover],
    nodes: [node],
    edges: [],
    assignments: [],
    customFields: [
      {
        id: 'cf-name', label: '姓名', type: 'text',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleExecutor.id],
        order: 1, options: null
      },
      {
        id: 'cf-score', label: '综测分数', type: 'number',
        required: true, defaultValue: null, appliesToRole: null,
        visibleToRoles: ['*'], editableByRoles: [roleExecutor.id, roleReviewer.id],
        order: 2, options: null
      },
      {
        id: 'cf-comment', label: '审批意见', type: 'textarea',
        required: false, defaultValue: null, appliesToRole: null,
        visibleToRoles: [roleReviewer.id, roleApprover.id], editableByRoles: [],
        order: 3, options: null
      }
    ],
    reminders: [],
    permissions: [
      {
        roleId: roleExecutor.id,
        transitions: [{ from: 'in-progress', to: 'completed', label: '提交' }],
        canComment: true, canEditContent: true,
        canViewFields: ['*'], canEditFields: ['cf-name', 'cf-score']
      },
      {
        roleId: roleReviewer.id,
        transitions: [{ from: 'in-progress', to: 'completed', label: '审核通过' }],
        canComment: true, canEditContent: false,
        canViewFields: ['*'], canEditFields: ['cf-score']
      },
      {
        roleId: roleApprover.id,
        transitions: [{ from: 'in-progress', to: 'completed', label: '批准' }],
        canComment: true, canEditContent: false,
        canViewFields: ['*'], canEditFields: []
      }
    ],
    jumpLinks: [],
    tags: ['测试', '字段'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 预设 10: 待审批测试（含待审批的 assignments）
// ──────────────────────────────────────────────

export function presetPendingApprovals() {
  const roleMember = createRole('普通成员', '#3B82F6', '🟢', { type: 'free', maxAssignees: 10 })
  const roleSupervisor = createRole('主管', '#F59E0B', '👨‍💼', {
    type: 'approval', maxAssignees: 3, approverRole: 'admin'
  })

  const node1 = {
    id: nid(), title: '成员任务',
    description: '普通成员操作',
    content: '',
    contentType: 'markdown',
    assignedRole: roleMember.id,
    status: 'in-progress', priority: 1, deadline: null,
    allowedOperators: [], allowedUsers: [],
    completionRule: 'count', completionTarget: 3,
    completions: [{ userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} }],
    position: { x: 0, y: 0 },
    tags: [], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  const node2 = {
    id: nid(), title: '主管任务（需审批）',
    description: '审批认领角色后才能操作',
    content: '',
    contentType: 'markdown',
    assignedRole: roleSupervisor.id,
    status: 'todo', priority: 2, deadline: null,
    allowedOperators: [roleSupervisor.id], allowedUsers: [],
    completionRule: 'single', completionTarget: 1,
    completions: [],
    position: { x: 0, y: 150 },
    tags: [], attachments: [],
    customValues: {}, comments: [],
    subMissionId: null, subMissionSummary: null, jumpLinks: []
  }

  return {
    id: mid(),
    title: '⏳ 待审批测试（预置申请）',
    description: '已有 2 个用户申请了主管角色，待管理员审批',
    createdBy: 'preset',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: [roleMember, roleSupervisor],
    nodes: [node1, node2],
    edges: [{ id: eid(), source: node1.id, target: node2.id, label: '完成后' }],
    assignments: [
      {
        roleId: roleSupervisor.id,
        userId: 'zhangsan',
        assignedAt: now(),
        status: 'pending'
      },
      {
        roleId: roleSupervisor.id,
        userId: 'lisi',
        assignedAt: now(),
        status: 'pending'
      }
    ],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['测试', '审批'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ──────────────────────────────────────────────
// 所有预设列表（按类别分组）
// ──────────────────────────────────────────────

export const ALL_PRESETS = [
  // ── 任务流预设 ──
  { name: '📋 班级材料提交', description: '5 节点 · 3 角色 · count 完成模式', fn: presetClassMaterialSubmission, category: 'flow' },
  { name: '🏆 评奖评优', description: '5 节点 · 3 角色 · 含子图标记', fn: presetEvaluation, category: 'flow' },
  { name: '✅ 采购审批流', description: '5 节点 · 4 角色 · 并行审批', fn: presetApprovalFlow, category: 'flow' },
  { name: '📋 权限完整版·班级提交', description: '4 节点 · 完整 permissions 配置', fn: presetFullPermissionsFlow, category: 'flow' },
  { name: '🧪 单人测试', description: '1 节点 · single · 快速验证', fn: presetQuickSingle, category: 'flow' },
  { name: '🧪 多人测试', description: '3 节点 · count+single · 依赖测试', fn: presetQuickCount, category: 'flow' },
  // ── 权限模型预设 ──
  { name: '🔐 全部 4 种认领策略', description: 'free + approval + password + delegated', fn: presetAllClaimTypes, category: 'perm' },
  { name: '🎭 角色权限差异', description: '4 角色不同 transitions 测试', fn: presetTransitionPermissions, category: 'perm' },
  { name: '👁️ 字段可见性', description: 'hidden / readonly / editable 三层', fn: presetFieldVisibility, category: 'perm' },
  { name: '⏳ 待审批测试', description: '预置 2 个待审批申请', fn: presetPendingApprovals, category: 'perm' }
]
