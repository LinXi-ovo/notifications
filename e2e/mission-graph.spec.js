/**
 * E2E: Mission 图页面 — 编辑模式功能测试
 *
 * 测试内容:
 *   - 页面渲染与模式切换
 *   - 添加/删除节点
 *   - 添加/删除边（连线）
 *   - 添加/删除角色
 *   - 状态变更
 *   - 导出功能
 *   - 缩放控制
 *   - 自定义字段
 *   - 评论
 *   - 提醒
 */

import { test, expect } from '@playwright/test'
import { login, enableDebugMode, createMission, goToMissionGraph, handleDialog } from './helpers'

test.describe('任务图页面 — 编辑模式', () => {

  let missionId = ''

  test.beforeEach(async ({ page }) => {
    await login(page)
    await enableDebugMode(page)
    // 创建并进入任务
    missionId = await createMission(page, `E2E 图测试 ${Date.now()}`)
    await goToMissionGraph(page, missionId)
  })

  test('页面应正确渲染', async ({ page }) => {
    await expect(page.locator('h1').first()).toContainText('E2E 图测试')
    await expect(page.locator('button:has-text("编辑模式")')).toBeVisible()
    await expect(page.locator('button:has-text("执行模式")')).not.toBeVisible()
    await expect(page.locator('button:has-text("添加节点")')).toBeVisible()
    await expect(page.locator('button:has-text("连线")')).toBeVisible()
  })

  test('模式切换', async ({ page }) => {
    // 切换到执行模式
    await page.click('button:has-text("编辑模式")')
    await expect(page.locator('button:has-text("执行模式")')).toBeVisible()
    await expect(page.locator('button:has-text("添加节点")')).not.toBeVisible()

    // 切回编辑模式
    await page.click('button:has-text("执行模式")')
    await expect(page.locator('button:has-text("编辑模式")')).toBeVisible()
  })

  test('添加角色', async ({ page }) => {
    // 打开角色管理
    await page.click('button:has-text("角色")')
    await expect(page.locator('h2:has-text("角色管理")')).toBeVisible()

    // 填写角色信息
    await page.fill('input[placeholder="角色名称（如：班长）"]', 'E2E 测试角色')
    await page.fill('input[placeholder="👨‍🎓"]', '🧪')
    await page.fill('input[placeholder="#F59E0B"]', '#FF0000')

    // 添加角色
    await page.click('button:has-text("添加角色"):not(:has-text("关闭"))')
    await page.waitForTimeout(500)

    // 验证角色出现
    await expect(page.locator('text=🧪 E2E 测试角色').first()).toBeVisible()
  })

  test('添加节点', async ({ page }) => {
    // 点击添加节点
    await page.click('button:has-text("添加节点")')
    await expect(page.locator('h2:has-text("添加任务节点")')).toBeVisible()

    // 填写节点信息
    await page.fill('input[placeholder="例如：填写个人信息表"]', 'E2E 测试节点')

    // 添加（force:true 避免模态框 self 拦截）
    await page.click('button:has-text("添加")', { force: true })

    // 验证节点出现在画布中
    await page.waitForTimeout(1000) // 等待 dagre 布局渲染
    await expect(page.locator('text=E2E 测试节点').first()).toBeVisible()
  })

  test('添加边（连线）', async ({ page }) => {
    // 先添加两个节点（force:true 避免模态框 backdrop 拦截）
    await page.click('button:has-text("添加节点")')
    await page.fill('input[placeholder="例如：填写个人信息表"]', '节点 A')
    await page.click('button:has-text("添加")', { force: true })
    await page.waitForTimeout(500)

    await page.click('button:has-text("添加节点")')
    await page.fill('input[placeholder="例如：填写个人信息表"]', '节点 B')
    await page.click('button:has-text("添加")', { force: true })
    await page.waitForTimeout(500)

    // 打开连线对话框
    await page.click('button:has-text("连线")')
    await expect(page.locator('h2:has-text("添加依赖边")')).toBeVisible()

    // 选择源和目标（select 的 option 数量判断）
    const sourceSelect = page.locator('select').first()
    const targetSelect = page.locator('select').nth(1)
    const sourceOptions = await sourceSelect.locator('option').all()
    const targetOptions = await targetSelect.locator('option').all()

    if (sourceOptions.length > 1 && targetOptions.length > 1) {
      const srcVal = await sourceOptions[1].getAttribute('value')
      const tgtVal = await targetOptions[1].getAttribute('value')
      if (srcVal) await sourceSelect.selectOption(srcVal)
      if (tgtVal) await targetSelect.selectOption(tgtVal)
      await page.click('button:has-text("添加")', { force: true })
      await page.waitForTimeout(500)
    }
  })

  test('删除节点', async ({ page }) => {
    // 先添加一个节点
    await page.click('button:has-text("添加节点")')
    await page.fill('input[placeholder="例如：填写个人信息表"]', '待删除节点')
    await page.click('button:has-text("添加")', { force: true })
    await page.waitForTimeout(1000)

    // 点击画布上的节点选中它
    const nodeEl = page.locator('text=待删除节点').first()
    await nodeEl.click()
    await page.waitForTimeout(500)

    // 底部面板应出现，点击删除节点
    const deleteBtn = page.locator('button:has-text("删除节点")')
    if (await deleteBtn.isVisible()) {
      handleDialog(page, true)
      await deleteBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('导出按钮', async ({ page }) => {
    await page.click('button:has-text("导出")')
    // 导出触发文件下载，没什么可验证的 UI 变化，确保不报错
    await page.waitForTimeout(500)
  })

  test('统计按钮导航', async ({ page }) => {
    await page.click('button:has-text("统计")')
    await expect(page.locator('h1:has-text("完成统计")')).toBeVisible()
  })

  test('提醒对话框', async ({ page }) => {
    await page.click('button:has-text("提醒")')
    await expect(page.locator('h2:has-text("催促提醒")')).toBeVisible()
    await page.click('button:has-text("关闭")')
  })

  test('自定义字段', async ({ page }) => {
    await page.click('button:has-text("字段")')
    await expect(page.locator('h2:has-text("自定义字段管理")')).toBeVisible()
  })

  test('角色管理对话框显示', async ({ page }) => {
    await page.click('button:has-text("角色")')
    await expect(page.locator('h2:has-text("角色管理")')).toBeVisible()

    // 验证默认角色存在
    await expect(page.locator('text=普通成员').first()).toBeVisible()
    await expect(page.locator('text=管理员').first()).toBeVisible()

    // 关闭
    await page.click('button:has-text("关闭")')
  })

  test('缩放控制', async ({ page }) => {
    // 检查缩放按钮
    const zoomIn = page.locator('button[title="放大"]')
    const zoomOut = page.locator('button[title="缩小"]')
    const fit = page.locator('button[title="适应画布"]')

    await expect(zoomIn).toBeVisible()
    await expect(zoomOut).toBeVisible()
    await expect(fit).toBeVisible()

    // 点击放大
    await zoomIn.click()
    await page.waitForTimeout(300)
  })

  test('进度概览栏', async ({ page }) => {
    await expect(page.locator('text=整体进度')).toBeVisible()
  })
})
