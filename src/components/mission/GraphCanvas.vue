<template>
  <div
    ref="containerRef"
    class="graph-canvas relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900/50 rounded-lg"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onPanMove"
    @mouseup="onPanEnd"
    @mouseleave="onPanEnd"
    @contextmenu.prevent="onContextMenu"
  >
    <!-- 缩放/平移层 -->
    <div
      class="absolute origin-top-left"
      :style="{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        width: canvasWidth + 'px',
        height: canvasHeight + 'px',
      }"
      @click="onCanvasClick"
    >
      <!-- SVG 边 -->
      <svg
        class="absolute top-0 left-0"
        :width="canvasWidth"
        :height="canvasHeight"
        :class="editMode ? 'pointer-events-auto' : 'pointer-events-none'"
      >
        <defs>
          <marker
            id="arrowhead-canvas"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
          </marker>
          <marker
            id="arrowhead-selected"
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
          </marker>
        </defs>

        <line
          v-for="edge in layoutEdges"
          :key="edge.id"
          :x1="edge._x1"
          :y1="edge._y1"
          :x2="edge._x2"
          :y2="edge._y2"
          :class="selectedEdgeId === edge.id ? 'stroke-blue-500' : 'stroke-gray-300 dark:stroke-gray-600'"
          stroke-width="2"
          :marker-end="selectedEdgeId === edge.id ? 'url(#arrowhead-selected)' : 'url(#arrowhead-canvas)'"
          class="pointer-events-auto cursor-pointer transition-colors hover:stroke-blue-400"
          @click.stop="selectEdge(edge.id)"
        />

        <!-- 边标签 -->
        <text
          v-for="edge in layoutEdges"
          :key="'label-' + edge.id"
          :x="(edge._x1 + edge._x2) / 2"
          :y="(edge._y1 + edge._y2) / 2 - 8"
          text-anchor="middle"
          class="fill-gray-500 dark:fill-gray-400"
          font-size="11"
        >
          {{ edge.label || '' }}
        </text>
      </svg>

      <!-- 节点卡片 -->
      <div
        v-for="node in layoutNodes"
        :key="node.id"
        class="absolute node-wrapper"
        :style="{ left: node._x + 'px', top: node._y + 'px' }"
        @mousedown.stop="editMode ? onNodeDragStart($event, node.id) : null"
      >
        <NodeCard
          :node="node"
          :role-name="getRoleName(node.assignedRole)"
          :role-emoji="getRoleEmoji(node.assignedRole)"
          :role-color="getRoleColor(node.assignedRole)"
          :is-locked="!!(nodeLockMap && nodeLockMap[node.id])"
          :is-selected="selectedNodeId === node.id"
          @select="$emit('selectNode', node.id)"
          @dblclick="$emit('dblclickNode', node.id)"
          @contextmenu.stop="$emit('nodeContextMenu', node.id, $event)"
        />
      </div>

      <!-- 空状态 -->
      <div
        v-if="!nodes.length"
        class="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm"
      >
        <div class="text-center">
          <p class="text-4xl mb-2">📋</p>
          <p>暂无节点，请先添加任务节点</p>
        </div>
      </div>
    </div>

    <!-- 右键上下文菜单 -->
    <div
      v-if="contextMenu.visible"
      class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <button
        v-for="item in contextMenu.items"
        :key="item.label"
        class="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="item.action(); contextMenu.visible = false"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- 添加节点浮动按钮（编辑模式） -->
    <div
      v-if="editMode && showAddNodeButton"
      class="fixed z-40 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-lg p-4 w-64"
      :style="{ left: addNodePos.x + 'px', top: addNodePos.y + 'px' }"
    >
      <p class="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">在此位置添加节点</p>
      <input v-model="addNodeTitle" type="text" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 mb-2" placeholder="节点标题"
        @keyup.enter="confirmAddNode" @keyup.escape="showAddNodeButton = false" />
      <div class="flex justify-end gap-1">
        <button class="text-xs px-2 py-1 text-gray-500 hover:text-gray-700" @click="showAddNodeButton = false">取消</button>
        <button class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" :disabled="!addNodeTitle.trim()" @click="confirmAddNode">添加</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import dagre from 'dagre'
import NodeCard from './NodeCard.vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  selectedNodeId: { type: String, default: null },
  selectedEdgeId: { type: String, default: null },
  /** Map<nodeId, boolean> — 节点锁定状态 */
  nodeLockMap: { type: Object, default: () => ({}) },
  /** 编辑模式（启用可视编辑） */
  editMode: { type: Boolean, default: false }
})

const emit = defineEmits([
  'selectNode', 'dblclickNode', 'selectEdge', 'update:selectedEdgeId',
  'addNode', 'addEdge', 'removeNode',
  'updateNodePosition', 'nodeContextMenu'
])

// ── 缩放/平移状态 ──
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const containerRef = ref(null)

// ── 画布尺寸（dagre 计算后） ──
const canvasWidth = ref(2000)
const canvasHeight = ref(2000)

// ── 平移拖拽状态 ──
let isPanning = false
let panStartX = 0
let panStartY = 0
let panStartPanX = 0
let panStartPanY = 0

// ── 布局计算 ──
const NODE_WIDTH = 180
const NODE_HEIGHT = 90
const MARGIN_X = 60
const MARGIN_Y = 60

const layoutNodes = ref([])
const layoutEdges = ref([])

function computeLayout() {
  if (!props.nodes.length) {
    layoutNodes.value = []
    layoutEdges.value = []
    return
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    marginx: MARGIN_X,
    marginy: MARGIN_Y,
    ranksep: 60,
    nodesep: 30
  })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of props.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of props.edges) {
    g.setEdge(edge.source, edge.target, { label: edge.label || '' })
  }

  dagre.layout(g)

  // 读取布局结果
  const laidOutNodes = props.nodes.map(n => {
    const pos = g.node(n.id)
    const nodeWidth = NODE_WIDTH
    const nodeHeight = NODE_HEIGHT
    return {
      ...n,
      _x: pos.x - nodeWidth / 2,
      _y: pos.y - nodeHeight / 2,
      _width: nodeWidth,
      _height: nodeHeight,
      _cx: pos.x,
      _cy: pos.y
    }
  })

  const laidOutEdges = props.edges.map(e => {
    const edgePoints = g.edge(e.source, e.target)
    const srcNode = laidOutNodes.find(n => n.id === e.source)
    const tgtNode = laidOutNodes.find(n => n.id === e.target)
    if (!srcNode || !tgtNode) {
      return { ...e, _x1: 0, _y1: 0, _x2: 0, _y2: 0 }
    }

    // 直线：从源底部到目标顶部（TB 布局）
    let _x1, _y1, _x2, _y2
    const graph = g.graph()
    if (graph.rankdir === 'TB' || !graph.rankdir) {
      _x1 = srcNode._cx
      _y1 = srcNode._cy + srcNode._height / 2
      _x2 = tgtNode._cx
      _y2 = tgtNode._cy - tgtNode._height / 2
    } else {
      _x1 = srcNode._cx + srcNode._width / 2
      _y1 = srcNode._cy
      _x2 = tgtNode._cx - tgtNode._width / 2
      _y2 = tgtNode._cy
    }

    return { ...e, _x1, _y1, _x2, _y2 }
  })

  // 计算画布尺寸
  let maxX = 0
  let maxY = 0
  for (const n of laidOutNodes) {
    const right = n._x + n._width + MARGIN_X
    const bottom = n._y + n._height + MARGIN_Y
    if (right > maxX) maxX = right
    if (bottom > maxY) maxY = bottom
  }

  layoutNodes.value = laidOutNodes
  layoutEdges.value = laidOutEdges
  canvasWidth.value = Math.max(maxX, 800)
  canvasHeight.value = Math.max(maxY, 600)
}

// 监听数据变化重新布局
watch(() => [props.nodes, props.edges], () => {
  computeLayout()
}, { deep: true })

onMounted(() => {
  computeLayout()
})

// ── 角色查询 ──
function getRoleName(roleId) {
  const role = props.roles.find(r => r.id === roleId)
  return role?.name || ''
}
function getRoleEmoji(roleId) {
  const role = props.roles.find(r => r.id === roleId)
  return role?.emoji || '👤'
}
function getRoleColor(roleId) {
  const role = props.roles.find(r => r.id === roleId)
  return role?.color || '#6B7280'
}

// ── 滚动缩放 ──
function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.25, Math.min(2, zoom.value + delta))
    // 以鼠标位置为中心缩放
    const rect = containerRef.value?.getBoundingClientRect()
    if (rect) {
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const scale = newZoom / zoom.value
      panX.value = mx - (mx - panX.value) * scale
      panY.value = my - (my - panY.value) * scale
    }
    zoom.value = newZoom
  }
}

// ── 平移拖拽 ──
function onPanStart(e) {
  // 忽略点击节点/边
  if (e.target.closest('.node-card')) return
  if (e.target.closest('line')) return
  if (e.target.closest('text')) return
  isPanning = true
  panStartX = e.clientX
  panStartY = e.clientY
  panStartPanX = panX.value
  panStartPanY = panY.value
}

function onPanMove(e) {
  if (!isPanning) return
  panX.value = panStartPanX + (e.clientX - panStartX)
  panY.value = panStartPanY + (e.clientY - panStartY)
}

function onPanEnd() {
  isPanning = false
}

// ── 方法 ──
function zoomIn() {
  zoom.value = Math.min(2, zoom.value + 0.2)
}
function zoomOut() {
  zoom.value = Math.max(0.25, zoom.value - 0.2)
}
function fitToScreen() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function selectEdge(edgeId) {
  emit('update:selectedEdgeId', selectedEdgeId.value === edgeId ? null : edgeId)
  emit('selectEdge', edgeId)
}

// ── 编辑器模式：上下文菜单 ──
const contextMenu = ref({ visible: false, x: 0, y: 0, items: [], nodeId: null })

function onContextMenu(e) {
  if (!props.editMode) return
  // 检查是否点击了节点
  const nodeEl = e.target.closest('.node-card')
  if (nodeEl) return // 节点右键由 NodeCard 的 @contextmenu 处理
  // 空白区域右键
  const pos = screenToCanvas(e.clientX, e.clientY)
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    items: [
      { label: '＋ 在此添加节点', action: () => showAddNodeAt(pos.x, pos.y) }
    ],
    nodeId: null
  }
}

/** 屏幕坐标 → 画布坐标 */
function screenToCanvas(clientX, clientY) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  const x = (clientX - rect.left - panX.value) / zoom.value
  const y = (clientY - rect.top - panY.value) / zoom.value
  return { x, y }
}

// ── 编辑器模式：点击画布添加节点 ──
const showAddNodeButton = ref(false)
const addNodePos = ref({ x: 0, y: 0 })
const addNodeTitle = ref('')

function onCanvasClick(e) {
  // 关闭上下文菜单
  if (contextMenu.value.visible) {
    contextMenu.value.visible = false
    return
  }
  // 编辑模式：双击？或者是空白区域单击 + 已有节点的编辑模式
  // 实际上由 onContextMenu 处理，这里只关弹出
}

function showAddNodeAt(canvasX, canvasY) {
  // 对齐到网格
  const gridSize = 30
  const x = Math.round(canvasX / gridSize) * gridSize
  const y = Math.round(canvasY / gridSize) * gridSize

  // 转为屏幕坐标
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    addNodePos.value = {
      x: rect.left + x * zoom.value + panX.value,
      y: rect.top + y * zoom.value + panY.value
    }
  } else {
    addNodePos.value = { x: canvasX, y: canvasY }
  }
  showAddNodeButton.value = true
  addNodeTitle.value = ''
  nextTick(() => {
    // 聚焦输入框
    const input = containerRef.value?.querySelector('input')
    input?.focus()
  })
}

function confirmAddNode() {
  if (!addNodeTitle.value.trim()) return
  const pos = screenToCanvas(addNodePos.value.x, addNodePos.value.y)
  emit('addNode', { title: addNodeTitle.value.trim(), x: Math.round(pos.x), y: Math.round(pos.y) })
  showAddNodeButton.value = false
  addNodeTitle.value = ''
}

// ── 编辑器模式：拖拽节点 ──
let draggingNodeId = null
let dragStartX = 0
let dragStartY = 0
let dragNodeOrigX = 0
let dragNodeOrigY = 0

function onNodeDragStart(e, nodeId) {
  if (!props.editMode) return
  const node = layoutNodes.value.find(n => n.id === nodeId)
  if (!node) return
  draggingNodeId = nodeId
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragNodeOrigX = node._x
  dragNodeOrigY = node._y

  document.addEventListener('mousemove', onNodeDragMove)
  document.addEventListener('mouseup', onNodeDragEnd)
}

function onNodeDragMove(e) {
  if (!draggingNodeId) return
  const dx = (e.clientX - dragStartX) / zoom.value
  const dy = (e.clientY - dragStartY) / zoom.value

  const node = layoutNodes.value.find(n => n.id === draggingNodeId)
  if (node) {
    node._x = dragNodeOrigX + dx
    node._y = dragNodeOrigY + dy
  }
}

function onNodeDragEnd() {
  if (draggingNodeId) {
    const node = layoutNodes.value.find(n => n.id === draggingNodeId)
    if (node) {
      // 对齐网格
      const gridSize = 20
      node._x = Math.round(node._x / gridSize) * gridSize
      node._y = Math.round(node._y / gridSize) * gridSize
      emit('updateNodePosition', { nodeId: draggingNodeId, x: node._x, y: node._y })
    }
    draggingNodeId = null
  }
  document.removeEventListener('mousemove', onNodeDragMove)
  document.removeEventListener('mouseup', onNodeDragEnd)
}

defineExpose({ zoomIn, zoomOut, fitToScreen })
</script>
