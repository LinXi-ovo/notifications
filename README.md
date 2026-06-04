# 📢 通知聚合器

> 大学微信通知聚合器 —— 将分散在微信群中的通知集中到自己的网页来良好组织和展示。

---

**🔗 在线地址**：[notifications-3kx.pages.dev](https://notifications-3kx.pages.dev)（Cloudflare Pages，主力）
**🔗 备用地址**：[linxi-ovo.github.io/notifications](https://linxi-ovo.github.io/notifications/)（GitHub Pages）
**🔗 Gitee 镜像**：暂未开通（需实名认证，可选）

---

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
| 数据层 | Bmob 后端云 (bmob.cn) |
| 部署 | Cloudflare Pages（主力）+ GitHub Pages（备用） |

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

复制 `.env.example` 为 `.env`，填入你的 Bmob 配置：

```env
VITE_BMOB_SECRET_KEY=your_secret_key_here
VITE_BMOB_API_SAFE_CODE=your_api_safe_code_here
```

## 文件存储策略

### 当前方案：Base64 内嵌（临时）

因 Bmob 文件服务要求绑定已备案超过 10 天的域名（用户暂无备案域名），现阶段采用 Base64 方案：

- 图片、音频等小文件通过 `FileReader.readAsDataURL()` 转为 Base64 字符串
- Base64 数据直接嵌入 Tiptap 内容的 `<img>` 或 `<audio>` / `<video>` 标签中
- 随通知内容一起存入 Bmob 数据库，导出迁移时一并带走

**限制**：
- 单张图片建议 1MB 以内（截图、海报级别够用）
- 不适合存视频（但通知几乎不会直接发视频）
- 数据库存储量会变大（Base64 比二进制大约 30%）

> ✅ 零成本、零配置、零额外服务。上线后可立即使用编辑器上传图片。

### 升级方案：腾讯云 COS（未来）

当需要上传大文件或视频时，切换到腾讯云对象存储：

| 对比 | Base64（当前） | 腾讯云 COS（升级） |
|---|---|---|
| 配置成本 | 零 | 需注册 + 配置跨域 |
| 单文件上限 | ~1MB 为宜 | 5GB |
| 支持视频 | ❌ 不适用 | ✅ |
| 迁移复杂度 | 零（数据全在 DB） | 需迁移文件 + 替换 URL |
| 费用 | 零 | 50GB 免费额度/月 |

**升级路径**：只需要修改 `RichEditor.vue` 中的 `doUpload` 函数——把 `FileReader` 换成 COS 的 `putObject`，编辑器其余代码不需要动。

### 为什么纯前端也能上传文件？

所有上传操作在浏览器端完成：
- **Base64 方案**：`FileReader` 读取 → 生成 data: URI → 插入编辑器 HTML
- **COS 方案**：腾讯云 JS SDK 直传到 COS 存储桶（前端直传，不走我们的服务器）
- 两种都不需要自建后端

## 部署架构

```
┌─ 推送 main 分支 ─────────────────────────────┐
│                                               │
│  GitHub                                       │
│  └─ GitHub Actions（自动构建）                  │
│     ├─ Cloudflare Pages（主力，国内访问快）      │
│     ├─ GitHub Pages（备用）                    │
│     └─ Gitee（镜像，需实名认证 → 可选）     │
│                                               │
│  同学直接访问 Cloudflare Pages 链接即可         │
└───────────────────────────────────────────────┘
```

### GitHub Secrets 配置

部署需要以下 GitHub Secrets（已配好，无需重复操作）：

| Secret | 说明 |
|---|---|
| `BMOB_SECRET_KEY` | Bmob 后端云密钥 |
| `BMOB_API_SAFE_CODE` | Bmob API 安全码 |
| `CF_API_TOKEN` | Cloudflare API 令牌 |

## 项目结构

```
src/
├── api/          # Bmob API 封装
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
① 从 Bmob 导出所有表为 JSON
   Bmob 控制台 → 数据表 → 导出

② 下载所有媒体文件
   遍历 File 注册表（存储了所有文件名↔URL 的映射），逐个下载到本地

③ 将媒体文件上传到新服务
   可以是：阿里云 OSS、腾讯云 COS、自己的服务器、或其他 BaaS 服务

④ 批量替换 CDN 域名
   在导出的 JSON 中，把 Bmob 的 CDN 域名全部替换为新域名
   纯文本替换即可，不需要解析 HTML：
   https://bmob-cdn.com/ → https://new-cdn.example.com/

⑤ 导入到新系统
   替换后的 JSON 直接导入新后端。

   ✅ 完成。数据无损，内容格式不变。
```

### FAQ

| 担忧 | 实际情况 |
|---|---|
| HTML 绑定 Bmob？ | ❌ HTML 里只是普通的 `<img src="...">`，域名随时可替换 |
| 媒体文件锁定？ | ❌ File 注册表记录了所有文件映射，下载+替换一步到位 |
| 需要特殊解析工具？ | ❌ 纯文本全局替换，VS Code 或 sed 一行命令搞定 |
| 数据格式私有？ | ❌ 导出的是标准 JSON + HTML，任何系统都能读 |
