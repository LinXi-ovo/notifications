<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <h2 class="text-xl font-bold text-gray-800 mb-6">ℹ️ 关于</h2>

    <!-- 基本信息 -->
    <section class="mb-8">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-4xl">📢</span>
          <div>
            <h3 class="text-lg font-bold text-gray-800 m-0">通知聚合器</h3>
            <p class="text-sm text-gray-400 m-0 mt-0.5">大学微信通知聚合系统</p>
          </div>
        </div>
        <div class="text-sm text-gray-600 leading-relaxed space-y-1.5">
          <p>将分散在微信群中的通知聚合到网页中，支持分类浏览、富文本编辑（含内嵌媒体）、小范围分享、DAG 任务追踪。</p>
        </div>
        <div class="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 space-y-1">
          <div><span class="text-gray-500">前端框架：</span>Vue 3 + Vite + Tailwind CSS v4</div>
          <div><span class="text-gray-500">后端：</span>Bmob 后端云 (bmob.cn)</div>
          <div><span class="text-gray-500">富文本编辑器：</span>wangEditor V5</div>
          <div><span class="text-gray-500">流程图：</span>Mermaid</div>
          <div><span class="text-gray-500">部署：</span>Cloudflare Pages</div>
        </div>
      </div>
    </section>

    <!-- 版本更新历史 -->
    <section>
      <h3 class="text-base font-semibold text-gray-700 mb-3">📜 更新历史</h3>
      <div class="space-y-3">
        <div v-for="(module, i) in byModule" :key="i" class="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span class="text-base" v-html="moduleIcon(module.key)"></span>
            <span class="text-sm font-semibold text-gray-700">{{ module.label }}</span>
          </div>
          <ul class="m-0 p-0 list-none">
            <li
              v-for="(item, j) in module.items"
              :key="j"
              class="px-4 py-2 text-xs text-gray-600 border-b border-gray-50 last:border-b-0 flex items-start gap-2"
            >
              <span class="shrink-0 mt-0.5" v-html="typeIcon(item.type)"></span>
              <span class="flex-1">{{ item.msg }}</span>
              <span v-if="item.version" class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{{ item.version }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- 按版本归档（折叠） -->
      <details class="mt-6">
        <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">📦 按版本归档</summary>
        <div class="mt-3 space-y-2">
          <div v-for="(group, i) in changelog" :key="i" class="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span class="text-xs font-semibold text-gray-600">{{ group.tag }}</span>
              <span class="text-[10px] text-gray-400">{{ group.date }}</span>
            </div>
            <ul class="m-0 p-0 list-none">
              <li
                v-for="(item, j) in group.items"
                :key="j"
                class="px-4 py-1.5 text-[11px] text-gray-500 border-b border-gray-50 last:border-b-0"
              >· {{ item.msg }}</li>
            </ul>
          </div>
        </div>
      </details>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const modules = [
  {
    key: 'knowledge',
    label: '每日资讯',
    icon: '📢',
    items: [
      { type: 'feat', msg: '全功能实现（P0~P2），含调试模式、一键生成默认资讯', version: 'v1.0.0-beta' },
      { type: 'feat', msg: 'Bmob Boolean 查询兼容：服务端不支持改为客户端过滤', version: 'v1.0.0-beta' },
      { type: 'feat', msg: '测试资讯自动标注 🧪 测试标签，防误导', version: 'v1.0.0-beta' },
      { type: 'fix', msg: '补全 isTestItem computed 属性，测试徽章正常显示', version: 'v1.0.0-beta' },
    ]
  },
  {
    key: 'mission',
    label: '任务系统（DAG）',
    icon: '📋',
    items: [
      { type: 'feat', msg: '任务系统 P0~P4 全功能实现', version: 'v0.9.0' },
      { type: 'feat', msg: 'DAG 任务图：SVG 渲染、缩放平移、节点卡片、状态转换', version: 'v0.9.0' },
      { type: 'feat', msg: '角色权限系统：三步判定法（管理员免检 → 节点白名单 → 角色映射）', version: 'v0.9.0' },
      { type: 'feat', msg: '编辑模式 / 执行模式双模式', version: 'v0.9.0' },
      { type: 'feat', msg: 'Bmob 云端持久化 + 本地优先双写同步', version: 'v0.9.0' },
      { type: 'feat', msg: '任务统计视图 + 自定义字段 + 评论讨论', version: 'v0.9.0' },
      { type: 'feat', msg: '委派认领 + 密码认领 + 权限隔离', version: 'v0.9.0' },
      { type: 'feat', msg: '调试模式一键删除未保护任务', version: 'v0.4.0' },
      { type: 'fix', msg: 'MissionAssignment 表查询优化：避免 $and 语法，处理表不存在异常', version: 'v1.0.0-beta' },
      { type: 'fix', msg: '表名对齐 Bmob 已有表（MissionAssignmen）', version: 'v1.0.0-beta' },
      { type: 'fix', msg: 'Admin 预览层解析 [[mission:xxx]] 跳转链接', version: 'v0.4.0' },
    ]
  },
  {
    key: 'home',
    label: '首页 & 通知',
    icon: '🏠',
    items: [
      { type: 'feat', msg: '首页通知列表：分类导航、搜索、优先级标识', version: 'v0.8.0' },
      { type: 'feat', msg: '通知详情页：富文本渲染、Mermaid Token/Map 分离、PDF 预览、图片灯箱', version: 'v0.8.0' },
      { type: 'feat', msg: '首页任务概览模块', version: 'v1.0.0-beta' },
      { type: 'feat', msg: '通知内容中 AI 生成的 URL 自动显示为可点击链接', version: 'v0.4.0' },
      { type: 'fix', msg: 'Recycle Bin 回收站软删除机制', version: 'v0.8.0' },
      { type: 'fix', msg: 'PDF 预览重构：iframe + ?file= 参数模式，支持 COS 跨域', version: 'v0.4.0' },
    ]
  },
  {
    key: 'admin',
    label: '管理后台',
    icon: '✏️',
    items: [
      { type: 'feat', msg: '通知创建/编辑（wangEditor + Mermaid 管理）', version: 'v0.8.0' },
      { type: 'feat', msg: 'DeepSeek AI 生成通知（AiGenerator）', version: 'v0.8.0' },
      { type: 'feat', msg: 'AI 通知支持 combined 格式（通知+任务一次生成）', version: 'v0.4.0' },
      { type: 'feat', msg: '文件注册表 + 腾讯云 COS 直传', version: 'v0.8.0' },
      { type: 'feat', msg: '分类管理（CategoryManager）', version: 'v0.8.0' },
    ]
  },
  {
    key: 'system',
    label: '系统基础',
    icon: '⚙️',
    items: [
      { type: 'feat', msg: '用户认证系统（登录/注册/角色）', version: 'v0.8.0' },
      { type: 'feat', msg: '用户收藏功能', version: 'v0.8.0' },
      { type: 'feat', msg: '导航栏快捷链接下拉菜单（可管理）', version: 'v0.4.0' },
      { type: 'feat', msg: '设置页：测试通知开关、调试模式', version: 'v0.8.0' },
      { type: 'init', msg: '项目初始化：Vite + Vue 3 + Tailwind CSS 工程搭建', version: 'v0.1.0' },
      { type: 'init', msg: 'Bmob 后端云集成', version: 'v0.1.0' },
      { type: 'init', msg: '基础路由与认证守卫', version: 'v0.1.0' },
      { type: 'feat', msg: '分类体系重构：单源配置，新增「咨询」「党团」', version: 'v0.4.0' },
      { type: 'fix', msg: '收藏自动清理通知永久删除后的残留', version: 'v0.4.0' },
      { type: 'docs', msg: '扩展 CLAUDE.md：架构详解、Store 数据流模式、路由表', version: 'v0.9.0' },
    ]
  }
]

/** 按模块分组展示 */
const byModule = computed(() => modules)

/** 历史版本归档（供折叠参考） */
const changelog = [
  { tag: 'v1.0.0-beta', date: '2026-06', items: [
    '每日资讯全功能 + 调试模式',
    'Bmob Boolean/and 查询兼容修复',
    '首页任务概览模块',
    '测试资讯标记 🧪',
    '关于页面（按模块组织更新历史）',
  ]},
  { tag: 'v0.9.0', date: '2026-05', items: [
    '任务系统 P0~P4 全功能',
    'DAG 图 / 角色权限 / 双模式',
    'Bmob 持久化 + 本地双写',
    '统计视图 / 自定义字段 / 评论',
  ]},
  { tag: 'v0.4.0', date: '2026-06', items: [
    'AI 通知链接自动格式化 + combined 格式',
    '分类单源配置 / 新增「咨询」「党团」',
    '导航栏快捷链接',
    '任务调试模式一键删除',
    'PDF 预览重构',
  ]},
  { tag: 'v0.8.0', date: '2026-04', items: [
    '首页通知列表 / 分类导航 / 搜索',
    '通知详情（富文本/Mermaid/PDF/图片）',
    '管理后台（wangEditor + AI 生成）',
    '文件注册表 + COS 直传',
    '分类管理 / 收藏 / 用户认证',
    '设置页 / 回收站',
  ]},
  { tag: 'v0.1.0', date: '2026-03', items: [
    '项目初始化',
    'Bmob 集成',
    '路由与认证守卫',
  ]},
]

function typeIcon(type) {
  const icons = {
    feat: '<span class="text-green-500">✨</span>',
    fix: '<span class="text-blue-500">🐛</span>',
    docs: '<span class="text-purple-500">📝</span>',
    init: '<span class="text-gray-400">🚀</span>',
  }
  return icons[type] || '<span class="text-gray-400">•</span>'
}

function moduleIcon(key) {
  const m = modules.find(m => m.key === key)
  return m ? m.icon : '📦'
}
</script>

<style scoped>
/* subtle list spacing */
li:first-child {
  padding-top: 0.625rem;
}
</style>
