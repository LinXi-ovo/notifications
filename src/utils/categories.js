/**
 * 分类配置 — 单源真相
 *
 * 所有分类的图标、颜色、样式统一在此定义，
 * 各组件通过导入此文件使用，不再各自维护硬编码 map。
 *
 * 添加新分类只需在此文件加一条即可。
 */

/** 分类详情映射 { value → { name, icon, color, colorClass } } */
export const CATEGORIES = {
  zongce:  { name: '综测', icon: '📊', color: 'blue',   colorClass: 'bg-blue-50 text-blue-600' },
  baoyan:  { name: '保研', icon: '🎓', color: 'purple', colorClass: 'bg-purple-50 text-purple-600' },
  activity:{ name: '活动', icon: '🎉', color: 'orange', colorClass: 'bg-orange-50 text-orange-600' },
  course:  { name: '课程', icon: '📚', color: 'green',  colorClass: 'bg-green-50 text-green-600' },
  homework:{ name: '作业', icon: '📝', color: 'red',    colorClass: 'bg-red-50 text-red-600' },
  party:   { name: '党团', icon: '🚩', color: 'red',    colorClass: 'bg-red-50 text-red-600' },
  consult: { name: '咨询', icon: '💬', color: 'teal',   colorClass: 'bg-teal-50 text-teal-600' },
  other:   { name: '其他', icon: '📌', color: 'gray',   colorClass: 'bg-gray-50 text-gray-600' },
  test:    { name: '测试', icon: '🧪', color: 'yellow', colorClass: 'bg-yellow-50 text-yellow-600' },
}

/** 默认分类列表（按 sortOrder 排序，用于初始化 Bmob 表） */
export const CATEGORY_LIST = [
  { name: '综测', value: 'zongce',   icon: '📊', color: 'blue',   sortOrder: 1 },
  { name: '保研', value: 'baoyan',   icon: '🎓', color: 'purple', sortOrder: 2 },
  { name: '活动', value: 'activity', icon: '🎉', color: 'orange', sortOrder: 3 },
  { name: '课程', value: 'course',   icon: '📚', color: 'green',  sortOrder: 4 },
  { name: '作业', value: 'homework', icon: '📝', color: 'red',    sortOrder: 5 },
  { name: '党团', value: 'party',    icon: '🚩', color: 'red',    sortOrder: 6 },
  { name: '咨询', value: 'consult',  icon: '💬', color: 'teal',   sortOrder: 7 },
  { name: '其他', value: 'other',    icon: '📌', color: 'gray',   sortOrder: 99 },
  { name: '测试', value: 'test',     icon: '🧪', color: 'yellow', sortOrder: 0 },
]

/**
 * 获取分类图标
 * @param {string} type - 分类 value
 * @returns {string} 图标 emoji
 */
export function getCategoryIcon(type) {
  return CATEGORIES[type]?.icon || '📌'
}

/**
 * 获取分类样式类
 * @param {string} type - 分类 value
 * @returns {string} Tailwind 样式类
 */
export function getCategoryClass(type) {
  return CATEGORIES[type]?.colorClass || 'bg-gray-50 text-gray-600'
}

/**
 * 获取分类名称
 * @param {string} type - 分类 value
 * @returns {string} 显示名称
 */
export function getCategoryName(type) {
  return CATEGORIES[type]?.name || type || '未分类'
}
