import Bmob from 'hydrogen-js-sdk'

const SECRET_KEY = import.meta.env.VITE_BMOB_SECRET_KEY
const API_SAFE_CODE = import.meta.env.VITE_BMOB_API_SAFE_CODE

if (!SECRET_KEY || !API_SAFE_CODE) {
  console.warn('Bmob 未配置，请在 .env 中设置 VITE_BMOB_SECRET_KEY 和 VITE_BMOB_API_SAFE_CODE')
}

Bmob.initialize(SECRET_KEY, API_SAFE_CODE)

export default Bmob
