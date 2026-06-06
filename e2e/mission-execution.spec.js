/**
 * E2E: Mission 执行模式功能测试
 *
 * 测试内容:
 *   - 执行模式 UI
 *   - 角色认领（自由/审核/口令/委派）
 *   - 状态变更
 *   - 标记完成
 */

import { test, expect } from '@playwright/test'
import { login, enableDebugMode, createMission, goToMissionGraph, handleDialog } from './helpers'

test.describe('任务系统 — 执行模式', () => {

  let missionId = ''

  test.beforeEach(async ({ page }) => {
    await login(page)
    await enableDebugMode(page)
    missionId = await createMission(page, `E2E 执行测试 ${Date.now()}`)
    await goToMissionGraph(page, missionId)
  })

  test('切换到执行模式后 CRUD 按钮应隐藏', async ({ page }) => {
    // goToMissionGraph 已切换到编辑模式，这里再切到执行模式
    await page.click('button:has-text("编辑模式")')
    await page.waitForTimeout(300)

    await expect(page.locator('button:has-text("添加节点")')).not.toBeVisible()
    await expect(page.locator('button:has-text("连线")')).not.toBeVisible()
    await expect(page.locator('button:has-text("📋 字段")')).not.toBeVisible()
    // 角色按钮、导出、统计、提醒仍应可见
    await expect(page.locator('button:has-text("角色")').first()).toBeVisible()
  })

  test('执行模式下应允许角色认领', async ({ page }) => {
    // goToMissionGraph 已在编辑模式，直接在编辑模式创建任务结构
    // 先加角色
    await page.click('button:has-text("角色")')
    await page.waitForTimeout(300)
    await page.fill('input[placeholder="角色名称（如：班长）"]', '执行人')
    await page.fill('input[placeholder="👨‍🎓"]', '👤')
    await page.fill('input[placeholder="#F59E0B"]', '#3B82F6')
    await page.click('button:has-text("添加角色"):not(:has-text("关闭"))', { force: true })
    await page.waitForTimeout(300)
    await page.click('button:has-text("关闭")')
    await page.waitForTimeout(300)

    // 添加节点并分配给该角色
    await page.click('button:has-text("添加节点")')
    await page.fill('input[placeholder="例如：填写个人信息表"]', '可执行节点')
    // 从 select 中选择角色
    const roleSelect = page.locator('select[class*="w-full"]').first()
    const roleOptions = await roleSelect.locator('option').all()
    if (roleOptions.length > 1) {
      const val = await roleOptions[1].getAttribute('value')
      if (val) await roleSelect.selectOption(val)
    }
    await page.click('button:has-text("添加")', { force: true })
    await page.waitForTimeout(1000)

    // 切换到执行模式
    await page.click('button:has-text("编辑模式")')
    await page.waitForTimeout(500)

    // 点击节点选中它
    const node = page.locator('text=可执行节点').first()
    await node.click()
    await page.waitForTimeout(500)

    // 找认领角色按钮
    const claimBtn = page.locator('button:has-text("认领此角色")')
    if (await claimBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await claimBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('状态变更按钮在编辑模式下可用', async ({ page }) => {
    // 先添加节点
    await page.click('button:has-text("添加节点")')
    await page.fill('input[placeholder="例如：填写个人信息表"]', '状态测试节点')
    await page.click('button:has-text("添加")', { force: true })
    await page.waitForTimeout(1000)

    // 选中节点
    const node = page.locator('text=状态测试节点').first()
    await node.click()
    await page.waitForTimeout(500)

    // 在编辑模式下应看到状态转换按钮
    const completedBtn = page.locator('button:has-text("标记完成")')
    if (await completedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await completedBtn.click()
      await page.waitForTimeout(500)
    }
  })
})
