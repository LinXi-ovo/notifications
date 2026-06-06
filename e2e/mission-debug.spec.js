/**
 * E2E: Mission 调试模式功能测试
 *
 * 测试内容:
 *   - 调试工具栏渲染
 *   - 流程预设加载
 *   - 权限预设加载
 *   - JSON 查看器
 *   - 权限诊断
 *   - adminBypass 开关
 */

import { test, expect } from '@playwright/test'
import { login, enableDebugMode, createMission, goToMissionGraph } from './helpers'

test.describe('任务系统 — 调试模式', () => {

  let missionId = ''

  test.beforeEach(async ({ page }) => {
    await login(page)
    await enableDebugMode(page)
    missionId = await createMission(page, `E2E 调试测试 ${Date.now()}`)
    await goToMissionGraph(page, missionId)
  })

  test('调试工具栏应显示', async ({ page }) => {
    await expect(page.locator('text=🧪 调试').first()).toBeVisible()
    await expect(page.locator('text=流程').first()).toBeVisible()
    await expect(page.locator('text=权限').first()).toBeVisible()
  })

  test('加载流程预设', async ({ page }) => {
    // 点击第一个流程预设
    const presetBtns = page.locator('button:has-text("➕")')
    const count = await presetBtns.count()
    expect(count).toBeGreaterThan(0)

    // 点击"单人测试"预设
    const singleTest = page.locator('button:has-text("单人测试")')
    if (await singleTest.isVisible()) {
      await singleTest.click()
      await page.waitForTimeout(1000)
      // 加载预设后应有节点
      await expect(page.locator('text=填写个人信息').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('加载权限预设', async ({ page }) => {
    const claimTypes = page.locator('button:has-text("全部 4 种认领策略")')
    if (await claimTypes.isVisible()) {
      await claimTypes.click()
      await page.waitForTimeout(1000)
    }
  })

  test('JSON 查看器', async ({ page }) => {
    const jsonBtn = page.locator('button:has-text("JSON")')
    await expect(jsonBtn).toBeVisible()
    await jsonBtn.click()
    await expect(page.locator('h2:has-text("Mission JSON")')).toBeVisible()

    // 验证有内容
    const jsonContent = page.locator('pre code')
    await expect(jsonContent).toBeVisible()

    // 复制按钮
    await expect(page.locator('button:has-text("复制")')).toBeVisible()
    // 下载按钮
    await expect(page.locator('button:has-text("下载")')).toBeVisible()
  })

  test('权限诊断', async ({ page }) => {
    const diagBtn = page.locator('button:has-text("权限诊断")')
    await expect(diagBtn).toBeVisible()
    await diagBtn.click()
    await expect(page.locator('h2:has-text("权限诊断")')).toBeVisible()

    // 验证诊断表格
    await expect(page.locator('text=当前用户')).toBeVisible()
    await expect(page.locator('text=已认领角色')).toBeVisible()

    // 关闭
    await page.click('button:has-text("关闭")')
  })

  test('adminBypass 开关', async ({ page }) => {
    const bypassToggle = page.locator('text=绕过')
    await expect(bypassToggle).toBeVisible()
  })

  test('调试模式不影响非调试功能', async ({ page }) => {
    // 调试模式下基本操作仍然正常
    await expect(page.locator('button:has-text("添加节点")')).toBeVisible()
    await expect(page.locator('button:has-text("角色")')).toBeVisible()
  })
})
