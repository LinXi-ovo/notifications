<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col">
    <!-- 顶部导航栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-3">
        <button class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" @click="$router.push('/missions')" title="返回任务列表">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ mission.title }}</h1>
        <StatusBadge :status="mission.status" :size="'sm'" />
        <!-- 云端同步状态 -->
        <span v-if="missionStore.bmobSyncing" class="text-xs text-yellow-500 animate-pulse">⏳</span>
        <span v-else-if="missionStore.migrated" class="text-xs text-green-500 cursor-pointer hover:text-green-700" title="点击手动同步" @click="syncNow">☁️</span>
        <span v-else class="text-xs text-gray-400 cursor-pointer hover:text-gray-600" title="点击尝试同步" @click="syncNow">💾</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- 模式切换 -->
        <button
          class="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
          :class="editMode ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'"
          @click="editMode = !editMode"
          :title="editMode ? '切换到执行模式' : '切换到编辑模式（管理任务结构）'"
        >
          {{ editMode ? '📝 编辑模式' : '▶️ 执行模式' }}
        </button>

        <!-- 角色管理（所有模式 — 认领/审核/委派） -->
        <button class="px-3 py-1.5 text-sm rounded-lg transition-colors" :class="editMode ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'" @click="showAddRole = true">
          👥 角色
        </button>

        <!-- 编辑入口 — CRUD 操作（编辑模式专用） -->
        <template v-if="editMode">
          <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="showAddEdge = true">
            ↔️ 连线
          </button>
          <button
            class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            @click="showAddNode = true"
          >
            ＋ 添加节点
          </button>
          <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="showCustomFields = true">
            📋 字段
          </button>
        </template>

        <!-- 通用入口 — 非破坏性操作 -->
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="exportMission">
          📥 导出
        </button>
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="$router.push(`/mission/${$route.params.id}/stats`)">
          📊 统计
        </button>
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="showReminder = true">
          ⏰ 提醒
        </button>
      </div>
    </div>

    <!-- 进度概览 -->
    <div class="flex items-center gap-6 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-sm shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-gray-500 dark:text-gray-400">整体进度:</span>
        <div class="w-40">
          <ProgressBar :pct="progress.pct" :show-label="true" />
        </div>
        <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ progress.done }}/{{ progress.total }}</span>
      </div>
      <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <span v-for="r in mission.roles" :key="r.id" class="text-xs px-2 py-0.5 rounded-full" :style="{ background: r.color + '20', color: r.color }">
          {{ r.emoji }} {{ r.name }}
        </span>
      </div>
    </div>

    <!-- 🧪 调试工具栏 -->
    <div v-if="debugMode" class="flex items-center gap-2 px-4 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700/30 text-xs shrink-0 flex-wrap">
      <span class="font-medium text-yellow-700 dark:text-yellow-400">🧪 调试</span>
      <span class="text-gray-400 dark:text-gray-500">|</span>

      <!-- 任务流预设 -->
      <span class="text-yellow-600 dark:text-yellow-500 font-medium">📋 流程</span>
      <button
        v-for="p in flowPresets"
        :key="p.name"
        class="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 transition-colors"
        @click="loadPreset(p.fn)"
        :title="p.description"
      >
        ➕ {{ p.shortName || p.name }}
      </button>

      <span class="text-gray-400 dark:text-gray-500">|</span>

      <!-- 权限模型预设 -->
      <span class="text-yellow-600 dark:text-yellow-500 font-medium">🔐 权限</span>
      <button
        v-for="p in permPresets"
        :key="p.name"
        class="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700/40 transition-colors"
        @click="loadPreset(p.fn)"
        :title="p.description"
      >
        ➕ {{ p.shortName || p.name }}
      </button>

      <span class="text-gray-400 dark:text-gray-500">|</span>

      <!-- 管理员绕过开关 -->
      <label class="flex items-center gap-1 cursor-pointer select-none" title="关闭后 admin 用户也会受角色权限限制">
        <span class="text-yellow-600 dark:text-yellow-500 font-medium">👑</span>
        <span class="text-yellow-700 dark:text-yellow-300">绕过</span>
        <div class="relative w-8 h-4 rounded-full transition-colors" :class="missionStore.adminBypass ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'" @click.stop="toggleAdminBypass">
          <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform" :class="missionStore.adminBypass ? 'translate-x-4' : ''" />
        </div>
      </label>

      <span class="text-gray-400 dark:text-gray-500">|</span>

      <!-- 诊断工具 -->
      <button
        class="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors"
        @click="showPermChecker = true"
      >
        🔍 权限诊断
      </button>
      <button
        class="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-800/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 transition-colors"
        @click="showJsonViewer = true"
        :disabled="!mission?.nodes?.length"
      >
        📄 JSON
      </button>
    </div>

    <!-- 主区域: 画布 + 侧栏 -->
    <div class="flex flex-1 min-h-0">
      <!-- 侧栏 -->
      <div class="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto shrink-0 hidden md:block">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📊 角色统计</h3>
        <div v-for="r in mission.roles" :key="r.id" class="mb-3">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ r.emoji }} {{ r.name }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            已认领: {{ assignmentCount(r.id) }} 人
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            已完成: {{ roleProgress(r.id).completed }}/{{ roleProgress(r.id).assigned }}
          </div>
        </div>

        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">图例</h3>
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>🟢 可操作</p>
          <p>🔒 锁定</p>
          <p>🔽 子任务</p>
        </div>
      </div>

      <!-- 画布 -->
      <div class="flex-1 relative">
        <GraphCanvas
          ref="canvasRef"
          :nodes="mission.nodes"
          :edges="mission.edges"
          :roles="mission.roles"
          :selected-node-id="selectedNodeId"
          :selected-edge-id="selectedEdgeId"
          :node-lock-map="nodeLockMap"
          :edit-mode="editMode"
          @select-node="onSelectNode"
          @dblclick-node="onDblclickNode"
          @select-edge="selectedEdgeId = $event"
          @add-node="onCanvasAddNode"
          @update-node-position="onUpdateNodePosition"
        />

        <!-- 缩放控制 -->
        <div class="absolute bottom-4 right-4 z-10">
          <GraphControls
            :zoom="1"
            @zoom-in="canvasRef?.zoomIn()"
            @zoom-out="canvasRef?.zoomOut()"
            @fit-to-screen="canvasRef?.fitToScreen()"
          />
        </div>

        <!-- 空状态提示 -->
        <div v-if="!mission.nodes.length" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-center text-gray-400 dark:text-gray-500">
            <p class="text-5xl mb-2">🗺️</p>
            <p class="text-sm">点击右上角"添加节点"开始构建任务图</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加节点对话框 -->
    <div v-if="showAddNode" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddNode = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加任务节点</h2>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">节点标题</label>
        <input v-model="newNodeTitle" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3" placeholder="例如：填写个人信息表" />

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">负责人角色</label>
        <select v-model="newNodeRole" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择角色</option>
          <option v-for="r in mission.roles" :key="r.id" :value="r.id">{{ r.emoji }} {{ r.name }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">完成模式</label>
        <select v-model="newNodeCompletionRule" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2">
          <option value="single">单人完成（一人操作即完成）</option>
          <option value="count">多人完成（累计指定人数）</option>
          <option value="all">全员完成（所有认领人都需完成）</option>
        </select>

        <div v-if="newNodeCompletionRule === 'count'" class="mb-3">
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">目标完成人数</label>
          <input v-model.number="newNodeCompletionTarget" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddNode = false">取消</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newNodeTitle.trim() || !newNodeRole" @click="addNode">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加边对话框 -->
    <div v-if="showAddEdge" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddEdge = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加依赖边</h2>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">源节点（前置）</label>
        <select v-model="newEdgeSource" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择节点</option>
          <option v-for="n in mission.nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">目标节点（后置）</label>
        <select v-model="newEdgeTarget" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择节点</option>
          <option v-for="n in mission.nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">边标签（可选）</label>
        <input v-model="newEdgeLabel" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4" placeholder="例如：需材料齐备后开始" />

        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddEdge = false">取消</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newEdgeSource || !newEdgeTarget || newEdgeSource === newEdgeTarget" @click="addEdge">添加</button>
        </div>
      </div>
    </div>

    <!-- 角色管理对话框（编辑/执行模式共用） -->
    <div v-if="showAddRole" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddRole = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">👥 角色管理</h2>
          <span class="text-xs px-2 py-0.5 rounded font-medium" :class="editMode ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' : 'bg-green-100 text-green-700 dark:bg-green-900/30'">
            {{ editMode ? '📝 编辑模式' : '▶️ 执行模式' }}
          </span>
        </div>

        <!-- 现有角色列表（认领/查看） -->
        <div class="mb-4 space-y-2">
          <div v-for="r in mission.roles" :key="r.id" class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div class="flex items-center gap-2">
              <span>{{ r.emoji }}</span>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ r.name }}</span>
              <span class="text-xs text-gray-400">{{ r.claimPolicy.type === 'free' ? '自由认领' : r.claimPolicy.type === 'approval' ? '审核认领' : r.claimPolicy.type === 'password' ? '口令认领' : '委派' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 tabular-nums">{{ assignmentCount(r.id) }}人</span>
              <button v-if="editMode" class="text-xs text-red-400 hover:text-red-600" @click="removeRole(r.id)">删除</button>
            </div>
          </div>
          <div v-if="!mission.roles.length" class="text-sm text-gray-400 text-center py-4">暂无角色</div>

          <!-- 认领按钮（执行模式） -->
          <div v-if="!editMode && mission.roles.length" class="px-2">
            <p class="text-xs text-gray-400 mb-2">点击节点详情中的"认领此角色"来认领对应角色</p>
          </div>
        </div>

        <!-- 待审批列表（所有模式） -->
        <div v-if="pendingClaims.length" class="mb-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">⏳ 待审批 ({{ pendingClaims.length }})</h3>
          <div v-for="(claim, idx) in pendingClaims" :key="idx" class="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-1">
            <div class="text-xs">
              <span class="font-medium text-gray-700 dark:text-gray-200">{{ claim.userId }}</span>
              <span class="text-gray-400 ml-1">申请认领</span>
              <span class="font-medium text-gray-600 dark:text-gray-300 ml-1">{{ getRoleName(claim.roleId) }}</span>
            </div>
            <div class="flex gap-1">
              <button class="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200" @click="approveClaim(claim.roleId, claim.userId)">✅ 通过</button>
              <button class="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200" @click="rejectClaim(claim.roleId, claim.userId)">❌ 拒绝</button>
            </div>
          </div>
        </div>

        <!-- 委派管理（所有模式） -->
        <div v-if="delegatableRoles.length" class="mb-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">🔑 委派管理</h3>
          <div v-for="r in delegatableRoles" :key="r.id" class="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-1">
            <div class="text-xs">
              <span class="font-medium text-gray-700 dark:text-gray-200">{{ r.emoji }} {{ r.name }}</span>
              <span class="text-gray-400 ml-1">当前 {{ assignmentCount(r.id) }}/{{ r.maxAssignees }} 人</span>
            </div>
            <div class="flex items-center gap-1">
              <input v-model="delegateUserId" type="text" class="w-24 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none" placeholder="用户名" />
              <button class="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded hover:bg-indigo-200" @click="delegateRole(r.id)">委派</button>
            </div>
          </div>
        </div>

        <!-- 编辑模式：添加角色 CRUD -->
        <template v-if="editMode">
          <hr class="border-gray-200 dark:border-gray-600 mb-4" />
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">添加角色</h3>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <input v-model="newRole.name" type="text" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="角色名称（如：班长）" />
            <input v-model="newRole.emoji" type="text" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="👨‍🎓" />
            <input v-model="newRole.color" type="text" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="#F59E0B" />
            <select v-model="newRole.claimType" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
              <option value="free">自由认领</option>
              <option value="approval">审核认领</option>
              <option value="password">口令认领</option>
              <option value="delegated">管理员委派</option>
            </select>
            <input v-if="newRole.claimType === 'password'" v-model="newRole.password" type="text" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="认领口令" />
          </div>
          <div class="flex justify-end">
            <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newRole.name.trim()" @click="addRole">添加角色</button>
          </div>
        </template>

        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddRole = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 节点详情面板 -->
    <div v-if="selectedNode" class="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl rounded-t-2xl max-h-[60vh] overflow-y-auto transition-transform" @click.self="selectedNodeId = null">
      <div class="max-w-4xl mx-auto p-4">
        <!-- 面板头部 -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ selectedNode.title }}</h3>
            <StatusBadge :status="selectedNode.status" :size="'sm'" />
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {{ getRoleName(selectedNode.assignedRole) }}
            </span>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="selectedNodeId = null">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- 描述 -->
        <p v-if="selectedNode.description" class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ selectedNode.description }}</p>
        <p v-else class="text-sm text-gray-400 dark:text-gray-500 mb-3">暂无描述</p>

        <!-- 进度（count/all 模式） -->
        <div v-if="selectedNode.completionRule !== 'single'" class="mb-3">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-gray-600 dark:text-gray-300">完成进度</span>
            <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ selectedNode.completions.length }}/{{ completionTargetDisplay }}</span>
          </div>
          <ProgressBar :pct="completionPct" :show-label="false" />
          <!-- 达标标记 -->
          <div v-if="selectedNode.completions.length > 0 && selectedNode.status !== 'completed'" class="mt-1 text-xs">
            <span class="text-green-600 dark:text-green-400 font-medium">📊 达标</span>
            <span class="text-gray-400 ml-1">已达最低完成人数，下游节点可开始</span>
          </div>
          <!-- 已完成列表 -->
          <div v-if="selectedNode.completions.length" class="mt-2 flex flex-wrap gap-1">
            <span v-for="c in selectedNode.completions" :key="c.userId" class="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">✅ {{ c.userName || c.userId }}</span>
          </div>
        </div>

        <!-- 前置/后置 -->
        <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <div>
            <span class="font-medium">前置:</span>
            <span v-if="predecessors.length">{{ predecessors.map(n => n.title).join(', ') }}</span>
            <span v-else class="text-gray-400">无</span>
          </div>
          <div>
            <span class="font-medium">后置:</span>
            <span v-if="successors.length">{{ successors.map(n => n.title).join(', ') }}</span>
            <span v-else class="text-gray-400">无</span>
          </div>
        </div>

        <!-- 角色认领 + 权限信息 -->
        <div class="mb-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
              👤 {{ getRoleName(selectedNode.assignedRole) }}
              <span v-if="hasClaimedRole(selectedNode.assignedRole)" class="ml-1 text-xs text-green-500">✅ 已认领</span>
              <span v-else-if="hasPendingClaimForRole(selectedNode.assignedRole)" class="ml-1 text-xs text-orange-500">⏳ 审核中</span>
              <span v-else-if="claimPolicyForRole(selectedNode.assignedRole) === 'delegated'" class="ml-1 text-xs text-gray-400">🔒 委派制</span>
              <span v-else class="ml-1 text-xs text-gray-400">未认领</span>
            </span>
            <button
              v-if="!hasClaimedRole(selectedNode.assignedRole) && !hasPendingClaimForRole(selectedNode.assignedRole) && claimPolicyForRole(selectedNode.assignedRole) !== 'delegated'"
              class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 transition-colors"
              @click="claimCurrentRole"
            >
              认领此角色
            </button>
            <span v-else-if="hasPendingClaimForRole(selectedNode.assignedRole)" class="text-xs text-orange-500 dark:text-orange-400">⏳ 等待管理员审核</span>
            <span v-else-if="hasClaimedRole(selectedNode.assignedRole)" class="text-xs text-green-600 dark:text-green-400">✅ 已认领</span>
            <span v-else class="text-xs text-gray-400">🔒 仅管理员可委派</span>
          </div>
          <div v-if="hasClaimedRole(selectedNode.assignedRole)" class="text-xs text-gray-400">
            你的角色: {{ userRoleNames.join(', ') }}
          </div>
        </div>

        <!-- 节点权限提示（执行模式） -->
        <div v-if="!editMode" class="flex items-center gap-2 text-xs">
          <span v-if="hasClaimedRole(selectedNode.assignedRole) && !nodeLockMap[selectedNode.id]" class="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 font-medium">🟢 可操作</span>
          <span v-else-if="hasClaimedRole(selectedNode.assignedRole) && nodeLockMap[selectedNode.id]" class="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 font-medium">🔒 角色无权限</span>
          <span v-else-if="hasPendingClaimForRole(selectedNode.assignedRole)" class="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 font-medium">⏳ 认领审核中</span>
          <span v-else class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 font-medium">🔒 请先认领角色</span>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <!-- 编辑模式 → 全部状态转换可用 -->
          <template v-if="editMode">
            <button
              v-for="t in allTransitionsForNode"
              :key="t.to"
              class="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium"
              :class="transitionButtonClass(t.to)"
              @click="changeStatus(t.to)"
            >
              {{ t.label }}
            </button>
            <button class="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" @click="deleteSelectedNode">
              🗑️ 删除节点
            </button>
          </template>

          <!-- 执行模式 → 按角色权限显示 -->
          <template v-else>
            <!-- 🔒 锁定：不显示任何操作按钮 -->
            <template v-if="nodeLockMap[selectedNode.id]">
              <span class="text-xs text-gray-400 italic">🔒 未认领该角色，无法操作</span>
            </template>
            <!-- 🟢 可操作：显示权限允许的转换按钮 -->
            <template v-else>
              <button
                v-for="t in permissionedTransitions"
                :key="t.to"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium"
                :class="transitionButtonClass(t.to)"
                @click="changeStatus(t.to)"
              >
                {{ t.label }}
              </button>

              <!-- 无可用操作 → 显示具体原因 -->
              <span v-if="!permissionedTransitions.length" class="text-xs italic" :class="noOpReasonClass">
                {{ noOpReason }}
              </span>

              <!-- 标记我已填写（count/all 模式下额外按钮，仅进行中） -->
              <button
                v-if="selectedNode.status === 'in-progress' && selectedNode.completionRule !== 'single' && hasClaimedRole(selectedNode.assignedRole)"
                class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors font-medium"
                @click="markNodeComplete"
              >
                ✅ 标记我已填写
              </button>
              <span v-else-if="selectedNode.status === 'in-progress' && selectedNode.completionRule !== 'single' && !hasClaimedRole(selectedNode.assignedRole)" class="text-xs text-gray-400 italic">
                请先认领角色，再点击「标记我已填写」
              </span>
            </template>
          </template>
        </div>

        <!-- 自定义字段（所有模式） -->
        <CustomFieldForm
          v-if="selectedNode && mission.customFields?.length"
          :node="selectedNode"
          :fields="mission.customFields"
          @update="onCustomFieldUpdate"
        />

        <!-- 评论（所有模式） -->
        <CommentThread v-if="selectedNode" :node-id="selectedNode.id" />
      </div><!-- end detail panel content -->
    </div>
  </div>

    <!-- JSON 查看器（调试模式） -->
    <div v-if="showJsonViewer" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showJsonViewer = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">📄 Mission JSON</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="showJsonViewer = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <pre class="text-xs font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all"><code>{{ prettyJson }}</code></pre>
        </div>
        <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="copyJson">📋 复制</button>
          <button class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" @click="downloadJson">⬇️ 下载</button>
        </div>
      </div>
    </div>

    <!-- 🔍 权限诊断对话框 -->
    <div v-if="showPermChecker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showPermChecker = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">🔍 权限诊断</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="showPermChecker = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4 space-y-3 text-xs">
          <p class="text-gray-600 dark:text-gray-300">
            当前用户: <strong>{{ userStore.username || '未登录' }}</strong>
            <span v-if="userStore.username === 'admin'" class="ml-2 text-blue-600 font-semibold">👑 管理员</span>
            <span v-if="userStore.username === 'admin'" class="ml-2 text-xs" :class="missionStore.adminBypass ? 'text-green-600' : 'text-red-500'">
              [绕过权限: {{ missionStore.adminBypass ? '✅ 开启' : '❌ 关闭' }}]
            </span>
          </p>
          <p class="text-gray-600 dark:text-gray-300">
            已认领角色: <span v-if="userRoleNames.length">{{ userRoleNames.join(', ') }}</span>
            <span v-else class="text-gray-400">无</span>
          </p>

          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100 dark:bg-gray-700/50">
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">节点</th>
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">状态</th>
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">负责人角色</th>
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">可操作?</th>
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">可用转换</th>
                <th class="px-2 py-1.5 text-left text-gray-600 dark:text-gray-300 font-medium">原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in mission.nodes" :key="n.id" class="border-b border-gray-100 dark:border-gray-700">
                <td class="px-2 py-1.5 text-gray-800 dark:text-gray-200 font-medium">{{ n.title }}</td>
                <td class="px-2 py-1.5">
                  <StatusBadge :status="n.status" :size="'sm'" />
                </td>
                <td class="px-2 py-1.5">
                  <span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {{ getRoleName(n.assignedRole) }}
                  </span>
                </td>
                <td class="px-2 py-1.5">
                  <span v-if="!nodeLockMap[n.id]" class="text-green-600">✅ 是</span>
                  <span v-else class="text-red-500">❌ 否</span>
                </td>
                <td class="px-2 py-1.5 text-gray-600 dark:text-gray-300">
                  {{ permissionTransitionsForNode(n.id).map(t => t.label).join(', ') || '—' }}
                </td>
                <td class="px-2 py-1.5 text-gray-400 max-w-[200px] truncate" :title="permissionReason(n.id)">
                  {{ permissionReason(n.id) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="text-gray-500 dark:text-gray-400 mt-2">
            <p>💡 管理员 (admin) {{ missionStore.adminBypass ? '可以绕过权限操作所有节点' : '受权限控制，与普通用户相同' }}。可在调试栏切换 👑 绕过 开关。</p>
            <p>💡 节点的 allowedOperators 和 allowedUsers 是白名单，空 = 不限制。</p>
          </div>
        </div>
        <div class="flex justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" @click="showPermChecker = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 自定义字段编辑器（编辑模式） -->
    <CustomFieldEditor
      v-if="showCustomFields"
      :fields="mission.customFields || []"
      :roles="mission.roles"
      @close="showCustomFields = false"
      @save="onSaveCustomFields"
    />

    <!-- 提醒对话框 -->
    <ReminderDialog
      v-if="showReminder"
      @close="showReminder = false"
    />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'
import { ALL_PRESETS } from '@/utils/mission-presets'
import GraphCanvas from '@/components/mission/GraphCanvas.vue'
import GraphControls from '@/components/mission/GraphControls.vue'
import ProgressBar from '@/components/mission/ProgressBar.vue'
import StatusBadge from '@/components/mission/StatusBadge.vue'
import CustomFieldForm from '@/components/mission/CustomFieldForm.vue'
import CustomFieldEditor from '@/components/mission/CustomFieldEditor.vue'
import CommentThread from '@/components/mission/CommentThread.vue'
import ReminderDialog from '@/components/mission/ReminderDialog.vue'

const route = useRoute()
const router = useRouter()
const missionStore = useMissionStore()
const userStore = useUserStore()

// 调试模式
const debugMode = ref(localStorage.getItem('mermaid-debug') === 'true')
const showJsonViewer = ref(false)
const showPermChecker = ref(false)
const prettyJson = computed(() => {
  if (!missionStore.currentMission) return '{}'
  return JSON.stringify(missionStore.currentMission, null, 2)
})

// 按类别分组预设
const flowPresets = computed(() => ALL_PRESETS.filter(p => p.category === 'flow').map(p => ({
  ...p,
  shortName: p.name.replace(/^[^\s]+\s/, '')
})))
const permPresets = computed(() => ALL_PRESETS.filter(p => p.category === 'perm').map(p => ({
  ...p,
  shortName: p.name.replace(/^[^\s]+\s/, '')
})))

const canvasRef = ref(null)
const selectedNodeId = ref(null)
const selectedEdgeId = ref(null)

// 编辑模式（默认执行模式）
const editMode = ref(false)

// 添加节点
const showAddNode = ref(false)
const newNodeTitle = ref('')
const newNodeRole = ref('')
const newNodeCompletionRule = ref('single')
const newNodeCompletionTarget = ref(30)

// 添加边
const showAddEdge = ref(false)
const newEdgeSource = ref('')
const newEdgeTarget = ref('')
const newEdgeLabel = ref('')

// 角色管理
const showAddRole = ref(false)
const showCustomFields = ref(false)
const showReminder = ref(false)
const newRole = ref({ name: '', emoji: '👤', color: '#6B7280', claimType: 'free', password: '' })
const delegateUserId = ref('')

const mission = computed(() => missionStore.currentMission || { nodes: [], edges: [], roles: [] })
const progress = computed(() => missionStore.progress)

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return missionStore.currentMission?.nodes.find(n => n.id === selectedNodeId.value) || null
})

onMounted(() => {
  const id = route.params.id
  if (id) missionStore.loadMission(id)
})

watch(() => route.params.id, (id) => {
  if (id) missionStore.loadMission(id)
})

function addNode() {
  if (!editMode.value) { alert('❌ 请切换到编辑模式'); return }
  if (!newNodeTitle.value.trim() || !newNodeRole.value) return
  missionStore.addNode(newNodeTitle.value.trim(), newNodeRole.value, {
    completionRule: newNodeCompletionRule.value,
    completionTarget: newNodeCompletionRule.value === 'count' ? newNodeCompletionTarget.value : 1
  })
  newNodeTitle.value = ''
  showAddNode.value = false
}

function addEdge() {
  if (!editMode.value) { alert('❌ 请切换到编辑模式'); return }
  if (!newEdgeSource.value || !newEdgeTarget.value) return
  missionStore.addEdge(newEdgeSource.value, newEdgeTarget.value, newEdgeLabel.value)
  newEdgeSource.value = ''
  newEdgeTarget.value = ''
  newEdgeLabel.value = ''
  showAddEdge.value = false
}

function onSelectNode(nodeId) {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId
}

function onDblclickNode(nodeId) {
  selectedNodeId.value = nodeId
}

function exportMission() {
  missionStore.downloadMission(route.params.id)
}

function deleteSelectedNode() {
  if (!selectedNodeId.value) return
  if (!editMode.value) {
    alert('❌ 执行模式下不能删除节点，请切换到编辑模式')
    return
  }
  if (confirm('确定删除此节点？')) {
    missionStore.removeNode(selectedNodeId.value)
    selectedNodeId.value = null
  }
}

function getRoleName(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.name || roleId
}

function getRoleEmoji(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.emoji || '👤'
}

function getRoleColor(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.color || '#6B7280'
}

function assignmentCount(roleId) {
  return missionStore.currentMission?.assignments.filter(a => a.roleId === roleId && a.status === 'approved').length || 0
}

function roleProgress(roleId) {
  return missionStore.roleProgress(roleId)
}

const predecessors = computed(() => {
  if (!selectedNode.value || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.target === selectedNode.value.id).map(e => e.source)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

const successors = computed(() => {
  if (!selectedNode.value || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.source === selectedNode.value.id).map(e => e.target)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

const completionPct = computed(() => {
  if (!selectedNode.value || !selectedNode.value.completionTarget) return 0
  return Math.round((selectedNode.value.completions.length / selectedNode.value.completionTarget) * 100)
})

const completionTargetDisplay = computed(() => {
  if (!selectedNode.value) return 0
  if (selectedNode.value.completionRule === 'count') return selectedNode.value.completionTarget
  return '全员'
})

// ── 权限感知的状态 ──

/** 节点锁定映射（nodeId → boolean） */
const nodeLockMap = computed(() => {
  if (!missionStore.currentMission || !userStore.username) return {}
  const map = {}
  for (const n of missionStore.currentMission.nodes) {
    const result = missionStore.checkNodeOperation(userStore.username, n.id)
    map[n.id] = !result.canOperate
  }
  return map
})

/** 当前用户已认领的角色名称列表 */
const userRoleNames = computed(() => {
  if (!missionStore.currentMission || !userStore.username) return []
  const assignments = missionStore.getUserAssignments(userStore.username)
  return assignments.map(a => {
    const role = missionStore.currentMission.roles.find(r => r.id === a.roleId)
    return role ? `${role.emoji} ${role.name}` : a.roleId
  })
})

/** 全部可能的状态转换（编辑模式用 — 不检查角色权限） */
const allTransitionsForNode = computed(() => {
  if (!selectedNode.value) return []
  const transitions = missionStore._getAllPossibleTransitions(selectedNode.value.status)
  return transitions.map(t => ({
    ...t,
    label: t.label || (t.to === 'completed' ? '✅ 标记完成' : t.to === 'in-progress' ? '▶️ 开始执行' : `➡️ ${t.to}`)
  }))
})

/** 权限感知的状态转换（执行模式用 — 从 store 获取） */
const permissionedTransitions = computed(() => {
  if (!selectedNode.value || !userStore.username) return []
  let transitions = missionStore.getAllowedTransitions(userStore.username, selectedNode.value.id)

  // count/all 模式：不允许手动"标记完成"，由满人自动完成
  if (selectedNode.value.completionRule !== 'single') {
    transitions = transitions.filter(t => t.to !== 'completed')
  }

  // 补充 label
  return transitions.map(t => ({
    ...t,
    label: t.label || (t.to === 'in-progress' ? '▶️ 开始执行' : `➡️ ${t.to}`)
  }))
})

/** 无可用操作时的具体原因 */
const noOpReason = computed(() => {
  if (!selectedNode.value) return ''
  const node = selectedNode.value

  // 1. 已完成的节点
  if (node.status === 'completed') return '✅ 该节点已完成，无需操作'
  if (node.status === 'cancelled') return '🗑️ 该节点已取消'

  // 2. count/all 模式且 status=in-progress → 应该显示「标记我已填写」而不是转换按钮
  if (node.completionRule !== 'single' && node.status === 'in-progress') {
    return hasClaimedRole(node.assignedRole)
      ? '📊 多人任务：请点击上方「标记我已填写」'
      : '📊 请先认领角色，再点击「标记我已填写」'
  }

  // 3. 节点被前置阻塞
  const preds = predecessors.value
  if (preds.length > 0 && !preds.every(n => n.status === 'completed')) {
    const incomplete = preds.filter(n => n.status !== 'completed').map(n => n.title).join('、')
    return `⏳ 前置节点「${incomplete}」未完成，暂不可操作`
  }

  // 4. 角色对当前状态无转换权限
  const userRoleNamesStr = userRoleNames.value.length ? userRoleNames.value.join(', ') : '未认领'
  return `🔒 你的角色 (${userRoleNamesStr}) 在当前状态「${statusLabel(node.status)}」下无可用操作`
})

const noOpReasonClass = computed(() => {
  if (!selectedNode.value) return 'text-gray-400'
  const s = selectedNode.value.status
  if (s === 'completed' || s === 'cancelled') return 'text-gray-400'
  return 'text-gray-400'
})

/** 获取状态中文名 */
function statusLabel(s) {
  const map = { 'todo': '未开始', 'in-progress': '进行中', 'completed': '已完成', 'blocked': '阻塞', 'cancelled': '已取消' }
  return map[s] || s
}

function transitionButtonClass(to) {
  if (to === 'completed') return 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
  if (to === 'blocked' || to === 'cancelled') return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
}

function changeStatus(to) {
  if (!selectedNode.value || !userStore.username) return
  if (editMode.value) {
    // 编辑模式：允许所有状态转换
    missionStore.changeNodeStatus(selectedNode.value.id, to)
    return
  }
  // 执行模式：必须通过权限检查
  const allowed = missionStore.checkStatusTransition(userStore.username, selectedNode.value.id, to)
  if (!allowed.allowed) {
    alert('❌ ' + allowed.reason)
    return
  }
  missionStore.changeNodeStatus(selectedNode.value.id, to)
}

// ── 角色管理（仅编辑模式） ──
function addRole() {
  if (!editMode.value) { alert('❌ 请切换到编辑模式'); return }
  if (!newRole.value.name.trim()) return
  missionStore.addRole(
    newRole.value.name.trim(),
    newRole.value.color,
    newRole.value.emoji,
    { type: newRole.value.claimType, password: newRole.value.claimType === 'password' ? newRole.value.password : null }
  )
  newRole.value = { name: '', emoji: '👤', color: '#6B7280', claimType: 'free', password: '' }
}

function removeRole(roleId) {
  if (!editMode.value) { alert('❌ 请切换到编辑模式'); return }
  if (confirm('确定删除此角色？')) {
    missionStore.removeRole(roleId)
  }
}

function hasClaimedRole(roleId) {
  const username = userStore.username
  if (!username) return false
  return !!missionStore.currentMission?.assignments.find(
    a => a.roleId === roleId && a.userId === username && a.status === 'approved'
  )
}

function hasPendingClaimForRole(roleId) {
  const username = userStore.username
  if (!username) return false
  return !!missionStore.currentMission?.assignments.find(
    a => a.roleId === roleId && a.userId === username && a.status === 'pending'
  )
}

function claimPolicyForRole(roleId) {
  if (!missionStore.currentMission) return 'free'
  const role = missionStore.currentMission.roles.find(r => r.id === roleId)
  return role?.claimPolicy?.type || 'free'
}

function claimPolicyLabel(roleId) {
  const labels = { free: '自由', approval: '审核', password: '口令', delegated: '委派' }
  return labels[claimPolicyForRole(roleId)] || '自由'
}

function claimCurrentRole() {
  if (!selectedNode.value || !userStore.username) return
  const roleId = selectedNode.value.assignedRole
  if (hasPendingClaimForRole(roleId)) {
    alert('⏳ 已提交过认领申请，请等待管理员审核')
    return
  }
  const policy = claimPolicyForRole(roleId)

  if (policy === 'password') {
    const pwd = prompt('请输入认领口令：')
    if (!pwd) return
    const result = missionStore.claimRoleWithPassword(roleId, userStore.username, pwd)
    if (result.success) {
      alert('✅ 认领成功！')
    } else {
      alert('❌ ' + result.reason)
    }
    return
  }

  if (policy === 'delegated') {
    alert('该角色只能由管理员委派，无法自荐认领')
    return
  }

  const result = missionStore.claimRole(roleId, userStore.username)
  if (result.success) {
    if (result.pending) {
      alert('✅ 已提交认领申请，等待管理员审核')
    } else {
      alert('✅ 认领成功！')
    }
  } else {
    alert('❌ ' + result.reason)
  }
}

function markNodeComplete() {
  if (!selectedNode.value || !userStore.username) return
  // 必须己认领角色才能标记
  if (!hasClaimedRole(selectedNode.value.assignedRole)) {
    alert('❌ 请先认领角色')
    return
  }
  if (editMode.value) {
    alert('❌ 编辑模式下不能标记完成，请切换到执行模式')
    return
  }
  const userName = userStore.username
  missionStore.markComplete(selectedNode.value.id, userStore.username, userName)
}

/** 自定义字段值变更 */
function onCustomFieldUpdate(newValues) {
  if (!selectedNode.value) return
  missionStore.updateNode(selectedNode.value.id, { customValues: newValues })
}

/** 保存自定义字段 Schema */
function onSaveCustomFields(fields) {
  missionStore.updateMission({ customFields: fields })
  showCustomFields.value = false
}

/** 画布编辑器：添加节点 */
function onCanvasAddNode({ title, x, y }) {
  if (!editMode.value) return
  // 如果没有角色，无法添加节点
  if (!mission.value.roles.length) {
    alert('请先添加角色')
    return
  }
  // 使用第一个角色作为默认
  const defaultRole = mission.value.roles[0].id
  missionStore.addNode(title, defaultRole, {
    completionRule: 'single',
    completionTarget: 1,
    position: { x, y }
  })
}

/** 画布编辑器：更新节点位置 */
function onUpdateNodePosition({ nodeId, x, y }) {
  const node = mission.value.nodes.find(n => n.id === nodeId)
  if (node) {
    node.position = { x, y }
    missionStore._saveMission()
  }
}

// ── 权限诊断辅助 ──
function permissionTransitionsForNode(nodeId) {
  if (!userStore.username) return []
  return missionStore.getAllowedTransitions(userStore.username, nodeId)
}

function permissionReason(nodeId) {
  if (!userStore.username || !missionStore.currentMission) return '未登录'
  const result = missionStore.checkNodeOperation(userStore.username, nodeId)
  return result.reason || (result.canOperate ? '允许操作' : '无权限')
}

// ── 审批管理 ──
const pendingClaims = computed(() => {
  if (!missionStore.currentMission) return []
  return missionStore.getPendingClaims()
})

function approveClaim(roleId, userId) {
  if (!missionStore.currentMission) return
  // 找到对应的 assignment 索引
  const idx = missionStore.currentMission.assignments.findIndex(
    a => a.roleId === roleId && a.userId === userId && a.status === 'pending'
  )
  if (idx === -1) return
  missionStore.approveClaim(idx, userStore.username || 'admin')
  alert('✅ 已通过 ' + userId + ' 的认领申请')
}

function rejectClaim(roleId, userId) {
  if (!missionStore.currentMission) return
  const idx = missionStore.currentMission.assignments.findIndex(
    a => a.roleId === roleId && a.userId === userId && a.status === 'pending'
  )
  if (idx === -1) return
  missionStore.rejectClaim(idx)
  alert('已拒绝 ' + userId + ' 的认领申请')
}

// ── 委派管理 ──
const delegatableRoles = computed(() => {
  if (!missionStore.currentMission) return []
  return missionStore.currentMission.roles.filter(r => r.claimPolicy?.type === 'delegated')
})

function delegateRole(roleId) {
  if (!delegateUserId.value.trim()) {
    alert('请输入要委派的用户名')
    return
  }
  const result = missionStore.delegateRole(roleId, delegateUserId.value.trim(), userStore.username || 'admin')
  if (result.success) {
    alert(`✅ 已委派 ${delegateUserId.value.trim()} 为 ${getRoleName(roleId)}`)
    delegateUserId.value = ''
  } else {
    alert('❌ ' + result.reason)
  }
}

/** 手动同步到 Bmob */
async function syncNow() {
  if (!missionStore.migrated) {
    await missionStore.migrateLocalToBmob()
    if (missionStore.error) {
      alert('迁移失败: ' + missionStore.error)
      return
    }
    alert('✅ 已迁移到云端')
  } else {
    await missionStore._saveToBmob()
    alert('✅ 已同步到云端')
  }
}
function toggleAdminBypass() {
  missionStore.setAdminBypass(!missionStore.adminBypass)
}

// ── 调试模式：加载预设（覆盖当前任务，不创建新条目） ──
function loadPreset(presetFn) {
  const preset = presetFn()

  // 当前用户认领第一个角色以便操作
  if (userStore.username && preset.roles[0]) {
    preset.assignments.push({
      roleId: preset.roles[0].id,
      userId: userStore.username,
      assignedAt: new Date().toISOString(),
      status: 'approved'
    })
  }

  if (missionStore.currentMission) {
    // ✅ 覆盖当前任务：替换内容，保留 ID
    const mission = missionStore.currentMission
    mission.title = preset.title
    mission.description = preset.description
    mission.roles = preset.roles
    mission.nodes = preset.nodes
    mission.edges = preset.edges
    mission.assignments = preset.assignments
    mission.customFields = preset.customFields
    mission.tags = preset.tags
    mission.updatedAt = new Date().toISOString()
    missionStore._saveMission()
    // 刷新当前页（重新渲染画布）
    router.go(0)
  } else {
    // 没有当前任务 → 创建新任务
    missionStore.createMission(preset.title, userStore.username || 'preset')
    const mission = missionStore.currentMission
    mission.description = preset.description
    mission.roles = preset.roles
    mission.nodes = preset.nodes
    mission.edges = preset.edges
    mission.assignments = preset.assignments
    mission.customFields = preset.customFields
    mission.tags = preset.tags
    mission.updatedAt = new Date().toISOString()
    missionStore._saveMission()
    router.push('/mission/' + mission.id)
  }
}

// ── 调试模式：JSON 查看/复制/下载 ──
function copyJson() {
  const text = prettyJson.value
  navigator.clipboard?.writeText(text).then(() => {
    alert('JSON 已复制到剪贴板')
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    alert('JSON 已复制到剪贴板')
  })
}
function downloadJson() {
  const blob = new Blob([prettyJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mission-${missionStore.currentMission?.id || 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
