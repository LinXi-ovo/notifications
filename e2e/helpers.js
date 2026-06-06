/**
 * Playwright E2E 测试辅助
 *
 * 提供登录、调试模式启用、任务创建等共享工具函数。
 */



/** 测试用户凭据 */
export const TEST_USER = {
  username: 'e2e_test_admin',
  password: 'E2eTest@2026',
  email: 'e2e@test.local',
}

/**
 * 登录（先尝试登录，失败则注册后再登录）
 */
export async function login(page) {
  await page.goto('/#/login')
  await page.waitForSelector('h2')

  // 填写登录表单
  await page.fill('input[type="text"]', TEST_USER.username)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // 等几秒看是否跳转
  try {
    await page.waitForURL('**/', { timeout: 8000 })
    await page.waitForSelector('header', { timeout: 3000 })
    return // 登录成功
  } catch {
    // 登录失败，需要先注册
  }

  // 切换到注册
  await page.click('button:has-text("去注册")')
  await page.waitForSelector('h2:has-text("注册")')
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="text"]', TEST_USER.username)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // 注册后等待处理完成（注册完成不会自动跳转，需要重新登录）
  await page.waitForTimeout(3000)

  // 重新登录
  const stillRegister = await page.locator('h2:has-text("注册")').isVisible().catch(() => false)
  if (stillRegister) {
    // 切换到登录
    await page.click('button:has-text("去登录")')
    await page.waitForSelector('h2:has-text("登录")')
  }
  // 确保是登录表单
  await page.fill('input[type="text"]', TEST_USER.username)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // 等待跳转首页
  await page.waitForURL('**/', { timeout: 10000 })
  await page.waitForSelector('header', { timeout: 3000 })
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
  // 任务卡片是 div@click，不是 <a>，所以从 localStorage 读 ID
  await page.waitForSelector(`text=${title}`, { timeout: 5000 })
  const missionId = await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('missions:index') || '[]')
    if (index.length > 0) return index[index.length - 1].id
    return ''
  })
  return missionId
}

/**
 * 进入任务的图页面并切换到编辑模式
 * 测试环境禁用 Bmob 同步加速加载（纯 localStorage）
 */
export async function goToMissionGraph(page, missionId) {
  await page.evaluate(() => {
    localStorage.setItem('missions:migrated', 'false')
  })
  await page.goto(`/#/mission/${missionId}`)
  // 页面默认在「执行模式」，大多数测试需要编辑模式 → 切换
  await page.waitForSelector('text=执行模式', { timeout: 15000 })
  await page.click('text=执行模式')
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
