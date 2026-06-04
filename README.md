# 📢 通知聚合器

> 大学微信通知聚合器 —— 将分散在微信群中的通知集中到自己的网页来良好组织和展示。

## 功能

- 📰 **通知浏览**：按分类查看、搜索、筛选通知
- ✏️ **富文本编辑**：基于 Tiptap 的所见即所得编辑器，支持图文混排
- 🖼️ **内嵌媒体**：图片、音频、视频、PDF 可直接粘贴或拖入正文任意位置
- 🏷️ **自定义分类**：综测、保研、活动、课程、作业、其他… 可自由增删
- ⭐ **收藏**：标记关注的通知，集中查看
- 🔗 **原文链接**：保留微信公众号原文跳转
- 👥 **小范围分享**：登录后可见，管理员发布，同学浏览

## 技术栈

| 层 | 选型 |
|---|---|
| 构建工具 | Vite |
| 前端框架 | Vue 3 + Composition API |
| CSS | Tailwind CSS v4 |
| 富文本编辑器 | Tiptap |
| 数据层 | LeanCloud 国内版 (leancloud.cn) |
| 部署 | GitHub Pages + Gitee Pages |

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 环境变量

复制 `.env.example` 为 `.env`，填入你的 LeanCloud 配置：

```env
VITE_LC_APP_ID=your_app_id_here
VITE_LC_APP_KEY=your_app_key_here
VITE_LC_SERVER_URL=https://your-api.leancloud.cn
```

## 项目结构

```
src/
├── api/          # LeanCloud API 封装
├── components/   # Vue 组件（卡片、编辑器、导航…）
├── views/        # 页面视图（首页、详情、管理…）
├── router/       # 路由配置
├── stores/       # Pinia 状态管理
└── utils/        # 常量、工具函数
```

## 实施进度

见 [PLAN.md](PLAN.md)

---

## 附录：数据迁移方案

### 核心原则

通知内容存储为标准 HTML 文本，图片/音频/视频/PDF 的 URL 直接嵌入在 HTML 中，**不绑定任何平台**。任何时候需要迁移，都可以完整、无损地转移到新服务。

### 迁移步骤

```
① 从 LeanCloud 导出所有表为 JSON
   LeanCloud 控制台 → 数据存储 → 导出 → 全部表

② 下载所有媒体文件
   遍历 File 注册表（存储了所有文件名↔URL 的映射），逐个下载到本地

③ 将媒体文件上传到新服务
   可以是：阿里云 OSS、腾讯云 COS、自己的服务器、或其他 BaaS 服务

④ 批量替换 CDN 域名
   在导出的 JSON 中，把 leancloud.cn 的 CDN 域名全部替换为新域名
   纯文本替换即可，不需要解析 HTML：
   https://xxx.leancloud.cn/ → https://new-cdn.example.com/

⑤ 导入到新系统
   替换后的 JSON 直接导入新后端。

   ✅ 完成。数据无损，内容格式不变。
```

### FAQ

| 担忧 | 实际情况 |
|---|---|
| HTML 绑定 LeanCloud？ | ❌ HTML 里只是普通的 `<img src="...">`，域名随时可替换 |
| 媒体文件锁定？ | ❌ File 注册表记录了所有文件映射，下载+替换一步到位 |
| 需要特殊解析工具？ | ❌ 纯文本全局替换，VS Code 或 sed 一行命令搞定 |
| 数据格式私有？ | ❌ 导出的是标准 JSON + HTML，任何系统都能读 |
