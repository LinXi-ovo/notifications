import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import VueInspector from 'vite-plugin-vue-inspector'

export default defineConfig({
  base: process.env.BASE_URL || './',
  plugins: [vue(), tailwindcss(), VueInspector({
    toggleCombo: 'control-shift',
    editor: 'vscode',
    showToggleButton: 'active',
  })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
