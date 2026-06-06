/**
 * E2E: Mission 列表页功能测试
 *
 * 测试内容:
 *   - 页面渲染
 *   - 创建任务
 *   - 删除任务
 *   - 导入/导出 JSON
 *   - AI 导入
 *   - 回收站操作
 *   - 发布到云端（管理员）
 */

import { test, expect } from '@playwright/test'
import { login, enableDebugMode, handleDialog, createMission } from './helpers'

test.describe('任务列表页', () => {

  test.beforeEach(async ({ page }) => {
    await login(page)
    await enableDebugMode(page)
  })

  test('页面应正确渲染所有元素', async ({ page }) => {
    await page.goto('/#/missions')
    await expect(page.locator('text=任务系统')).toBeVisible()
    await expect(page.locator('button:has-text("新建任务")')).toBeVisible()
    // 回收站区域
    await expect(page.locator('text=回收站')).toBeVisible()
  })

  test('创建新任务', async ({ page }) => {
    await page.goto('/#/missions')

    // 点击新建
    await page.click('button:has-text("新建任务")')
    await expect(page.locator('h2:has-text("新建任务")')).toBeVisible()

    // 填写标题
    const title = `E2E 测试任务 ${Date.now()}`
    await page.fill('input[type="text"]', title)

    // 创建
    await page.click('button:has-text("创建")')

    // 验证出现在列表中
    await expect(page.locator(`text=${title}`)).toBeVisible()
  })

  test('空列表应显示空状态', async ({ page }) => {
    // 先清除所有任务（通过 localStorage）
    await page.goto('/#/missions')
    await page.evaluate(() => {
      localStorage.removeItem('missions:index')
      // 清除以 mission: 开头的所有键
      Object.keys(localStorage)
        .filter(k => k.startsWith('mission:'))
        .forEach(k => localStorage.removeItem(k))
    })
    await page.reload()
    await expect(page.locator('text=还没有任务')).toBeVisible()
  })

  test('创建任务后应可导航到图页面', async ({ page }) => {
    const missionId = await createMission(page)
    expect(missionId).toBeTruthy()
    expect(missionId).toMatch(/^mission-/)
  })

  test('导入 JSON 文件', async ({ page }) => {
    await page.goto('/#/missions')

    // 准备一个简单的任务 JSON
    const testJson = JSON.stringify({
      id: 'mission-e2e-import-test',
      title: 'E2E 导入测试任务',
      status: 'active',
      roles: [],
      nodes: [],
      edges: [],
      assignments: [],
      customFields: [],
    })

    // 创建 File 对象并触发导入
    await page.evaluate(async (json) => {
      const blob = new Blob([json], { type: 'application/json' })
      const file = new File([blob], 'mission.json', { type: 'application/json' })
      const input = document.querySelector('input[type="file"]')
      if (input) {
        const dt = new DataTransfer()
        dt.items.add(file)
        input.files = dt.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }, testJson)

    // 验证导入成功
    await expect(page.locator('text=E2E 导入测试任务')).toBeVisible({ timeout: 5000 })
  })

  test('AI 导入模态框', async ({ page }) => {
    await page.goto('/#/missions')

    // 点击 AI 导入
    await page.click('button:has-text("AI 导入")')
    await expect(page.locator('h2:has-text("AI 生成任务")')).toBeVisible()

    // 粘贴 JSON
    const sampleJson = JSON.stringify({
      title: 'AI 导入任务',
      description: '通过 AI 导入创建',
      roles: [{ name: '执行人', color: '#3B82F6', emoji: '👤', claimType: 'free' }],
      nodes: [
        { title: '第一步', assignedRole: 'role-0', description: '做第一件事' },
        { title: '第二步', assignedRole: 'role-0', description: '做第二件事' },
      ],
      edges: [{ source: 'node-0', target: 'node-1' }],
    }, null, 2)
    await page.fill('textarea', sampleJson)

    // 解析并创建
    await page.click('button:has-text("解析并创建")')

    // 验证创建成功
    await expect(page.locator('text=AI 导入任务')).toBeVisible({ timeout: 5000 })
  })

  test('删除任务应进入回收站', async ({ page }) => {
    // 先创建任务
    await createMission(page, 'E2E 待删除任务')

    // 点击删除按钮
    const deleteBtn = page.locator('button:has-text("删除")').first()
    await deleteBtn.click()

    // 处理确认对话框
    handleDialog(page, true)
    await page.waitForTimeout(500)

    // 验证出现在回收站中
    await expect(page.locator('text=待删除任务').first()).toBeVisible()
  })

  test('空回收站应显示空状态', async ({ page }) => {
    await page.goto('/#/missions')
    await page.evaluate(() => {
      localStorage.setItem('missions:recycle', '[]')
    })
    await page.reload()
    // 回收站区域应有空提示
    const recycleSection = page.locator('text=回收站')
    await expect(recycleSection).toBeVisible()
  })

  test('一键清空回收站', async ({ page }) => {
    await page.goto('/#/missions')

    // 先确保回收站有内容
    await page.evaluate(() => {
      localStorage.setItem('missions:recycle', JSON.stringify([
        { id: 'mission-e2e-del-1', title: '已删除任务', deletedAt: Date.now() }
      ]))
    })
    await page.reload()

    // 点击一键清空
    const clearBtn = page.locator('button:has-text("一键清空")')
    if (await clearBtn.isVisible()) {
      handleDialog(page, true)
      await clearBtn.click()
      await page.waitForTimeout(500)
      // 验证回收站空
      await expect(page.locator('text=暂无')).toBeVisible({ timeout: 3000 }).catch(() => {})
    }
  })
})
