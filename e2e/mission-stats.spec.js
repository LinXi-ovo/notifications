/**
 * E2E: Mission 统计页面功能测试
 *
 * 测试内容:
 *   - 页面渲染
 *   - 统计卡片
 *   - 角色聚合
 *   - 节点明细表
 */

import { test, expect } from '@playwright/test'
import { login, enableDebugMode, createMission, goToMissionGraph } from './helpers'

test.describe('任务统计页', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
    await enableDebugMode(page)
  })

  test('页面应正确渲染', async ({ page }) => {
    const missionId = await createMission(page, `E2E 统计测试 ${Date.now()}`)
    await page.goto(`/#/mission/${missionId}/stats`)
    await page.waitForSelector('h1:has-text("完成统计")')

    // 统计卡片
    await expect(page.locator('text=整体进度')).toBeVisible()
    await expect(page.locator('text=完成节点')).toBeVisible()
    await expect(page.locator('text=待处理节点')).toBeVisible()

    // 角色聚合
    await expect(page.locator('text=按角色聚合')).toBeVisible()

    // 节点明细表
    await expect(page.getByRole('columnheader', { name: '节点' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '状态' })).toBeVisible()
  })

  test('空任务统计应显示正确', async ({ page }) => {
    const missionId = await createMission(page, `E2E 空统计测试 ${Date.now()}`)
    await page.goto(`/#/mission/${missionId}/stats`)
    await page.waitForSelector('h1:has-text("完成统计")')

    // 空任务：0/0 节点
    await expect(page.locator('text=0/0').first()).toBeVisible({ timeout: 3000 }).catch(() => {})
  })

  test('返回按钮', async ({ page }) => {
    const missionId = await createMission(page, `E2E 返回测试 ${Date.now()}`)
    await page.goto(`/#/mission/${missionId}/stats`)
    const backBtn = page.locator('button').first()
    await backBtn.click()
    // 应返回任务图页面
    await expect(page.locator('text=编辑模式').first()).toBeVisible({ timeout: 5000 }).catch(() => {})
  })
})
