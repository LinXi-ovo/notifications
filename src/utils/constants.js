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

import { CATEGORY_LIST } from './categories'

/** 默认分类（首次启动时写入 Bmob） */
export const DEFAULT_CATEGORIES = CATEGORY_LIST

/** 分页每页数量 */
export const PAGE_SIZE = 20
