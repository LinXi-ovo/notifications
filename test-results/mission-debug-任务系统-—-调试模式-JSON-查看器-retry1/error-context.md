# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mission-debug.spec.js >> 任务系统 — 调试模式 >> JSON 查看器
- Location: e2e\mission-debug.spec.js:57:3

# Error details

```
Test timeout of 15000ms exceeded.
```

```
Error: locator.click: Test timeout of 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("JSON")')
    - locator resolved to <button disabled class="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 transition-colors"> 📄 JSON </button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    26 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "📢 通知聚合" [ref=e6] [cursor=pointer]:
        - /url: "#/"
        - generic [ref=e7]: 📢
        - heading "通知聚合" [level=1] [ref=e8]
      - generic [ref=e9]:
        - link "⭐ 收藏" [ref=e10] [cursor=pointer]:
          - /url: "#/favorites"
        - link "📚 资讯" [ref=e11] [cursor=pointer]:
          - /url: "#/"
        - link "📋 任务" [ref=e12] [cursor=pointer]:
          - /url: "#/missions"
        - link "⚙️ 设置" [ref=e13] [cursor=pointer]:
          - /url: "#/settings"
        - link "ℹ️ 关于" [ref=e14] [cursor=pointer]:
          - /url: "#/about"
        - generic [ref=e15]: "|"
        - generic [ref=e16]: e2e_test_admin
        - button "退出" [ref=e17] [cursor=pointer]
  - generic [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - button "返回任务列表" [ref=e21]:
          - img [ref=e22]
        - heading "E2E 调试测试 1780721688462" [level=1] [ref=e24]
        - generic [ref=e25]: ⬜ 未开始
        - generic "点击手动同步" [ref=e26] [cursor=pointer]: ☁️
      - generic [ref=e27]:
        - button "📝 编辑模式" [active] [ref=e28]
        - button "👥 角色" [ref=e29]
        - button "↔️ 连线" [ref=e30]
        - button "＋ 添加节点" [ref=e31]
        - button "📋 字段" [ref=e32]
        - button "📥 导出" [ref=e33]
        - button "📊 统计" [ref=e34]
        - button "⏰ 提醒" [ref=e35]
    - generic [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]: "整体进度:"
        - generic [ref=e42]: 0%
        - generic [ref=e43]: 0/0
      - generic [ref=e44]:
        - generic [ref=e45]: 🟢 普通成员
        - generic [ref=e46]: 🔴 管理员
    - generic [ref=e47]:
      - generic [ref=e48]: 🧪 调试
      - generic [ref=e49]: "|"
      - generic [ref=e50]: 📋 流程
      - button "➕ 班级材料提交" [ref=e51]
      - button "➕ 评奖评优" [ref=e52]
      - button "➕ 采购审批流" [ref=e53]
      - button "➕ 权限完整版·班级提交" [ref=e54]
      - button "➕ 单人测试" [ref=e55]
      - button "➕ 多人测试" [ref=e56]
      - generic [ref=e57]: "|"
      - generic [ref=e58]: 🔐 权限
      - button "➕ 全部 4 种认领策略" [ref=e59]
      - button "➕ 角色权限差异" [ref=e60]
      - button "➕ 字段可见性" [ref=e61]
      - button "➕ 待审批测试" [ref=e62]
      - generic [ref=e63]: "|"
      - generic "关闭后 admin 用户也会受角色权限限制" [ref=e64] [cursor=pointer]:
        - generic [ref=e65]: 👑
        - generic [ref=e66]: 绕过
      - generic [ref=e69]: "|"
      - button "🔍 权限诊断" [ref=e70]
      - button "📄 JSON" [disabled] [ref=e71]
    - generic [ref=e72]:
      - generic [ref=e73]:
        - heading "📊 角色统计" [level=3] [ref=e74]
        - generic [ref=e75]:
          - generic [ref=e76]: 🟢 普通成员
          - generic [ref=e77]: "已认领: 0 人"
          - generic [ref=e78]: "已完成: 0/0"
        - generic [ref=e79]:
          - generic [ref=e80]: 🔴 管理员
          - generic [ref=e81]: "已认领: 0 人"
          - generic [ref=e82]: "已完成: 0/0"
        - heading "图例" [level=3] [ref=e83]
        - generic [ref=e84]:
          - paragraph [ref=e85]: 🟢 可操作
          - paragraph [ref=e86]: 🔒 锁定
          - paragraph [ref=e87]: 🔽 子任务
      - generic [ref=e88]:
        - generic [ref=e90]:
          - img [ref=e91]
          - generic [ref=e93]:
            - paragraph [ref=e94]: 📋
            - paragraph [ref=e95]: 暂无节点，请先添加任务节点
        - generic [ref=e97]:
          - button "缩小" [ref=e98]:
            - img [ref=e99]
          - generic [ref=e100]: 100%
          - button "放大" [ref=e101]:
            - img [ref=e102]
          - button "适应画布" [ref=e105]:
            - img [ref=e106]
        - generic:
          - generic:
            - paragraph: 🗺️
            - paragraph: 点击右上角"添加节点"开始构建任务图
```

# Test source

```ts
  1  | /**
  2  |  * E2E: Mission 调试模式功能测试
  3  |  *
  4  |  * 测试内容:
  5  |  *   - 调试工具栏渲染
  6  |  *   - 流程预设加载
  7  |  *   - 权限预设加载
  8  |  *   - JSON 查看器
  9  |  *   - 权限诊断
  10 |  *   - adminBypass 开关
  11 |  */
  12 | 
  13 | import { test, expect } from '@playwright/test'
  14 | import { login, enableDebugMode, createMission, goToMissionGraph } from './helpers'
  15 | 
  16 | test.describe('任务系统 — 调试模式', () => {
  17 | 
  18 |   let missionId = ''
  19 | 
  20 |   test.beforeEach(async ({ page }) => {
  21 |     await login(page)
  22 |     await enableDebugMode(page)
  23 |     missionId = await createMission(page, `E2E 调试测试 ${Date.now()}`)
  24 |     await goToMissionGraph(page, missionId)
  25 |   })
  26 | 
  27 |   test('调试工具栏应显示', async ({ page }) => {
  28 |     await expect(page.locator('text=🧪 调试').first()).toBeVisible()
  29 |     await expect(page.locator('text=流程').first()).toBeVisible()
  30 |     await expect(page.locator('text=权限').first()).toBeVisible()
  31 |   })
  32 | 
  33 |   test('加载流程预设', async ({ page }) => {
  34 |     // 点击第一个流程预设
  35 |     const presetBtns = page.locator('button:has-text("➕")')
  36 |     const count = await presetBtns.count()
  37 |     expect(count).toBeGreaterThan(0)
  38 | 
  39 |     // 点击"单人测试"预设
  40 |     const singleTest = page.locator('button:has-text("单人测试")')
  41 |     if (await singleTest.isVisible()) {
  42 |       await singleTest.click()
  43 |       await page.waitForTimeout(1500)
  44 |       // 加载预设后应有节点
  45 |       await page.waitForSelector('text=填写个人信息表', { timeout: 5000 })
  46 |     }
  47 |   })
  48 | 
  49 |   test('加载权限预设', async ({ page }) => {
  50 |     const claimTypes = page.locator('button:has-text("全部 4 种认领策略")')
  51 |     if (await claimTypes.isVisible()) {
  52 |       await claimTypes.click()
  53 |       await page.waitForTimeout(1000)
  54 |     }
  55 |   })
  56 | 
  57 |   test('JSON 查看器', async ({ page }) => {
  58 |     const jsonBtn = page.locator('button:has-text("JSON")')
  59 |     await expect(jsonBtn).toBeVisible()
> 60 |     await jsonBtn.click()
     |                   ^ Error: locator.click: Test timeout of 15000ms exceeded.
  61 |     await expect(page.locator('h2:has-text("Mission JSON")')).toBeVisible()
  62 | 
  63 |     // 验证有内容
  64 |     const jsonContent = page.locator('pre code')
  65 |     await expect(jsonContent).toBeVisible()
  66 | 
  67 |     // 复制按钮
  68 |     await expect(page.locator('button:has-text("复制")')).toBeVisible()
  69 |     // 下载按钮
  70 |     await expect(page.locator('button:has-text("下载")')).toBeVisible()
  71 |   })
  72 | 
  73 |   test('权限诊断', async ({ page }) => {
  74 |     const diagBtn = page.locator('button:has-text("权限诊断")')
  75 |     await expect(diagBtn).toBeVisible()
  76 |     await diagBtn.click()
  77 |     await expect(page.locator('h2:has-text("权限诊断")')).toBeVisible()
  78 | 
  79 |     // 验证诊断表格
  80 |     await expect(page.locator('text=当前用户')).toBeVisible()
  81 |     await expect(page.locator('text=已认领角色')).toBeVisible()
  82 | 
  83 |     // 关闭
  84 |     await page.click('button:has-text("关闭")')
  85 |   })
  86 | 
  87 |   test('adminBypass 开关', async ({ page }) => {
  88 |     const bypassToggle = page.locator('text=绕过')
  89 |     await expect(bypassToggle).toBeVisible()
  90 |   })
  91 | 
  92 |   test('调试模式不影响非调试功能', async ({ page }) => {
  93 |     // 调试模式下基本操作仍然正常
  94 |     await expect(page.locator('button:has-text("添加节点")')).toBeVisible()
  95 |     await expect(page.locator('button:has-text("👥 角色")')).toBeVisible()
  96 |   })
  97 | })
  98 | 
```