/**
 * WebSocket 消息路由处理器
 *
 * 协议:
 *   客户端 → 服务器: { id: "req-001", method: "list_notifications", params: {...} }
 *   服务器 → 客户端: { id: "req-001", result: {...} }
 *   错误响应:        { id: "req-001", error: { code: -1, message: "..." } }
 *
 * 支持的 method:
 *   ping                   → pong
 *   health                 → 服务器健康状态
 *   list_notifications     → 通知列表
 *   get_notification       → 单条通知
 *   search_notifications   → 搜索通知
 *   list_missions          → 任务列表
 *   get_mission            → 单个任务
 *   list_categories        → 分类列表
 *   list_knowledge         → 资讯列表
 */

import * as bmob from './bmob-api.js'

/** method → handler 映射表 */
const HANDLERS = {
  ping: {
    description: '心跳检测',
    handler: () => ({ pong: true, time: new Date().toISOString() }),
  },

  health: {
    description: '服务器健康状态',
    handler: async () => ({
      status: 'ok',
      version: '0.1.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }),
  },

  list_notifications: {
    description: '获取通知列表',
    params: { page: 'number (可选)', type: 'string (可选)', search: 'string (可选)', showTest: 'boolean (可选)' },
    handler: (params) => bmob.listNotifications(params),
  },

  get_notification: {
    description: '获取单条通知',
    params: { id: 'string (必填) — Bmob objectId' },
    handler: (params) => {
      if (!params?.id) throw new Error('缺少参数: id')
      return bmob.getNotification(params.id)
    },
  },

  search_notifications: {
    description: '搜索通知',
    params: { keyword: 'string (必填)', page: 'number (可选)', pageSize: 'number (可选)' },
    handler: (params) => {
      if (!params?.keyword) throw new Error('缺少参数: keyword')
      return bmob.searchNotifications(params.keyword, params)
    },
  },

  list_missions: {
    description: '获取任务列表',
    params: { pageSize: 'number (可选)' },
    handler: (params) => bmob.listMissions(params),
  },

  get_mission: {
    description: '获取单个任务详情',
    params: { id: 'string (必填) — missionId' },
    handler: (params) => {
      if (!params?.id) throw new Error('缺少参数: id')
      return bmob.getMission(params.id)
    },
  },

  list_categories: {
    description: '获取全部分类',
    handler: () => bmob.listCategories(),
  },

  list_knowledge: {
    description: '获取资讯列表',
    params: { limit: 'number (可选)' },
    handler: (params) => bmob.listKnowledgeItems(params),
  },
}

/** 获取可用方法列表 */
function getMethods() {
  const list = {}
  for (const [name, def] of Object.entries(HANDLERS)) {
    list[name] = {
      description: def.description,
      params: def.params || {},
    }
  }
  return list
}

/**
 * 处理单条 WebSocket 消息
 * @param {object} msg - 解析后的 JSON
 * @returns {Promise<object>} 响应对象
 */
export async function handleMessage(msg) {
  // 校验消息格式
  if (!msg || typeof msg !== 'object') {
    return { error: { code: -32700, message: '消息必须是 JSON 对象' } }
  }
  const { id, method, params } = msg
  if (!method) {
    return { id, error: { code: -32600, message: '缺少 method' } }
  }

  // 特殊处理 methods 查询
  if (method === 'methods') {
    return { id, result: getMethods() }
  }

  const def = HANDLERS[method]
  if (!def) {
    return {
      id,
      error: { code: -32601, message: `未知方法: ${method}`, data: { availableMethods: Object.keys(HANDLERS) } },
    }
  }

  try {
    const result = await def.handler(params || {})
    return { id, result }
  } catch (err) {
    return {
      id,
      error: { code: -1, message: err.message || '内部错误' },
    }
  }
}
