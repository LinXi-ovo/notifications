<template>
  <div class="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        💬 评论 <span v-if="commentCount" class="ml-1 font-normal">({{ commentCount }})</span>
      </h4>
    </div>

    <!-- 评论列表 -->
    <div v-if="topLevelComments.length" class="space-y-2 mb-3">
      <div v-for="cmt in topLevelComments" :key="cmt.id" class="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2.5">
        <!-- 评论头部 -->
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-200">{{ cmt.author }}</span>
            <span class="text-[10px] text-gray-400">{{ formatTime(cmt.createdAt) }}</span>
            <span v-if="cmt.updatedAt !== cmt.createdAt" class="text-[10px] text-gray-400">(已编辑)</span>
          </div>
          <div class="flex items-center gap-1">
            <button v-if="cmt.author === currentUser" class="text-[10px] text-gray-400 hover:text-blue-500 px-1 rounded" @click="editCommentId = cmt.id; editText = cmt.content">
              ✏️
            </button>
            <button v-if="cmt.author === currentUser" class="text-[10px] text-gray-400 hover:text-red-500 px-1 rounded" @click="deleteComment(cmt.id)">
              🗑️
            </button>
          </div>
        </div>

        <!-- 评论内容 -->
        <div v-if="editCommentId !== cmt.id" class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
          <span v-for="(seg, i) in parseMentions(cmt.content)" :key="i">
            <span v-if="seg.type === 'text'">{{ seg.text }}</span>
            <span v-else class="text-blue-500 font-medium">{{ seg.text }}</span>
          </span>
        </div>

        <!-- 编辑模式 -->
        <div v-else class="space-y-1">
          <textarea v-model="editText" rows="2" class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="编辑评论..."></textarea>
          <div class="flex justify-end gap-1">
            <button class="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" @click="editCommentId = null">取消</button>
            <button class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200" @click="saveEdit(cmt.id)">保存</button>
          </div>
        </div>

        <!-- 回复（嵌套层级仅 1 层） -->
        <div v-if="getReplies(cmt.id).length" class="ml-4 mt-2 space-y-1.5 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
          <div v-for="reply in getReplies(cmt.id)" :key="reply.id" class="bg-gray-50 dark:bg-gray-700/30 rounded p-1.5">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-1">
                <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ reply.author }}</span>
                <span class="text-[10px] text-gray-400">{{ formatTime(reply.createdAt) }}</span>
              </div>
              <button v-if="reply.author === currentUser" class="text-[10px] text-gray-400 hover:text-red-500 px-1 rounded" @click="deleteComment(reply.id)">
                🗑️
              </button>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">
              <span v-for="(seg, i) in parseMentions(reply.content)" :key="i">
                <span v-if="seg.type === 'text'">{{ seg.text }}</span>
                <span v-else class="text-blue-500 font-medium">{{ seg.text }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 回复按钮 -->
        <button v-if="replyTo !== cmt.id" class="text-[10px] text-gray-400 hover:text-blue-500 mt-1" @click="replyTo = cmt.id">
          ↩ 回复
        </button>

        <!-- 回复输入 -->
        <div v-if="replyTo === cmt.id" class="mt-1 flex gap-1">
          <input v-model="replyText" type="text" class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500" placeholder="回复 @{{ cmt.author }}..."
            @keyup.enter="submitReply(cmt.id)" />
          <button class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200" @click="submitReply(cmt.id)">发送</button>
          <button class="text-xs px-2 py-1 text-gray-400 hover:text-gray-600" @click="replyTo = null">✕</button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <p v-else class="text-xs text-gray-400 dark:text-gray-500 mb-2">暂无评论</p>

    <!-- 新评论输入 -->
    <div class="flex gap-2">
      <input v-model="newComment" type="text" class="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" placeholder="输入评论... @提及用户"
        @keyup.enter="submitComment" />
      <button class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newComment.trim()" @click="submitComment">
        发送
      </button>
    </div>
    <p class="text-[10px] text-gray-400 mt-0.5">使用 @用户名 提及用户</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMissionCommentStore } from '@/stores/mission-comment'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  nodeId: { type: String, required: true }
})

const commentStore = useMissionCommentStore()
const userStore = useUserStore()
const currentUser = computed(() => userStore.username || '')

const newComment = ref('')
const replyTo = ref(null)
const replyText = ref('')
const editCommentId = ref(null)
const editText = ref('')

const topLevelComments = computed(() => commentStore.getTopLevelComments(props.nodeId))
const commentCount = computed(() => commentStore.getCommentCount(props.nodeId))

function getReplies(parentId) {
  return commentStore.getReplies(props.nodeId, parentId)
}

function submitComment() {
  if (!newComment.value.trim() || !currentUser.value) return
  commentStore.addComment(props.nodeId, currentUser.value, newComment.value.trim())
  newComment.value = ''
}

function submitReply(parentId) {
  if (!replyText.value.trim() || !currentUser.value) return
  commentStore.addComment(props.nodeId, currentUser.value, replyText.value.trim(), parentId)
  replyText.value = ''
  replyTo.value = null
}

function saveEdit(commentId) {
  if (!editText.value.trim()) return
  commentStore.updateComment(props.nodeId, commentId, editText.value.trim())
  editCommentId.value = null
  editText.value = ''
}

function deleteComment(commentId) {
  if (!confirm('确定删除此评论？')) return
  commentStore.deleteComment(props.nodeId, commentId)
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function parseMentions(text) {
  if (!text) return [{ type: 'text', text: '' }]
  const parts = []
  let last = 0
  const re = /(@\w+)/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', text: text.slice(last, m.index) })
    parts.push({ type: 'mention', text: m[1] })
    last = m.index + m[1].length
  }
  if (last < text.length) parts.push({ type: 'text', text: text.slice(last) })
  return parts.length ? parts : [{ type: 'text', text: text }]
}
</script>
