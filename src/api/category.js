import Bmob from './bmob'

const TABLE = 'Categories'

/** 获取所有分类 */
export async function getCategories() {
  const q = Bmob.Query(TABLE)
  q.order('sortOrder')
  const results = await q.find() || []
  return results.map(normalizeCategory)
}

/** 获取单个分类 */
export async function getCategory(id) {
  const q = Bmob.Query(TABLE)
  const item = await q.get(id)
  return normalizeCategory(item)
}

/** 创建分类 */
export async function createCategory(data) {
  const q = Bmob.Query(TABLE)
  Object.keys(data).forEach(key => q.set(key, data[key]))
  return await q.save()
}

/** 更新分类 */
export async function updateCategory(id, data) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  Object.keys(data).forEach(key => q.set(key, data[key]))
  return await q.save()
}

/** 删除分类 */
export async function deleteCategory(id) {
  const q = Bmob.Query(TABLE)
  return await q.destroy(id)
}

function normalizeCategory(item) {
  if (!item) return null
  return {
    id: item.objectId,
    name: item.name || '',
    value: item.value || '',
    icon: item.icon || '📌',
    color: item.color || 'gray',
    sortOrder: item.sortOrder ?? 99
  }
}
