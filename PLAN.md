# PLAN.md — 项目进度跟踪

> 📢 大学微信通知聚合器 · Vite + Vue 3 + Tiptap + Bmob

---

## 第一阶段：项目基础搭建 🏗️

**目标**：项目骨架搭好，能跑起来

- [x] `npm create vite` 初始化 Vue 3 项目
- [x] 安装全部依赖（Tailwind, Vue Router, Pinia, hydrogen-js-sdk, Tiptap）
- [x] 配置 Tailwind + Vite
- [x] 创建完整目录结构 + 组件骨架
- [x] 写 API 层（Bmob 封装：查询/用户/文件）
- [x] 创建 `.env.example` + `src/api/bmob.js`
- [x] 写 README.md（含数据迁移方案附录）
- [x] git init + 首次 commit
- [x] 将后端从 LeanCloud 切换为 Bmob
- [x] 注册 Bmob 应用，获取 Secret Key + API 安全码
- [x] 在 Bmob 创建数据表 + 初始分类数据
- [ ] 配置 GitHub Actions deploy.yml

---

## 第二阶段：核心浏览功能 👀

**目标**：用户能看到通知列表、筛选、搜索、详情

- [x] 路由系统（HomeView / DetailView / LoginView / AdminView / FavoritesView）
- [x] CategoryNav 从 Bmob 动态加载分类
- [x] SearchBar 搜索（300ms 防抖）
- [x] NotificationCard 组件（优先级样式、分类图标）
- [x] NotificationList 列表（排序、分页、加载/空状态）
- [x] NotificationDetail 详情页（HTML 渲染、原文链接）
- [ ] 图片点击放大（lightbox）
- [ ] 音频内嵌播放器
- [ ] 视频内嵌播放器
- [ ] PDF/Office 内嵌预览或下载

---

## 第三阶段：管理功能 ✏️

**目标**：管理员能登录、写通知、管理分类

- [x] 登录系统（LoginForm + 注册/登录切换）
- [x] NotificationForm（含分类/优先级/标签等分层展开字段）
- [x] AdminView 管理后台（列表 + 新建 + 编辑 + 删除）
- [ ] 数据导出（HTML / JSON）
- [ ] 路由守卫（限制未登录访问）
- [ ] CategoryManagerView 分类管理
- [x] Tiptap 富文本编辑器（工具栏 + 图片粘贴/拖入上传 + HTML 源码切换）

---

## 第四阶段：收藏与分享 ⭐

**目标**：用户能收藏通知，部署上线让大家用

- [ ] Favorite 收藏功能（表 + API + 按钮 + 收藏页）
- [ ] ACL 权限精细化配置
- [ ] localStorage 缓存加速
- [ ] Gitee Pages 双推部署
- [ ] GitHub Pages 正式部署

---

## 第五阶段：Todo 待办（可选）✅

**目标**：通知可以关联待办清单，用户打钩跟踪

- [ ] Todo 数据模型 + API
- [ ] TodoProgress 用户完成进度
- [ ] 管理员添加 Todo 项
- [ ] 用户打钩/取消

---

## 当前状态

**当前阶段**：第三阶段（进行中）
**完成度**：65%
**最新更新**：2026-06-04 — 登录 + 管理后台完成，下一步做 Tiptap 编辑器
**备注**：初始分类 [综测, 保研, 活动, 课程, 作业, 其他]，Bmob 连接正常
