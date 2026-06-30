<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import SidePanelDrawer from '@/components/SidePanelDrawer.vue'
import { useProviderStore } from '@/stores/provider'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const store = useProviderStore()
const view = ref('list')
const messageText = ref('')
const messagesContainer = ref(null)

const chatJobs = computed(() => [
  ...store.jobRequests.filter((request) => request.status === 'accepted'),
  ...store.jobs.filter((job) => !['closed', 'rejected', 'requested'].includes(job.status)),
])

const selectedJob = computed(() =>
  chatJobs.value.find((job) => String(job.id) === String(store.activeChatJobId)) || null,
)

function initials(name) {
  return String(name || 'Customer')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function statusLabel(status) {
  return String(status || 'requested').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusClass(status) {
  if (['accepted', 'reviewed', 'closed'].includes(status)) return 'status-pill-green'
  if (['en_route', 'in_progress'].includes(status)) return 'status-pill-blue'
  if (['rejected', 'cancelled'].includes(status)) return 'status-pill-red'
  return 'status-pill-amber'
}

function lastPreview(job) {
  if (String(job.id) === String(store.activeChatJobId) && store.chatMessages.length) {
    return store.chatMessages[store.chatMessages.length - 1].text
  }
  return job.status === 'requested' ? 'Start a conversation after accepting' : 'Start a conversation'
}

function lastTime(job) {
  if (String(job.id) === String(store.activeChatJobId) && store.chatMessages.length) {
    return store.chatMessages[store.chatMessages.length - 1].time
  }
  return ''
}

function hasUnread(job) {
  if (String(job.id) !== String(store.activeChatJobId) || !store.chatMessages.length) return false
  return store.chatMessages[store.chatMessages.length - 1].sender !== 'provider'
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function selectJob(job) {
  await store.fetchMessages(job.id)
  view.value = 'chat'
  scrollToBottom()
}

async function sendMessage() {
  const text = messageText.value.trim()
  if (!text || !store.activeChatJobId) return
  messageText.value = ''
  await store.sendMessage(text)
  scrollToBottom()
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function closeDrawer() {
  emit('close')
  view.value = 'list'
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    view.value = 'list'
    scrollToBottom()
  },
)

watch(() => store.chatMessages.length, scrollToBottom)
</script>

<template>
  <SidePanelDrawer :open="open" @close="closeDrawer">
    <section class="provider-message-drawer">
      <template v-if="view === 'list'">
        <header class="drawer-head">
          <button class="drawer-round-button" type="button" aria-label="Close messages" @click="closeDrawer">
            ←
          </button>
          <h3>Chats</h3>
          <span class="drawer-head-spacer"></span>
        </header>

        <div class="chat-list">
          <div v-if="!chatJobs.length" class="chat-empty-state">
            <strong>No active chats</strong>
            <span>Accept a request or open an active job to start messaging customers.</span>
          </div>

          <button
            v-for="job in chatJobs"
            :key="job.id"
            type="button"
            class="provider-chat-row"
            :class="{ active: String(store.activeChatJobId) === String(job.id) }"
            @click="selectJob(job)"
          >
            <span class="provider-chat-avatar">{{ initials(job.customerName) }}</span>
            <span class="provider-chat-copy">
              <span class="provider-chat-title-row">
                <strong>{{ job.customerName }}</strong>
                <span class="status-pill" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span>
              </span>
              <span class="provider-chat-preview">{{ lastPreview(job) }}</span>
            </span>
            <span class="provider-chat-meta">
              <small>{{ lastTime(job) }}</small>
              <i v-if="hasUnread(job)"></i>
            </span>
          </button>
        </div>
      </template>

      <template v-else>
        <header class="drawer-head">
          <button class="drawer-round-button" type="button" aria-label="Back to chats" @click="view = 'list'">
            ←
          </button>
          <h3>Messages</h3>
          <button class="drawer-round-button" type="button" aria-label="Close messages" @click="closeDrawer">
            ×
          </button>
        </header>

        <div v-if="selectedJob" class="chat-conversation">
          <div class="conversation-head">
            <span class="provider-chat-avatar compact">{{ initials(selectedJob.customerName) }}</span>
            <div>
              <strong>{{ selectedJob.customerName }}</strong>
              <span><i></i>{{ selectedJob.service }}</span>
            </div>
          </div>

          <div ref="messagesContainer" class="conversation-messages">
            <div v-if="!store.chatMessages.length" class="chat-empty-state">
              <strong>No messages yet</strong>
              <span>Send a quick update to start the conversation.</span>
            </div>

            <div
              v-for="(msg, index) in store.chatMessages"
              :key="index"
              class="message-row"
              :class="msg.sender === 'provider' ? 'outgoing' : 'incoming'"
            >
              <div class="message-bubble">
                {{ msg.text }}
                <small>{{ msg.time }}</small>
              </div>
            </div>
          </div>

          <form class="conversation-input-row" @submit.prevent="sendMessage">
            <input
              v-model="messageText"
              class="form-control"
              type="text"
              placeholder="Type a message..."
              @keydown="handleKeydown"
            />
            <button class="btn btn-primary btn-sm" type="submit">Send</button>
          </form>
        </div>
      </template>
    </section>
  </SidePanelDrawer>
</template>

<style scoped>
.provider-message-drawer {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  background: var(--color-card);
  color: var(--color-text);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  min-height: 76px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
}

.drawer-head h3 {
  font-size: 1rem;
  font-weight: 900;
}

.drawer-round-button,
.drawer-head-spacer {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
}

.drawer-round-button {
  cursor: pointer;
  border: 0;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-muted);
  font-size: 1.05rem;
  transition: var(--ease);
}

.drawer-round-button:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.chat-list,
.conversation-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.provider-chat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 78px;
  padding: 14px 20px;
  cursor: pointer;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  text-align: left;
  transition: var(--ease);
}

.provider-chat-row:hover,
.provider-chat-row.active {
  background: rgba(37, 99, 235, 0.08);
}

.provider-chat-row.active {
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.provider-chat-avatar {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 14px;
  background: var(--color-primary);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 900;
}

.provider-chat-avatar.compact {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-primary);
}

.provider-chat-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 5px;
}

.provider-chat-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.provider-chat-title-row strong {
  overflow: hidden;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-chat-title-row .status-pill {
  flex: 0 0 auto;
  padding: 3px 8px;
  font-size: 0.68rem;
}

.provider-chat-preview,
.provider-chat-meta small,
.conversation-head span,
.chat-empty-state span {
  color: var(--color-muted);
  font-size: 0.78rem;
}

.provider-chat-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-chat-meta {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 8px;
}

.provider-chat-meta i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-primary);
}

.chat-empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: 6px;
  padding: 24px;
  text-align: center;
}

.chat-empty-state strong {
  font-size: 0.98rem;
}

.chat-conversation {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.conversation-head {
  display: flex;
  align-items: center;
  gap: 11px;
  flex: 0 0 auto;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
}

.conversation-head > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.conversation-head strong {
  font-size: 0.94rem;
}

.conversation-head span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conversation-head i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
}

.conversation-messages {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 16px;
  background: var(--color-background);
}

.message-row {
  display: flex;
}

.message-row.incoming {
  justify-content: flex-start;
}

.message-row.outgoing {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 82%;
  padding: 11px 13px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-card);
  color: var(--color-text);
  font-size: 0.86rem;
  line-height: 1.4;
}

.message-row.outgoing .message-bubble {
  border-color: transparent;
  border-bottom-right-radius: 4px;
  background: var(--color-primary);
  color: #fff;
}

.message-row.incoming .message-bubble {
  border-bottom-left-radius: 4px;
}

.message-bubble small {
  display: block;
  margin-top: 5px;
  opacity: 0.7;
  text-align: right;
}

.conversation-input-row {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
  padding: 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-card);
}

.conversation-input-row .form-control {
  flex: 1;
}

@media (max-width: 520px) {
  .drawer-head,
  .conversation-head {
    padding-left: 18px;
    padding-right: 18px;
  }

  .provider-chat-row {
    padding-left: 16px;
    padding-right: 16px;
  }

  .provider-chat-title-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
