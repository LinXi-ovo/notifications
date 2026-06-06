/**
 * Playwright E2E 测试辅助
 *
 * 提供登录、调试模式启用、任务创建等共享工具函数。
 */

import { expect } from '@playwright/test'

/** 测试用户凭据 */
export const TEST_USER = {
  username: 'admin',
  password: 'admin123',
}

/**
 * 使用用户名密码登录
 */
export async function login(page) {
  await page.goto('/#/login')
  await page.waitForSelector('h2:has-text("登录")')
  await page.fill('input[type="text"]', TEST_USER.username)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  // 等待登录完成，路由跳转到首页
  await page.waitForURL('**/')
  // 确认导航栏出现（登录成功标志）
  await page.waitForSelector('header')
}

/**
 * 开启调试模式（localStorage）
 */
export async function enableDebugMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('mermaid-debug', 'true')
  })
}

/**
 * 开启显示测试通知
 */
export async function enableTestNotifications(page) {
  await page.evaluate(() => {
    localStorage.setItem('show-test-notifications', 'true')
  })
}

/**
 * 从列表页创建一个新任务并返回任务 ID
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 * @returns {Promise<string>} 任务 ID
 */
export async function createMission(page, title = 'E2E 测试任务') {
  await page.goto('/#/missions')
  await page.waitForSelector('text=任务系统')

  // 点击新建任务
  await page.click('button:has-text("新建任务")')
  await page.waitForSelector('h2:has-text("新建任务")')

  // 填写标题
  await page.fill('input[type="text"]', title)

  // 点击创建
  await page.click('button:has-text("创建")')

  // 等待任务出现在列表中
  await page.waitForSelector(`text=${title}`)

  // 返回任务 ID（从 URL 中提取）
  const card = page.locator(`text=${title}`).first()
  const href = await card.getAttribute('href')
  const missionId = href?.split('/').pop() || ''
  return missionId
}

/**
 * 进入任务的图页面
 */
export async function goToMissionGraph(page, missionId) {
  await page.goto(`/#/mission/${missionId}`)
  await page.waitForSelector('text=编辑模式')
}

/**
 * 确认对话框（如果有）
 */
export async function confirmDialog(page) {
  try {
    // 等待可能出现的弹窗
    await page.waitForTimeout(300)
    // Vue ConfirmDialog 组件：查找确认按钮
    const confirmBtn = page.locator('button:has-text("确定"), button:has-text("确认")')
    if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await confirmBtn.click()
    }
  } catch { /* ignore */ }
}

/**
 * 等待并接受浏览器原生 confirm/prompt
 */
export function handleDialog(page, accept = true, text = '') {
  return page.on('dialog', (dialog) => {
    if (accept) {
      if (text) dialog.accept(text)
      else dialog.accept()
    } else {
      dialog.dismiss()
    }
  })
}
