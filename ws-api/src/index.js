/**
 * 通知聚合器 — WebSocket API Server
 *
 * 提供 WebSocket 接口供 AI Agent 以编程方式操作通知聚合器。
 *
 * 启动:
 *   node src/index.js
 *
 * 连接:
 *   ws://localhost:3008
 *
 * 环境变量:
 *   VITE_BMOB_SECRET_KEY     (必填) Bmob 后端云密钥
 *   VITE_BMOB_API_SAFE_CODE  (必填) Bmob API 安全码
 *   WS_PORT                  (可选, 默认 3008) WebSocket 端口
 *
 * 构建为独立 EXE:
 *   npm run build
 *   输出: dist/notifications-ws-api.exe
 *   运行: notifications-ws-api.exe
 *   (同级目录需放 .env 文件配置 Bmob 密钥)
 */

import { WebSocketServer } from 'ws'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initBmobFromEnv } from './bmob-api.js'
import { handleMessage } from './handler.js'

// 获取当前目录
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── 加载 .env ──
function loadEnv() {
  // 尝试从 ws-api/.env 读取, 再退回到项目根目录 .env
  const paths = [
    resolve(ROOT, '.env'),
    resolve(ROOT, '..', '.env'),
    resolve(ROOT, '..', '.env.example'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const value = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
      console.log(`[WS-API] 加载环境变量: ${p}`)
      break
    }
  }
}

// ── 主入口 ──
async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   通知聚合器 WS API Server v0.1.0       ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  // 加载 .env
  loadEnv()

  // 初始化 Bmob
  try {
    initBmobFromEnv(process.env)
    console.log('✓ Bmob 后端连接成功')
  } catch (e) {
    console.error('✗ Bmob 初始化失败:', e.message)
    console.error('  请创建 ws-api/.env 文件（可从根目录 .env 复制）')
    process.exit(1)
  }

  const PORT = parseInt(process.env.WS_PORT || '3008', 10)

  const wss = new WebSocketServer({ port: PORT })

  wss.on('listening', () => {
    console.log(`✓ WebSocket 服务器已启动: ws://localhost:${PORT}`)
    console.log('')
    console.log('  连接后发送 JSON 消息:')
    console.log('    { "id": "1", "method": "list_notifications", "params": {} }')
    console.log('')
    console.log('  可用方法: methods  (发送 method: "methods" 查看全部)')
    console.log('')
  })

  wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress
    console.log(`[连接] ${clientIP}`)

    ws.on('message', async (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        ws.send(JSON.stringify({ error: { code: -32700, message: '无效 JSON' } }))
        return
      }

      // 处理消息（不 catch，让 handleMessage 自行处理错误）
      const response = await handleMessage(msg)
      if (response) {
        ws.send(JSON.stringify(response))
      }
    })

    ws.on('close', () => {
      console.log(`[断开] ${clientIP}`)
    })

    ws.on('error', (err) => {
      console.error(`[错误] ${clientIP}:`, err.message)
    })
  })

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[WS-API] 正在关闭...')
    wss.close(() => {
      console.log('[WS-API] 已关闭')
      process.exit(0)
    })
  })
}

main().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})
