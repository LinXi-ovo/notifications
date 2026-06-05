新增 7 个文件
文件	说明
src/types/knowledge.js	JSDoc 类型、KnowledgeItem/UserKnowledgeState、localStorage 读写、分类常量
src/api/knowledge.js	Bmob KnowledgeItems 表 CRUD：getActiveItems、createItem、updateItem、deleteItem
src/stores/knowledge.js	Pinia store：拉取 → 过滤已读 → 队列 → 推送；markViewed/toggleFavorite/dismissToday/restoreCard
src/components/KnowledgeCard.vue	桌面端右下角浮动卡片，含 slide-up/down 动画、3 秒自动标记已读、必读模式、折叠 ? 按钮
src/components/KnowledgeInline.vue	移动端内联卡片（HomeView 列表顶部）
src/components/KnowledgeEditor.vue	编辑表单，复用 WgEditor，支持标题/内容/分类/优先级/来源/标签/启用开关
src/components/KnowledgeManager.vue	管理后台列表 + CRUD
修改 3 个文件
文件	改动
src/views/HomeView.vue	onMounted → checkAndPush() + 延迟展开卡片；渲染 KnowledgeInline（移动端）和 KnowledgeCard（桌面端）
src/views/AdminView.vue	新增「📚 资讯管理」tab，内嵌 KnowledgeManager
src/views/SettingsView.vue	新增两个开关：显示每日资讯 / 移动端显示
P2 增强全部内建
❤️ 收藏/取消（favoriteIds 跨天持久到 localStorage）
⏪ 浏览历史回看（全部已读后点 ? → 回看当天所有已读资讯）
🔴 priority=2 必读 → 黄色高亮、无关闭按钮
🔄 slide-up/down 进场/退场动画
🎉 「全部已读」提示 → 自动折叠成 ? 按钮