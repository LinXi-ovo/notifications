/**
 * Playwright 源码定位助手
 *
 * 通过 Vue 组件树 + vite-plugin-vue-inspector 定位 UI 元素对应的源码。
 *
 * 用法:
 *   node e2e/inspect.mjs <端口> <选择器>
 *
 * 示例:
 *   node e2e/inspect.mjs 5175 'button:has-text("党团")'
 *   node e2e/inspect.mjs 5175 '.bg-white button:nth-child(3)'
 */

import { chromium } from 'playwright'

const [port, selector] = process.argv.slice(2)
const BASE = `http://localhost:${port || 5173}`
const USER = { username: 'insp_dev', password: 'Dev123456!', email: 'd@ev.dev' }

if (!selector) {
  console.log('用法: node e2e/inspect.mjs <端口> <选择器>\n')
  process.exit(1)
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { timeout: 10000 })
  await page.waitForSelector('h2')
  await page.fill('input[type="text"]', USER.username)
  await page.fill('input[type="password"]', USER.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)
  if (!page.url().includes('login')) return
  await page.click('button:has-text("去注册")')
  await page.waitForSelector('input[type="email"]', { timeout: 5000 })
  await page.fill('input[type="email"]', USER.email)
  await page.fill('input[type="text"]', USER.username)
  await page.fill('input[type="password"]', USER.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)
  await page.click('button:has-text("去登录")')
  await page.waitForSelector('h2:has-text("登录")', { timeout: 5000 })
  await page.fill('input[type="text"]', USER.username)
  await page.fill('input[type="password"]', USER.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  await login(page)
  console.log(`✅ ${page.url()}\n`)

  // 先试 data-v-inspector
  let inspector = await page.locator('[data-v-inspector]').first().getAttribute('data-v-inspector').catch(() => null)

  // 如果没有，用 __VUE_INSPECTOR__ 激活后再试
  if (!inspector) {
    await page.evaluate(() => {
      const vi = window.__VUE_INSPECTOR__
      if (vi && vi.enable) vi.enable()
    }).catch(() => {})
    await page.waitForTimeout(300)
    inspector = await page.locator('[data-v-inspector]').first().getAttribute('data-v-inspector').catch(() => null)
  }

  // 如果还是没有，退回到组件树方式
  if (!inspector) {
    // 通过 Vue 组件内部结构找信息
    inspector = await page.evaluate(() => {
      const el = document.querySelector('*')
      if (!el) return null
      const key = Object.keys(el).find(k => k.startsWith('__vue_parent_') || k.startsWith('__vue_'))
      return key ? `Vue internal: ${key}` : null
    }).catch(() => null)
  }

  // 查找元素
  const el = page.locator(selector).first()
  if (!(await el.count())) {
    console.log(`❌ 未找到: ${selector}`)
    await browser.close()
    return
  }

  const tag = await el.evaluate(n => n.tagName.toLowerCase())
  const text = await el.textContent()
  const classList = await el.evaluate(n => n.className?.toString().substring(0, 120))

  console.log(`🔍 选择器: ${selector}`)
  console.log(`   <${tag}>`)
  if (text?.trim()) console.log(`   文本: "${text.trim().substring(0, 100)}"`)
  if (classList) console.log(`   样式: ${classList}`)
  if (inspector) console.log(`   📁 ${inspector}`)
  else console.log(`   ⚠️ data-v-inspector 未注入，需检查 vite-plugin-vue-inspector 配置`)

  // 提供手动搜索建议
  const grepHint = text?.trim()?.substring(0, 30)
  if (grepHint) console.log(`   💡 grep -n "${grepHint}" src/ -r --include="*.vue"`)

  await browser.close()
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
