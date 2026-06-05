# PLAN.md — 项目进度跟踪

> 📢 大学微信通知聚合器 · Vite + Vue 3 + wangEditor + Bmob

---

## 第六阶段：换掉 Tiptap → wangEditor 🔄

**现状**：Tiptap（ProseMirror）在项目中导致多个难以排查的 bug：
- 内容截断（schema 校验吞掉自定义 div）
- Toolbar 闪退（focus 敏感 + button type=submit）
- Mermaid 要写自定义 Node 节点，复杂度高
- 文档少，实例少，中文资料有限

**方案**：整体替换为 wangEditor V5
- 基于 HTML 内容模型，不认识的内容原样保留
- 原生中文，文档虽一般但够用
- 社区活跃，Vue 3 官方支持

### Phase 1：基础替换

**目标**：装包 → 新编辑器能跑起来 → 展示基本富文本功能

- [ ] 卸载 @tiptap/* 全家桶（需要 --legacy-peer-deps）
- [ ] 安装 @wangeditor/editor + @wangeditor/editor-for-vue@next
- [ ] 新建 `src/components/WgEditor.vue`（替代 RichEditor.vue）
- [ ] 基本工具栏 + 编辑器区域
- [ ] v-model 双向绑定（modelValue → update:modelValue）
- [ ] HTML 源码模式切换（与现有行为一致）
- [ ] 删除 `src/components/RichEditor/` 整个目录

### Phase 2：功能迁移

**目标**：所有现有功能在 wangEditor 上完整复现

- [ ] **图片上传** → wangEditor `customUpload` → 接腾讯云 COS（含压缩）
- [ ] **音频嵌入** → 自定义工具栏按钮 → 文件选择 → COS 上传 → 插 `<audio>`
- [ ] **视频嵌入** → wangEditor 内建 `insertVideo`（改用 COS 上传）
- [ ] **文件附件（PDF等）** → 自定义工具栏按钮 → COS 上传 → 插链接
- [ ] **Mermaid 流程图** → 自定义菜单（prompt 输代码）→ `dangerouslyInsertHtml()` 插 `<div data-mermaid="">`
- [ ] **粘贴自动识别 Mermaid** → `customPaste` 事件检测 + 自动插入
- [ ] **图片粘贴/拖入** → 自动上传 COS

### Phase 3：集成与清理

**目标**：整个项目引用更新，旧代码彻底删除

- [ ] 更新 `NotificationForm.vue` 改用 WgEditor
- [ ] 验证 `DetailView.vue` Mermaid 渲染不受影响
- [ ] 验证 `AiGenerator.vue` 填入编辑器功能正常
- [ ] 验证管理后台预览弹窗 Mermaid 渲染正常
- [ ] 全面手动测试（新建/编辑/浏览所有内容类型）
- [ ] 更新 PLAN.md 到新状态
- [ ] git commit

### 预计工时

| Phase | 内容 | 预估 |
|-------|------|------|
| Phase 1 | 基础替换 | 0.5 天 |
| Phase 2 | 功能迁移 | 1 天 |
| Phase 3 | 集成与测试 | 0.5 天 |
| **合计** | | **2 天** |

---

## 已完成的历史阶段

见 [plan/PLAN-past.md](plan/PLAN-past.md)
