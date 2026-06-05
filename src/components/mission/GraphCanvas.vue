<template>
  <div
    ref="containerRef"
    class="graph-canvas relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900/50 rounded-lg"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onPanMove"
    @mouseup="onPanEnd"
    @mouseleave="onPanEnd"
  >
    <!-- 缩放/平移层 -->
    <div
      class="absolute origin-top-left"
      :style="{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        width: canvasWidth + 'px',
        height: canvasHeight + 'px',
      }"
    >
      <!-- SVG 边 -->
      <svg
        class="absolute top-0 left-0 pointer-events-none"
        :width="canvasWidth"
        :height="canvasHeight"
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
        class="absolute"
        :style="{ left: node._x + 'px', top: node._y + 'px' }"
      >
        <NodeCard
          :node="node"
          :role-name="getRoleName(node.assignedRole)"
          :role-emoji="getRoleEmoji(node.assignedRole)"
          :role-color="getRoleColor(node.assignedRole)"
          :is-locked="false"
          :is-selected="selectedNodeId === node.id"
          @select="$emit('selectNode', node.id)"
          @dblclick="$emit('dblclickNode', node.id)"
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
  selectedEdgeId: { type: String, default: null }
})

const emit = defineEmits(['selectNode', 'dblclickNode', 'selectEdge', 'update:selectedEdgeId'])

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

defineExpose({ zoomIn, zoomOut, fitToScreen })
</script>
