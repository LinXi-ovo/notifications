import Bmob from './bmob'

const TABLE = 'Files'

/** 上传文件并注册到 File 表 */
export async function uploadFile(file, fileName) {
  // 上传到 Bmob 文件存储
  const bmobFile = new Bmob.File(fileName, file)
  const uploadResult = await bmobFile.save()

  // 注册到 File 表
  const q = Bmob.Query(TABLE)
  q.set('name', fileName)
  q.set('url', uploadResult.url)
  q.set('mimeType', file.type || 'application/octet-stream')
  q.set('size', file.size || 0)
  const regResult = await q.save()

  return {
    id: regResult.objectId,
    name: fileName,
    url: uploadResult.url,
    mimeType: file.type,
    size: file.size
  }
}

/** 获取文件列表（用于渲染时替换文件名→URL） */
export async function getFiles(usedByNotificationId) {
  const q = Bmob.Query(TABLE)
  if (usedByNotificationId) {
    q.containedIn('usedBy', [usedByNotificationId])
  }
  const results = await q.find() || []
  return results.map(normalizeFile)
}

/** 注册文件引用（通知内容中使用了某个文件） */
export async function registerFileUsage(fileId, notificationId) {
  const q = Bmob.Query(TABLE)
  q.set('id', fileId)
  q.add('usedBy', notificationId)
  return await q.save()
}

function normalizeFile(item) {
  if (!item) return null
  return {
    id: item.objectId,
    name: item.name || '',
    url: item.url || '',
    mimeType: item.mimeType || '',
    size: item.size || 0
  }
}
