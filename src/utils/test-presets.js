/**
 * 测试通知预设模板 — 用于管理员一键生成测试数据
 *
 * 每条通知使用 type: 'test'，在首页默认隐藏，
 * 需要先在设置页开启「显示测试通知」才可见。
 */

/**
 * @typedef {Object} TestNotificationPreset
 * @property {string} title - 通知标题
 * @property {string} content - HTML 正文（可含 Mermaid / JumpLink / 媒体引用）
 * @property {string} type - 固定 'test'
 * @property {string} sourceGroup - 来源群组
 * @property {string} sourcePerson - 来源人
 * @property {number} priority - 0-3
 * @property {string[]} tags - 标签
 * @property {string} status - 默认 'active'
 */

/** 测试用 Mermaid 流程图 */
const MERMAID_FLOWCHART = `<div data-mermaid="graph TD&#10;  A[开始] --> B{条件判断}&#10;  B -->|是| C[执行操作]&#10;  B -->|否| D[结束]&#10;  C --> D"></div>`

const MERMAID_GANTT = `<div data-mermaid="gantt&#10;  title 项目规划&#10;  dateFormat  YYYY-MM-DD&#10;  section 阶段A&#10;  任务1 :a1, 2026-06-01, 7d&#10;  任务2 :after a1, 5d&#10;  section 阶段B&#10;  任务3 :2026-06-10, 10d"></div>`

/**
 * 测试通知预设列表
 * @type {TestNotificationPreset[]}
 */
export const TEST_PRESETS = [
  {
    title: '🧪 [测试] 综测加分材料提交通知',
    content: `<p><strong>关于提交 2025-2026 学年综合素质测评加分材料的通知</strong></p>
<p>各位同学：</p>
<p>请于 <strong>6月20日之前</strong> 将以下材料提交至学院办公室：</p>
<ul>
  <li>获奖证书复印件</li>
  <li>社会实践证明</li>
  <li>论文发表证明</li>
</ul>
<p>逾期不予受理。</p>
<p style="color:#999">（测试数据 — 模拟综测通知）</p>`,
    type: 'test',
    sourceGroup: '学院教务办',
    sourcePerson: '张老师',
    priority: 2,
    tags: ['综测', '加分材料', 'deadline'],
  },
  {
    title: '🧪 [测试] 保研夏令营报名通知',
    content: `<p><strong>2026年暑期保研夏令营报名开启</strong></p>
<p>面向全国高校大三学生，接收 <strong>计算机、自动化、通信</strong> 等相关专业。</p>
<ul>
  <li>报名时间：即日起至 6月30日</li>
  <li>活动时间：7月15日-7月20日</li>
  <li>费用：免费（提供食宿）</li>
</ul>
<p>详情见附件。</p>
<p style="color:#999">（测试数据 — 模拟保研通知）</p>`,
    type: 'test',
    sourceGroup: '招生办',
    sourcePerson: '李老师',
    priority: 3,
    tags: ['保研', '夏令营', '报名'],
  },
  {
    title: '🧪 [测试] 校园活动：编程马拉松报名',
    content: `<p><strong>🖥️ 2026 校园编程马拉松</strong></p>
<p>组队参赛（2-4人），36小时极限编程！</p>
<ul>
  <li>🏆 一等奖：5000元</li>
  <li>🥈 二等奖：3000元</li>
  <li>🥉 三等奖：1000元</li>
</ul>
<p>报名截止：6月25日</p>
<p style="color:#999">（测试数据 — 模拟活动通知）</p>`,
    type: 'test',
    sourceGroup: '学生会',
    sourcePerson: '王同学',
    priority: 1,
    tags: ['编程', '比赛', '组队'],
  },
  {
    title: '🧪 [测试] 课程安排调整通知',
    content: `<p><strong>《数据结构》课程调课通知</strong></p>
<p>因老师参加学术会议，本周五的课程调整如下：</p>
<ul>
  <li>原定：周五 14:00-16:00 教学楼A201</li>
  <li>调整至：<strong>下周一 10:00-12:00</strong> 教学楼B303</li>
</ul>
<p>请同学们互相转告。</p>
<p style="color:#999">（测试数据 — 模拟课程通知）</p>`,
    type: 'test',
    sourceGroup: '计算机学院',
    sourcePerson: '陈老师',
    priority: 1,
    tags: ['课程调整', '数据结构'],
  },
  {
    title: '🧪 [测试] 作业提交提醒（含 Mermaid 流程图）',
    content: `<p><strong>软件工程课程大作业提交提醒</strong></p>
<p>项目开发流程如下：</p>
${MERMAID_FLOWCHART}
<p>截止日期：6月30日 23:59</p>
<p>提交方式：Git仓库 + 实验报告PDF</p>
<p style="color:#999">（测试数据 — 含 Mermaid 流程图）</p>`,
    type: 'test',
    sourceGroup: '软件工程课程',
    sourcePerson: '赵老师',
    priority: 2,
    tags: ['作业', 'Mermaid', '流程图'],
  },
  {
    title: '🧪 [测试] 综合通知：项目规划（含甘特图）',
    content: `<p><strong>暑期社会实践项目时间规划</strong></p>
<p>以下是整体时间安排：</p>
${MERMAID_GANTT}
<p>各阶段交付物要求详见附件。</p>
<p style="color:#999">（测试数据 — 含 Mermaid 甘特图）</p>`,
    type: 'test',
    sourceGroup: '团委',
    sourcePerson: '刘老师',
    priority: 0,
    tags: ['社会实践', '甘特图', '规划'],
  },
  {
    title: '🧪 [测试] 带 JumpLink 跳转的测试通知',
    content: `<p><strong>通知与任务联动测试</strong></p>
<p>这条通知演示 JumpLink 跳转功能：</p>
<ul>
  <li>查看相关任务：跳转到任务 📋 [[mission:demo-mission]]</li>
  <li>查看另一条通知：📰 [[notif:demo-notif]]</li>
</ul>
<p>点击上面的链接即可跳转。</p>
<p style="color:#999">（测试数据 — 含 JumpLink 跳转演示）</p>`,
    type: 'test',
    sourceGroup: '开发测试',
    sourcePerson: 'Admin',
    priority: 0,
    tags: ['JumpLink', '测试', '跳转'],
  },
  {
    title: '🧪 [测试] 富文本内容测试（图片+表格+引用）',
    content: `<p><strong>富文本渲染综合测试</strong></p>
<blockquote>
  <p>测试引用块样式渲染效果</p>
</blockquote>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0;">
  <tr style="background:#f3f4f6;"><th>项目</th><th>说明</th><th>状态</th></tr>
  <tr><td>图片内嵌</td><td>测试图片展示</td><td>✅</td></tr>
  <tr><td>表格渲染</td><td>测试表格样式</td><td>✅</td></tr>
  <tr><td>代码块</td><td>测试代码高亮</td><td>✅</td></tr>
</table>
<pre><code>console.log('Hello, World!')
// 测试代码块样式</code></pre>
<p style="color:#999">（测试数据 — 富文本测试）</p>`,
    type: 'test',
    sourceGroup: '开发测试',
    sourcePerson: 'Admin',
    priority: 0,
    tags: ['富文本', '表格', '渲染测试'],
  },
]

/**
 * 获取预设的总数
 */
export const PRESET_COUNT = TEST_PRESETS.length

/**
 * 获取预设标题列表（用于确认对话框展示）
 */
export function getPresetTitles() {
  return TEST_PRESETS.map((p, i) => `#${i + 1} ${p.title}`)
}
