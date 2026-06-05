<template>
  <div id="app-root">
    <AppHeader />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { useSyncStore } from '@/stores/sync'

onMounted(() => {
  // 初始化 Tauri 同步监听（非 Tauri 环境静默降级）
  const syncStore = useSyncStore()
  syncStore.init()
})
</script>
