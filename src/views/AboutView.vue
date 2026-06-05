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
      <div class="space-y-2">
        <div v-for="(group, i) in changelog" :key="i" class="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span class="text-sm font-semibold text-gray-700">{{ group.tag }}</span>
            <span class="text-xs text-gray-400">{{ group.date }}</span>
          </div>
          <ul class="m-0 p-0 list-none">
            <li
              v-for="(item, j) in group.items"
              :key="j"
              class="px-4 py-2 text-xs text-gray-600 border-b border-gray-50 last:border-b-0 flex items-start gap-2"
            >
              <span class="shrink-0 mt-0.5" v-html="typeIcon(item.type)"></span>
              <span>{{ item.msg }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const changelog = [
  {
    tag: 'v1.0.0-beta',
    date: '2026-06',
    items: [
      { type: 'feat', msg: '每日资讯：全功能实现（P0~P2），含调试模式、一键生成默认资讯' },
      { type: 'fix', msg: 'Bmob Boolean 查询兼容：服务端不支持改为客户端过滤' },
      { type: 'fix', msg: 'MissionAssignment 表查询优化：避免 $and 语法，处理表不存在异常' },
      { type: 'fix', msg: 'HomeView 首页任务概览模块' },
    ]
  },
  {
    tag: 'v0.9.0',
    date: '2026-05',
    items: [
      { type: 'feat', msg: '任务系统 P0~P4 全功能实现' },
      { type: 'feat', msg: 'DAG 任务图：SVG 渲染、缩放平移、节点卡片、状态转换' },
      { type: 'feat', msg: '角色权限系统：三步判定法（管理员免检 → 节点白名单 → 角色映射）' },
      { type: 'feat', msg: '编辑模式 / 执行模式双模式' },
      { type: 'feat', msg: 'Bmob 云端持久化 + 本地优先双写同步' },
      { type: 'feat', msg: '任务统计视图 + 自定义字段 + 评论讨论' },
      { type: 'feat', msg: '委派认领 + 密码认领 + 权限隔离' },
      { type: 'docs', msg: '扩展 CLAUDE.md：架构详解、Store 数据流模式、路由表' },
    ]
  },
  {
    tag: 'v0.8.0',
    date: '2026-04',
    items: [
      { type: 'feat', msg: '首页通知列表：分类导航、搜索、优先级标识' },
      { type: 'feat', msg: '通知详情页：富文本渲染、Mermaid Token/Map 分离、PDF 预览、图片灯箱' },
      { type: 'feat', msg: '管理后台：通知创建/编辑（wangEditor + Mermaid 管理）' },
      { type: 'feat', msg: 'DeepSeek AI 生成通知（AiGenerator）' },
      { type: 'feat', msg: '文件注册表 + 腾讯云 COS 直传' },
      { type: 'feat', msg: '分类管理（CategoryManager）' },
      { type: 'feat', msg: '用户收藏功能' },
      { type: 'feat', msg: '用户认证系统（登录/注册/角色）' },
      { type: 'feat', msg: '设置页：测试通知开关、调试模式' },
      { type: 'fix', msg: 'Recycle Bin 回收站软删除机制' },
    ]
  },
  {
    tag: 'v0.1.0',
    date: '2026-03',
    items: [
      { type: 'init', msg: '项目初始化：Vite + Vue 3 + Tailwind CSS 工程搭建' },
      { type: 'init', msg: 'Bmob 后端云集成' },
      { type: 'init', msg: '基础路由与认证守卫' },
    ]
  }
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
</script>

<style scoped>
/* subtle list spacing */
li:first-child {
  padding-top: 0.625rem;
}
</style>
