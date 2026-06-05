#!/usr/bin/env node
/**
 * 任务系统 — 快速创建测试任务脚本
 *
 * 像 MCP 工具一样：输入参数 → 生成完整任务数据 → 输出 JSON 文件
 * 生成的 JSON 可通过应用 "导入 JSON" 按钮加载。
 *
 * 用法:
 *   node dev_tools/create-test-mission.cjs --preset class        # 预设：班级材料提交
 *   node dev_tools/create-test-mission.cjs --preset eval         # 预设：评奖评优
 *   node dev_tools/create-test-mission.cjs --preset approval     # 预设：采购审批流
 *   node dev_tools/create-test-mission.cjs --list                # 列出预设
 *
 * 自定义任务:
 *   node dev_tools/create-test-mission.cjs \
 *     --title "我的自定义任务" \
 *     --roles "成员:free,班长:free" \
 *     --nodes "填写信息表:成员:count:30,班长汇总:班长:single:1" \
 *     --edges "填写信息表->班长汇总"
 *     --output ./data/missions/custom.json
 *
 * 参数:
 *   --preset, -p <name>    使用预设 (class|eval|approval|single|count)
 *   --title, -t <text>     任务标题
 *   --roles, -r <spec>     角色定义：逗号分隔，格式 "名称:策略" (策略=free|approval|password|delegated)
 *   --nodes, -n <spec>     节点定义：逗号分隔，格式 "标题:角色:规则:目标数"
 *   --edges, -e <spec>     边定义：箭头格式 "源节点->目标节点"
 *   --output, -o <path>    输出路径 (默认: 打印到 stdout)
 *   --list, -l             列出可用预设
 *   --help, -h             显示帮助
 *
 * 示例:
 *   # 用预设创建并保存到文件
 *   node dev_tools/create-test-mission.cjs --preset class -o data/missions/class-test.json
 *
 *   # 导入到应用 (需在项目目录运行 dev server)
 *   # 然后把 data/missions/class-test.json 拖到应用导入框
 */

const fs = require('fs')
const path = require('path')

// ── 工具函数 ──

function shortId() {
  return Math.random().toString(36).substring(2, 10)
}

function now() {
  return new Date().toISOString()
}

function daysFromNow(d) {
  const dt = new Date()
  dt.setDate(dt.getDate() + d)
  return dt.toISOString()
}

// ── 预设 ──

const PRESETS = {
  class: {
    title: '📋 班级材料提交',
    description: '5 节点 · 3 角色 · count 完成模式',
    build: () => buildClassPreset()
  },
  eval: {
    title: '🏆 秋季评奖评优',
    description: '5 节点 · 3 角色 · 含子图标记',
    build: () => buildEvalPreset()
  },
  approval: {
    title: '✅ 采购审批流',
    description: '5 节点 · 4 角色 · 并行审批',
    build: () => buildApprovalPreset()
  },
  single: {
    title: '🧪 快速单人测试',
    description: '1 节点 · single 模式',
    build: () => buildSinglePreset()
  },
  count: {
    title: '🧪 快速多人测试',
    description: '3 节点 · count+single · 依赖测试',
    build: () => buildCountPreset()
  }
}

// ── 预设构建函数 ──

function buildClassPreset() {
  const roles = [
    { id: `role-${shortId()}`, name: '普通成员', color: '#3B82F6', emoji: '🟢', maxAssignees: 999, claimPolicy: { type: 'free' } },
    { id: `role-${shortId()}`, name: '班长', color: '#F59E0B', emoji: '👨‍🎓', maxAssignees: 5, claimPolicy: { type: 'approval', approverRole: 'leader' } },
    { id: `role-${shortId()}`, name: '负责人', color: '#EF4444', emoji: '🔴', maxAssignees: 1, claimPolicy: { type: 'delegated' } }
  ]

  const nodes = [
    { id: `node-${shortId()}`, title: '填写个人信息表', description: '每位同学填写个人基本信息', content: '', contentType: 'markdown', assignedRole: roles[0].id, status: 'in-progress', priority: 1, deadline: daysFromNow(7), allowedOperators: [], allowedUsers: [], completionRule: 'count', completionTarget: 30, completions: [], position: { x: 0, y: 0 }, tags: ['个人信息'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '班长汇总', description: '班长收集本班所有成员的信息表', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'blocked', priority: 2, deadline: daysFromNow(10), allowedOperators: [roles[1].id], allowedUsers: [], completionRule: 'count', completionTarget: 5, completions: [], position: { x: 0, y: 150 }, tags: ['汇总'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '提交汇总表', description: '将汇总后的材料提交给负责人审核', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'todo', priority: 2, deadline: daysFromNow(12), allowedOperators: [roles[1].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 300 }, tags: ['提交'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '审核确认', description: '负责人审核提交的汇总材料', content: '', contentType: 'markdown', assignedRole: roles[2].id, status: 'todo', priority: 3, deadline: daysFromNow(15), allowedOperators: [roles[2].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 450 }, tags: ['审核'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '归档完成', description: '全部流程完成', content: '', contentType: 'markdown', assignedRole: roles[2].id, status: 'todo', priority: 3, deadline: daysFromNow(20), allowedOperators: [roles[2].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 600 }, tags: ['归档'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] }
  ]

  return { roles, nodes, edges: [
    { id: `edge-${shortId()}`, source: nodes[0].id, target: nodes[1].id, label: '需全员填写完' },
    { id: `edge-${shortId()}`, source: nodes[1].id, target: nodes[2].id, label: '汇总完成' },
    { id: `edge-${shortId()}`, source: nodes[2].id, target: nodes[3].id, label: '提交后审核' },
    { id: `edge-${shortId()}`, source: nodes[3].id, target: nodes[4].id, label: '审核通过' }
  ] }
}

function buildEvalPreset() {
  const roles = [
    { id: `role-${shortId()}`, name: '执行人', color: '#10B981', emoji: '🟢', maxAssignees: 999, claimPolicy: { type: 'free' } },
    { id: `role-${shortId()}`, name: '审核员', color: '#3B82F6', emoji: '🔵', maxAssignees: 999, claimPolicy: { type: 'free' } },
    { id: `role-${shortId()}`, name: '审批人', color: '#8B5CF6', emoji: '🟣', maxAssignees: 1, claimPolicy: { type: 'delegated' } }
  ]

  const nodes = [
    { id: `node-${shortId()}`, title: '发布通知', description: '发布评奖评优通知', content: '原始通知见 [[notif:notif-xyz123]]', contentType: 'markdown', assignedRole: roles[0].id, status: 'completed', priority: 1, deadline: daysFromNow(-3), allowedOperators: [], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [{ userId: 'admin', userName: '管理员', completedAt: now(), customValues: {} }], position: { x: 0, y: 0 }, tags: ['通知'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '材料收集', description: '收集申请人的各项证明材料', content: '', contentType: 'markdown', assignedRole: roles[0].id, status: 'in-progress', priority: 2, deadline: daysFromNow(5), allowedOperators: [], allowedUsers: [], completionRule: 'count', completionTarget: 10, completions: [], position: { x: 0, y: 150 }, tags: ['材料'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '综测评审', description: '对申请材料进行综测评分', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'todo', priority: 3, deadline: daysFromNow(10), allowedOperators: [roles[0].id, roles[1].id], allowedUsers: [], completionRule: 'all', completionTarget: 1, completions: [], position: { x: 0, y: 300 }, tags: ['评审'], attachments: [], customValues: { 'cf-score': null, 'cf-eligibility': null }, comments: [], subMissionId: 'sub-eval-001', subMissionSummary: { done: 0, total: 3 }, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '公示', description: '公示评选结果 7 天', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'todo', priority: 4, deadline: daysFromNow(17), allowedOperators: [roles[1].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 450 }, tags: ['公示'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '名单发布', description: '发布最终获奖名单', content: '', contentType: 'markdown', assignedRole: roles[2].id, status: 'todo', priority: 5, deadline: daysFromNow(25), allowedOperators: [roles[2].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 600 }, tags: ['发布'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] }
  ]

  return { roles, nodes, edges: [
    { id: `edge-${shortId()}`, source: nodes[0].id, target: nodes[1].id, label: '' },
    { id: `edge-${shortId()}`, source: nodes[1].id, target: nodes[2].id, label: '' },
    { id: `edge-${shortId()}`, source: nodes[2].id, target: nodes[3].id, label: '评审通过' },
    { id: `edge-${shortId()}`, source: nodes[3].id, target: nodes[4].id, label: '公示期满' }
  ] }
}

function buildApprovalPreset() {
  const roles = [
    { id: `role-${shortId()}`, name: '发起人', color: '#3B82F6', emoji: '📝', maxAssignees: 999, claimPolicy: { type: 'free' } },
    { id: `role-${shortId()}`, name: '主管', color: '#F59E0B', emoji: '👨‍💼', maxAssignees: 3, claimPolicy: { type: 'approval', approverRole: 'admin' } },
    { id: `role-${shortId()}`, name: '财务', color: '#EF4444', emoji: '💰', maxAssignees: 1, claimPolicy: { type: 'delegated' } },
    { id: `role-${shortId()}`, name: '总经理', color: '#8B5CF6', emoji: '👔', maxAssignees: 1, claimPolicy: { type: 'delegated' } }
  ]

  const nodes = [
    { id: `node-${shortId()}`, title: '提交采购申请', description: '填写采购申请表', content: '采购办公设备一批，预算 ¥50,000', contentType: 'markdown', assignedRole: roles[0].id, status: 'completed', priority: 1, deadline: daysFromNow(-2), allowedOperators: [], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [{ userId: 'zhangsan', userName: '张三', completedAt: now(), customValues: {} }], position: { x: 0, y: 0 }, tags: ['申请'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '主管审批', description: '部门主管审批（任意 2 人通过即可）', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'in-progress', priority: 2, deadline: daysFromNow(3), allowedOperators: [roles[1].id], allowedUsers: [], completionRule: 'count', completionTarget: 2, completions: [{ userId: 'lisi', userName: '李四主管', completedAt: now(), customValues: {} }], position: { x: 0, y: 150 }, tags: ['审批'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '财务审核', description: '财务审核预算合规性', content: '', contentType: 'markdown', assignedRole: roles[2].id, status: 'todo', priority: 3, deadline: daysFromNow(7), allowedOperators: [roles[2].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 300 }, tags: ['财务'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '总经理批准', description: '总经理最终审批', content: '', contentType: 'markdown', assignedRole: roles[3].id, status: 'todo', priority: 4, deadline: daysFromNow(10), allowedOperators: [roles[3].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 450 }, tags: ['批准'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '归档', description: '流程完成，文件归档', content: '', contentType: 'markdown', assignedRole: roles[0].id, status: 'todo', priority: 5, deadline: daysFromNow(15), allowedOperators: [], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 600 }, tags: ['归档'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] }
  ]

  return { roles, nodes, edges: [
    { id: `edge-${shortId()}`, source: nodes[0].id, target: nodes[1].id, label: '' },
    { id: `edge-${shortId()}`, source: nodes[1].id, target: nodes[2].id, label: '' },
    { id: `edge-${shortId()}`, source: nodes[2].id, target: nodes[3].id, label: '' },
    { id: `edge-${shortId()}`, source: nodes[3].id, target: nodes[4].id, label: '' }
  ] }
}

function buildSinglePreset() {
  const roles = [{ id: `role-${shortId()}`, name: '执行人', color: '#10B981', emoji: '🟢', maxAssignees: 999, claimPolicy: { type: 'free' } }]
  const nodes = [{ id: `node-${shortId()}`, title: '快速测试节点（单人）', description: '单人完成模式', content: '', contentType: 'markdown', assignedRole: roles[0].id, status: 'todo', priority: 1, deadline: null, allowedOperators: [], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 0 }, tags: ['测试'], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] }]
  return { roles, nodes, edges: [] }
}

function buildCountPreset() {
  const roles = [
    { id: `role-${shortId()}`, name: '成员', color: '#3B82F6', emoji: '🟢', maxAssignees: 999, claimPolicy: { type: 'free' } },
    { id: `role-${shortId()}`, name: '组长', color: '#F59E0B', emoji: '👤', maxAssignees: 5, claimPolicy: { type: 'free' } }
  ]
  const nodes = [
    { id: `node-${shortId()}`, title: '成员填写（需 3 人完成）', description: '累计 3 人完成即可', content: '', contentType: 'markdown', assignedRole: roles[0].id, status: 'in-progress', priority: 1, deadline: null, allowedOperators: [], allowedUsers: [], completionRule: 'count', completionTarget: 3, completions: [{ userId: 'user1', userName: '用户1', completedAt: now(), customValues: {} }], position: { x: 0, y: 0 }, tags: [], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '组长审核（单人）', description: '3 人完成后组长审核', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'blocked', priority: 2, deadline: null, allowedOperators: [roles[1].id], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 150 }, tags: [], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] },
    { id: `node-${shortId()}`, title: '归档完成', description: '', content: '', contentType: 'markdown', assignedRole: roles[1].id, status: 'todo', priority: 3, deadline: null, allowedOperators: [], allowedUsers: [], completionRule: 'single', completionTarget: 1, completions: [], position: { x: 0, y: 300 }, tags: [], attachments: [], customValues: {}, comments: [], subMissionId: null, subMissionSummary: null, jumpLinks: [] }
  ]
  return { roles, nodes, edges: [
    { id: `edge-${shortId()}`, source: nodes[0].id, target: nodes[1].id, label: '需3人完成' },
    { id: `edge-${shortId()}`, source: nodes[1].id, target: nodes[2].id, label: '' }
  ] }
}

// ── 从命令行参数手动构建任务 ──

function buildFromArgs(opts) {
  let roles = []
  let nodes = []
  let edges = []

  // 解析角色
  if (opts.roles) {
    roles = opts.roles.split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const [name, policy = 'free'] = s.split(':').map(x => x.trim())
      return { id: `role-${shortId()}`, name, color: '#6B7280', emoji: '👤', maxAssignees: 999, claimPolicy: { type: policy } }
    })
  }

  // 解析节点
  if (opts.nodes) {
    nodes = opts.nodes.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => {
      const parts = s.split(':').map(x => x.trim())
      const title = parts[0]
      const roleName = parts[1] || ''
      const rule = parts[2] || 'single'
      const target = parseInt(parts[3], 10) || 1
      // 查找角色 ID
      const role = roles.find(r => r.name === roleName)
      return {
        id: `node-${shortId()}`,
        title,
        description: '',
        content: '', contentType: 'markdown',
        assignedRole: role ? role.id : '',
        status: 'todo', priority: 1, deadline: null,
        allowedOperators: [], allowedUsers: [],
        completionRule: rule, completionTarget: target,
        completions: [], position: { x: 0, y: i * 150 },
        tags: [], attachments: [], customValues: {}, comments: [],
        subMissionId: null, subMissionSummary: null, jumpLinks: []
      }
    })
  }

  // 解析边
  if (opts.edges) {
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.title] = n.id })
    edges = opts.edges.split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const [srcTitle, tgtTitle] = s.split('->').map(x => x.trim())
      return { id: `edge-${shortId()}`, source: nodeMap[srcTitle] || '', target: nodeMap[tgtTitle] || '', label: '' }
    }).filter(e => e.source && e.target)
  }

  return { roles, nodes, edges }
}

// ── 构建完整 Mission ──

function buildMission(buildResult, title) {
  return {
    id: `mission-${shortId()}`,
    title,
    description: '',
    createdBy: 'dev_tools',
    createdAt: now(), updatedAt: now(),
    status: 'active',
    roles: buildResult.roles || [],
    nodes: buildResult.nodes || [],
    edges: buildResult.edges || [],
    assignments: [],
    customFields: [],
    reminders: [],
    permissions: [],
    jumpLinks: [],
    tags: ['dev_tools'],
    version: '3.0',
    exportMeta: { exportedAt: null, includesSubMissions: false, includesComments: false }
  }
}

// ── 命令行参数解析 ──

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help': case '-h':
        showHelp(); process.exit(0)
      case '--list': case '-l':
        listPresets(); process.exit(0)
      case '--preset': case '-p':
        opts.preset = args[++i]
        break
      case '--title': case '-t':
        opts.title = args[++i]
        break
      case '--roles': case '-r':
        opts.roles = args[++i]
        break
      case '--nodes': case '-n':
        opts.nodes = args[++i]
        break
      case '--edges': case '-e':
        opts.edges = args[++i]
        break
      case '--output': case '-o':
        opts.output = args[++i]
        break
    }
  }
  return opts
}

function showHelp() {
  console.log(`
用法: node dev_tools/create-test-mission.cjs [选项]

选项:
  --preset, -p <name>    使用预设 (class|eval|approval|single|count)
  --title, -t <text>     任务标题
  --roles, -r <spec>     角色定义：逗号分隔 "名称:策略"
  --nodes, -n <spec>     节点定义：逗号分隔 "标题:角色:规则:目标数"
  --edges, -e <spec>     边定义：逗号分隔 "源->目标"
  --output, -o <path>    输出文件路径 (默认打印到 stdout)
  --list, -l             列出可用预设
  --help, -h             显示帮助

预设:
  class      班级材料提交（5 节点 · 3 角色 · count 模式）
  eval       评奖评优（5 节点 · 3 角色 · 子图标记）
  approval   采购审批流（5 节点 · 4 角色 · 并行审批）
  single     单人测试（1 节点 · single 模式）
  count      多人测试（3 节点 · count+single · 依赖测试）

自定义示例:
  node dev_tools/create-test-mission.cjs \\
    --title "我的任务" \\
    --roles "成员:free,组长:free" \\
    --nodes "填写信息:成员:count:30,审核:组长:single:1" \\
    --edges "填写信息->审核"
    --output data/missions/my-task.json
`)
}

function listPresets() {
  console.log('\n可用预设:\n')
  Object.entries(PRESETS).forEach(([name, p]) => {
    console.log(`  ${name.padEnd(12)} ${p.title}`)
    console.log(`  ${' '.repeat(12)} ${p.description}`)
    console.log()
  })
}

// ── 主逻辑 ──

function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  📋 任务系统 · 测试任务创建工具          ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  const opts = parseArgs()

  let buildResult, title

  if (opts.preset) {
    const preset = PRESETS[opts.preset]
    if (!preset) {
      console.error(`❌ 未知预设 "${opts.preset}"，用 --list 查看可用预设。`)
      process.exit(1)
    }
    title = opts.title || preset.title
    buildResult = preset.build()
    console.log(`预设: ${preset.title}`)
  } else if (opts.roles || opts.nodes) {
    title = opts.title || '自定义任务'
    buildResult = buildFromArgs(opts)
    console.log(`自定义: ${title}`)
  } else {
    // 默认：使用第一个预设
    const preset = PRESETS['class']
    title = preset.title
    buildResult = preset.build()
    console.log(`预设: ${preset.title} (默认)`)
  }

  const mission = buildMission(buildResult, title)

  const json = JSON.stringify(mission, null, 2)

  if (opts.output) {
    const outputPath = path.resolve(process.cwd(), opts.output)
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(outputPath, json, 'utf-8')
    console.log(`\n✅ 已保存到: ${outputPath}`)
    console.log(`   文件大小: ${(json.length / 1024).toFixed(1)} KB`)
    console.log(`   任务 ID: ${mission.id}`)
    console.log(`   节点数: ${mission.nodes.length}`)
    console.log(`   角色数: ${mission.roles.length}`)
    console.log('\n👉 在应用中点击 "📥 导入 JSON" 选择此文件')
  } else {
    console.log('\n' + json)
  }

  console.log('')
}

try {
  main()
} catch (e) {
  console.error('运行时错误:', e)
  process.exit(1)
}
