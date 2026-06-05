#!/usr/bin/env node
/**
 * 快速创建测试通知脚本
 *
 * 用法:
 *   node dev_tools/create-test-notification.cjs              # 默认：创建 Mermaid 测试通知
 *   node dev_tools/create-test-notification.cjs --template basic   # 纯文本通知
 *   node dev_tools/create-test-notification.cjs --list             # 列出可用模板
 *   node dev_tools/create-test-notification.cjs --help             # 查看帮助
 *
 * 自定义选项:
 *   --title "标题"         通知标题
 *   --type course          分类 (other|zongce|baoyan|course|activity|homework)
 *   --priority 1           优先级 (0=普通, 1=置顶, 2=重要, 3=紧急)
 *   --group "来源群"       来源群组
 *   --person "发布人"      发布人
 *   --tags tag1,tag2       标签（逗号分隔）
 *   --template mermaid     模板名（见 --list）
 *   --count 3              创建 N 条（仅 basic 模板有效）
 *
 * 路径：从项目根目录运行，自动读取 .env 中的 Bmob 凭据。
 */

const fs = require('fs')
const path = require('path')

// ── 读取 .env ──
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ 找不到 .env 文件，请确保在项目根目录运行此脚本。')
    process.exit(1)
  }
  const env = {}
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=]\w+)\s*=\s*["']?(.+?)["']?\s*$/)
    if (m) env[m[1]] = m[2].replace(/\r$/, '')
  })
  return env
}

// ── 模板 ──
const TEMPLATES = {
  mermaid: {
    title: '📊 Mermaid 流程图渲染测试（三种图表）',
    content: () => {
      const esc = s => s.replace(/"/g, '&quot;')
      const graph = esc(`graph TD
    A[收到通知] --> B{有截止日期?}
    B -->|是| C[记录截止日期]
    B -->|否| D[直接发布]
    C --> E[设置提前提醒]
    E --> F[截止前弹窗通知]
    D --> G[通知上线]
    F --> G`)
      const seq = esc(`sequenceDiagram
    用户->>系统: 打开通知
    系统->>数据库: 查询截止日期
    数据库-->>系统: 返回 deadline
    系统->>用户: 显示倒计时
    系统->>用户: 截止前推送提醒`)
      const gantt = esc(`gantt
    title 综测工作推进计划
    dateFormat  YYYY-MM-DD
    section 材料提交
    学生提交材料     :2026-06-01, 20d
    班级初审         :2026-06-21, 5d
    section 审核
    学院复核         :2026-06-26, 5d
    公示             :2026-07-01, 3d`)

      return `<h2>📊 通知处理流程图</h2>
<p>以下是我们系统的通知处理流程：</p>
<div data-mermaid="${graph}"></div>

<h2 style="margin-top:24px">⏰ 通知提醒时序图</h2>
<p>系统与数据库之间的交互流程：</p>
<div data-mermaid="${seq}"></div>

<h2 style="margin-top:24px">📅 综测工作推进计划</h2>
<p>本学期综测工作已经排出时间表：</p>
<div data-mermaid="${gantt}"></div>

<h2>✅ 说明</h2>
<ul>
  <li>三种 Mermaid 图表：流程图、时序图、甘特图</li>
  <li>管理后台预览和详情页都会尝试渲染为 SVG</li>
  <li>如果看到的是纯文本代码而非图表，说明渲染未生效</li>
</ul>`
    },
    priority: 1,
    tags: ['测试', 'Mermaid', '流程图', '时序图', '甘特图'],
  },

  basic: {
    title: '📝 普通通知',
    content: (title) => `<h2>${title || '普通通知'}</h2>
<p>这是一条纯文本通知，用于测试基本渲染功能。</p>
<p>包含 <strong>加粗</strong>、<em>斜体</em>、<u>下划线</u> 等基础格式。</p>
<ul>
  <li>列表项一</li>
  <li>列表项二</li>
  <li>列表项三</li>
</ul>
<p>—— 由 dev_tools 脚本自动创建</p>`,
    priority: 0,
    tags: ['测试', '基础'],
  },

  deadline: {
    title: '⏰ 有截止日期的通知',
    content: (title) => `<h2>${title || '关于提交材料的通知'}</h2>
<p>各位同学：</p>
<p>请于 <strong>2026年6月20日</strong> 前完成材料提交。</p>
<p>逾期不再受理，请相互转告。</p>
<ul>
  <li>材料要求：纸质版一份 + 电子版发送至邮箱</li>
  <li>提交地点：学院办公室 301</li>
  <li>联系人：张老师</li>
</ul>
<hr>
<p style="color:#999">📅 截止日期：2026年6月20日</p>`,
    priority: 2,
    tags: ['测试', '截止日期', '重要'],
  },

  rich: {
    title: '🎉 活动通知（富文本）',
    content: (title) => `<h2>${title || '校园歌手大赛报名通知'}</h2>
<p>🎤 一年一度的校园歌手大赛开始报名了！</p>

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0">
  <tr style="background:#f5f5f5"><td><strong>项目</strong></td><td><strong>说明</strong></td></tr>
  <tr><td>报名时间</td><td>即日起至 6月15日</td></tr>
  <tr><td>初赛时间</td><td>6月20日 14:00</td></tr>
  <tr><td>决赛时间</td><td>7月1日 19:00</td></tr>
  <tr><td>比赛地点</td><td>学生活动中心大礼堂</td></tr>
</table>

<p>报名方式：扫描下方二维码在线报名。</p>
<p>如有疑问请联系学生会文艺部。</p>`,
    priority: 0,
    tags: ['测试', '活动', '报名'],
  },
}

// ── 命令行参数解析 ──
function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { template: 'mermaid', count: 1 }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        showHelp(); process.exit(0)
      case '--list':
      case '-l':
        listTemplates(); process.exit(0)
      case '--template':
      case '-t':
        opts.template = args[++i] || 'mermaid'
        break
      case '--title':
        opts.title = args[++i]
        break
      case '--type':
        opts.type = args[++i]
        break
      case '--priority':
      case '-p':
        opts.priority = parseInt(args[++i], 10)
        break
      case '--group':
      case '-g':
        opts.group = args[++i]
        break
      case '--person':
        opts.person = args[++i]
        break
      case '--tags':
        opts.tags = (args[++i] || '').split(',').map(s => s.trim()).filter(Boolean)
        break
      case '--count':
      case '-n':
        opts.count = parseInt(args[++i], 10) || 1
        break
      default:
        if (args[i] in TEMPLATES) opts.template = args[i]
        else if (!args[i].startsWith('-')) opts.title = args[i]
    }
  }
  return opts
}

function showHelp() {
  console.log(`
用法: node dev_tools/create-test-notification.cjs [选项]

选项:
  --template, -t <名称>   选择模板 (默认: mermaid)
  --title <文本>          通知标题 (自动生成默认标题)
  --type <分类>           分类 (other|zongce|baoyan|course|activity|homework)
  --priority, -p <0-3>    优先级 (0=普通, 1=置顶, 2=重要, 3=紧急)
  --group, -g <文本>      来源群组
  --person <文本>         发布人
  --tags <tag1,tag2>      标签 (逗号分隔)
  --count, -n <数字>      创建数量 (仅 basic 模板)
  --list, -l              列出可用模板
  --help, -h              显示此帮助

示例:
  node dev_tools/create-test-notification.cjs                          # Mermaid 测试
  node dev_tools/create-test-notification.cjs -t basic                 # 纯文本
  node dev_tools/create-test-notification.cjs -t deadline              # 带截止日期
  node dev_tools/create-test-notification.cjs -t rich                  # 富文本 (表格)
  node dev_tools/create-test-notification.cjs -t basic -n 5            # 批量 5 条
  node dev_tools/create-test-notification.cjs -t basic --title "自定义" --priority 2 --group "年级群" --person "张老师"
`)
}

function listTemplates() {
  console.log('\n可用模板:\n')
  Object.entries(TEMPLATES).forEach(([name, t]) => {
    const labels = { mermaid: '三种 Mermaid 图表', basic: '基础纯文本', deadline: '含截止日期提醒', rich: '活动/富文本/表格' }
    console.log(`  ${name.padEnd(12)} ${labels[name] || ''}`)
    console.log(`  ${' '.repeat(12)} 标题: ${t.title}`)
    console.log(`  ${' '.repeat(12)} 标签: ${(t.tags || []).join(', ')}`)
    console.log()
  })
}

// ── 主逻辑 ──
async function createNotification(data) {
  const Bmob = require('hydrogen-js-sdk')
  Bmob._config.type = 4 // nodejs
  Bmob._config.host = 'https://api.bmobcloud.com'
  Bmob.initialize(data.secretKey, data.securityCode)

  const query = Bmob.Query('Notifications')
  query.set('title', data.title)
  query.set('content', data.content)
  query.set('type', data.type || 'other')
  query.set('priority', data.priority ?? 0)
  query.set('status', 'active')
  if (data.sourceGroup) query.set('sourceGroup', data.sourceGroup)
  if (data.sourcePerson) query.set('sourcePerson', data.sourcePerson)
  if (data.tags?.length) query.set('tags', data.tags)

  const result = await query.save()
  return result
}

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  📢 通知聚合 · 测试通知创建工具          ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  const env = loadEnv()
  const opts = parseArgs()
  const template = TEMPLATES[opts.template]

  if (!template) {
    console.error(`❌ 未知模板 "${opts.template}"，用 --list 查看可用模板。`)
    process.exit(1)
  }

  const secretKey = env.VITE_BMOB_SECRET_KEY
  const securityCode = env.VITE_BMOB_API_SAFE_CODE
  if (!secretKey || !securityCode) {
    console.error('❌ .env 中缺少 Bmob 配置 (VITE_BMOB_SECRET_KEY / VITE_BMOB_API_SAFE_CODE)')
    process.exit(1)
  }

  const title = opts.title || template.title
  const content = typeof template.content === 'function'
    ? (opts.template === 'mermaid' ? template.content() : template.content(title))
    : template.content

  const count = Math.min(opts.count, 50)
  console.log(`模板: ${opts.template}`)
  console.log(`标题: ${title}`)
  console.log(`数量: ${count}`)
  console.log('')

  for (let i = 0; i < count; i++) {
    const data = {
      secretKey,
      securityCode,
      title: count > 1 ? `${title} (#${i + 1})` : title,
      content,
      type: opts.type || 'other',
      priority: opts.priority ?? template.priority ?? 0,
      sourceGroup: opts.group || 'dev_tools',
      sourcePerson: opts.person || 'Claude (测试)',
      tags: opts.tags || template.tags || ['测试'],
    }

    try {
      const result = await createNotification(data)
      const id = result.objectId
      console.log(`  ✅ [${i + 1}/${count}] 创建成功 → http://localhost:5173/detail/${id}`)
    } catch (e) {
      console.error(`  ❌ [${i + 1}/${count}] 失败:`, e.message || e)
    }
  }

  console.log('')
  console.log('完成！去开发服务器查看效果 → http://localhost:5173')
  console.log('')
}

main().catch(e => {
  console.error('运行时错误:', e)
  process.exit(1)
})
