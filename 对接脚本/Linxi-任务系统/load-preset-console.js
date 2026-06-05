/**
 * 任务系统 — 预设加载脚本
 *
 * 用法：在浏览器控制台运行此脚本（无需开启调试模式）
 *
 * 方式1: 加载全部预设
 *   loadAllPresets()
 *
 * 方式2: 加载指定预设
 *   loadPreset('class')     // 班级材料提交
 *   loadPreset('eval')      // 评奖评优
 *   loadPreset('approval')  // 采购审批流
 *   loadPreset('single')    // 单人测试
 *   loadPreset('count')     // 多人测试
 *
 * 方式3: 直接粘贴整个脚本执行（自动加载全部预设到列表）
 */

// ============================================================
// 复制以下内容到浏览器控制台执行
// ============================================================

;(function() {
  'use strict'

  // ── 获取 Pinia store ──
  const app = document.querySelector('#app')
  if (!app || !app._vueApp) {
    console.error('❌ 未找到 Vue 应用实例。请确保页面已加载。')
    return
  }
  const pinia = app._vueApp.config.globalProperties.$pinia
  if (!pinia) {
    console.error('❌ 未找到 Pinia。')
    return
  }

  // 通过 Pinia 获取 mission store
  const { useMissionStore } = await import(/* @vite-ignore */ '/src/stores/mission.js')
  const missionStore = useMissionStore()

  // ── 预设数据 ──
  const presets = [
    {
      key: 'class',
      title: '📋 班级材料提交',
      data: function() {
        // 完整的预设在 mission-presets.js 中定义
        // 这里仅内联一个简化版用于演示
        return null
      }
    }
  ]

  // 从模块加载完整预设
  const { ALL_PRESETS } = await import(/* @vite-ignore */ '/src/utils/mission-presets.js')

  let loaded = 0

  for (const preset of ALL_PRESETS) {
    try {
      const mission = preset.fn()
      // 检查是否已存在
      if (missionStore.index.find(i => i.id === mission.id)) {
        console.log(`⏭️  已存在: ${mission.title}`)
        continue
      }
      // 写入 localStorage
      localStorage.setItem('mission:' + mission.id, JSON.stringify(mission))
      // 更新索引
      missionStore.index.push({
        id: mission.id,
        title: mission.title,
        status: mission.status,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt
      })
      loaded++
      console.log(`✅ 已加载: ${mission.title}`)
    } catch (e) {
      console.error(`❌ 加载失败: ${preset.name}`, e)
    }
  }

  // 持久化索引
  localStorage.setItem('missions:index', JSON.stringify(missionStore.index))

  console.log(`\n🎉 完成！共加载 ${loaded} 个预设任务`)
  console.log('👉 刷新页面或点击 "📋 任务" 查看')

  // 可选：自动跳转到任务列表
  // window.location.hash = '#/missions'
})()

/**
 * 在浏览器控制台中手动调用此函数加载指定预设
 */
async function loadPreset(key) {
  const { ALL_PRESETS } = await import('/src/utils/mission-presets.js')
  const { useMissionStore } = await import('/src/stores/mission.js')
  const store = useMissionStore()

  const map = {
    'class': 0, 'eval': 1, 'approval': 2, 'single': 3, 'count': 4
  }
  const idx = map[key]
  if (idx === undefined || !ALL_PRESETS[idx]) {
    console.error('❌ 未知预设。可选: class, eval, approval, single, count')
    return
  }

  const preset = ALL_PRESETS[idx]
  const mission = preset.fn()

  localStorage.setItem('mission:' + mission.id, JSON.stringify(mission))
  store.index.push({
    id: mission.id,
    title: mission.title,
    status: mission.status,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt
  })
  localStorage.setItem('missions:index', JSON.stringify(store.index))

  console.log(`✅ 已加载: ${mission.title}`)
  console.log('👉 切换到 "📋 任务" 页面或刷新查看')

  // 自动跳转
  window.location.hash = '#/missions'
}

/**
 * 加载所有预设
 */
async function loadAllPresets() {
  const keys = ['class', 'eval', 'approval', 'single', 'count']
  for (const k of keys) {
    await loadPreset(k)
  }
}
