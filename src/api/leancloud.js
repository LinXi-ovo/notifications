import AV from 'leancloud-storage'

const APP_ID = import.meta.env.VITE_LC_APP_ID
const APP_KEY = import.meta.env.VITE_LC_APP_KEY
const SERVER_URL = import.meta.env.VITE_LC_SERVER_URL

if (!APP_ID || !APP_KEY || !SERVER_URL) {
  console.warn('LeanCloud 未配置，请在 .env 中设置 VITE_LC_APP_ID, VITE_LC_APP_KEY, VITE_LC_SERVER_URL')
}

AV.init({
  appId: APP_ID,
  appKey: APP_KEY,
  serverURL: SERVER_URL
})

export default AV
