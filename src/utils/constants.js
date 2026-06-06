/** 通知优先级 */
export const PRIORITY = {
  NORMAL: 0,
  PINNED: 1,
  IMPORTANT: 2,
  URGENT: 3
}

export const PRIORITY_LABEL = {
  0: { label: '普通', icon: '' },
  1: { label: '置顶', icon: '⭐' },
  2: { label: '重要', icon: '🔴' },
  3: { label: '紧急', icon: '🚨' }
}

/** 默认分类（首次启动时写入 LeanCloud） */
export const DEFAULT_CATEGORIES = [
  { name: '综测', value: 'zongce', icon: '📊', color: 'blue', sortOrder: 1 },
  { name: '保研', value: 'baoyan', icon: '🎓', color: 'purple', sortOrder: 2 },
  { name: '活动', value: 'activity', icon: '🎉', color: 'orange', sortOrder: 3 },
  { name: '课程', value: 'course', icon: '📚', color: 'green', sortOrder: 4 },
  { name: '作业', value: 'homework', icon: '📝', color: 'red', sortOrder: 5 },
  { name: '党团', value: 'party', icon: '🚩', color: 'red', sortOrder: 6 },
  { name: '其他', value: 'other', icon: '📌', color: 'gray', sortOrder: 99 },
  { name: '测试', value: 'test', icon: '🧪', color: 'yellow', sortOrder: 0 }
]

/** 分页每页数量 */
export const PAGE_SIZE = 20
