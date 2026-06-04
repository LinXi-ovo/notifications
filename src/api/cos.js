import COS from 'cos-js-sdk-v5'

// 腾讯云 COS 配置
const BUCKET = 'notifications-web-app-1419125435'
const REGION = 'ap-guangzhou'
const PREFIX = 'uploads/'  // 上传目录前缀

let cosInstance = null

function getCos() {
  if (!cosInstance) {
    cosInstance = new COS({
      SecretId: import.meta.env.VITE_COS_SECRET_ID,
      SecretKey: import.meta.env.VITE_COS_SECRET_KEY,
    })
  }
  return cosInstance
}

/**
 * 上传文件到 COS
 * @param {File} file - 要上传的文件
 * @returns {Promise<string>} - 返回文件的可公开访问 URL
 */
export async function uploadFile(file) {
  const key = `${PREFIX}${Date.now()}_${file.name}`

  return new Promise((resolve, reject) => {
    getCos().putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: file,
      // 浏览器缓存一年，减少重复请求
      Headers: {
        'Cache-Control': 'public, max-age=31536000'
      }
    }, (err, data) => {
      if (err) {
        reject(new Error(err.message || '上传失败'))
      } else {
        // 构造可公开访问的 URL
        const url = `https://${BUCKET}.cos.${REGION}.myqcloud.com/${key}`
        resolve(url)
      }
    })
  })
}
