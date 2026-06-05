/**
 * @typedef {Object} KnowledgeItem
 * @property {string} objectId - Bmob objectId（兼容 Bmob 标准字段）
 * @property {string} title - 资讯标题（一句话）
 * @property {string} content - 资讯正文 HTML
 * @property {'tip'|'fact'|'news'|'quote'|'rule'} category - 分类
 * @property {string} source - 来源标注
 * @property {0|1|2} priority - 0=普通 1=置顶 2=必读
 * @property {string[]} tags - 标签
 * @property {boolean} isActive - 启用开关
 * @property {string} [coverImage] - 可选封面图 URL
 * @property {string} createdAt - Bmob 自动写入
 * @property {string} updatedAt - Bmob 自动写入
 */

/**
 * @typedef {Object} UserKnowledgeState
 * @property {string[]} viewedIds - 当天已读的资讯 ID 列表
 * @property {string[]} favoriteIds - 收藏的资讯 ID 列表
 * @property {string} lastFetchDate - 最后获取日期 YYYY-MM-DD
 * @property {number} lastShownIndex - 上次展示的位置
 * @property {boolean} dismissed - 当前会话是否已关闭卡片
 * @property {number} [historyIndex] - 浏览历史当前索引（回看模式）
 * @property {boolean} [allReadShown] - 当天是否已展示过「全部已读」
 */

const STORAGE_KEY = 'knowledge:state'

/** 默认分类选项 */
export const KNOWLEDGE_CATEGORIES = [
  { value: 'tip', label: '💡 小贴士' },
  { value: 'fact', label: '📖 冷知识' },
  { value: 'news', label: '📰 校园新闻' },
  { value: 'quote', label: '📜 名言' },
  { value: 'rule', label: '📋 规定' }
]

/** 分类 → 颜色映射 */
export const CATEGORY_COLORS = {
  tip: 'bg-blue-50 text-blue-600',
  fact: 'bg-purple-50 text-purple-600',
  news: 'bg-green-50 text-green-600',
  quote: 'bg-orange-50 text-orange-600',
  rule: 'bg-red-50 text-red-600'
}

/**
 * 创建空白的 UserKnowledgeState（含默认值）
 * @returns {UserKnowledgeState}
 */
export function createDefaultUserState() {
  return {
    viewedIds: [],
    favoriteIds: [],
    lastFetchDate: '',
    lastShownIndex: 0,
    dismissed: false
  }
}

/**
 * 从 localStorage 恢复用户状态，若无数据则返回默认值
 * @returns {UserKnowledgeState}
 */
export function loadUserState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...createDefaultUserState(), ...parsed }
    }
  } catch (e) {
    console.warn('解析 knowledge:state 失败，使用默认值', e)
  }
  return createDefaultUserState()
}

/**
 * 保存用户状态到 localStorage
 * @param {UserKnowledgeState} state
 */
export function saveUserState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('保存 knowledge:state 失败', e)
  }
}

/**
 * 格式化标签显示
 * @param {string[]} tags
 * @returns {string}
 */
export function formatTags(tags) {
  if (!tags || !tags.length) return ''
  return tags.map(t => `#${t}`).join(' ')
}
