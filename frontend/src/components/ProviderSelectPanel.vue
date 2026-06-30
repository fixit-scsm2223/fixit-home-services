<script setup>
import { useChatStore } from '@/stores/chat'

defineProps({
  providers: { type: Array, default: () => [] },
})
const emit = defineEmits(['select', 'close'])

const chatStore = useChatStore()

const STATUS_BADGE = {
  requested: 'badge-ui-warning',
  accepted: 'badge-ui-success',
  in_progress: 'badge-ui-warning',
}
const STATUS_LABEL = {
  requested: 'Requested',
  accepted: 'Accepted',
  in_progress: 'In Progress',
}
const AVATAR_COLORS = ['#EE4D2D', '#2563EB', '#16A34A', '#9333EA', '#DB2777', '#0D9488']

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}
function avatarColor(providerId) {
  return AVATAR_COLORS[providerId % AVATAR_COLORS.length]
}
function lastMessage(providerId) {
  const convo = chatStore.conversations[providerId]
  if (!convo || !convo.messages.length) return 'Start a conversation'
  return convo.messages[convo.messages.length - 1].text
}
function lastTime(providerId) {
  const convo = chatStore.conversations[providerId]
  if (!convo || !convo.messages.length) return ''
  return convo.messages[convo.messages.length - 1].time
}
function isUnread(providerId) {
  const convo = chatStore.conversations[providerId]
  if (!convo || !convo.messages.length) return false
  return convo.messages[convo.messages.length - 1].sender === 'provider'
}
</script>

<template>
  <div class="select-panel-inner">
    <header class="panel-head">
      <button class="panel-close panel-close-left" type="button" aria-label="Close" @click="emit('close')">←</button>
      <h3 class="panel-title">Chats</h3>
      <span class="panel-head-spacer"></span>
    </header>

    <div class="select-panel-body">
      <div v-if="!providers.length" class="select-empty">
        <p class="muted">No active bookings to message about.</p>
      </div>
      <button
        v-for="p in providers"
        :key="p.provider_id"
        type="button"
        class="chat-row"
        @click="emit('select', p.provider_id, p.provider_name)"
      >
        <div class="chat-row-avatar" :style="{ background: avatarColor(p.provider_id) }">{{ initials(p.provider_name) }}</div>
        <div class="chat-row-info">
          <div class="chat-row-top">
            <strong class="chat-row-name">{{ p.provider_name }}</strong>
            <span class="badge-ui chat-row-status" :class="STATUS_BADGE[p.status]">{{ STATUS_LABEL[p.status] }}</span>
          </div>
          <p class="chat-row-preview muted">{{ lastMessage(p.provider_id) }}</p>
        </div>
        <div class="chat-row-meta">
          <span class="chat-row-time muted">{{ lastTime(p.provider_id) }}</span>
          <span v-if="isUnread(p.provider_id)" class="chat-row-dot"></span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.select-panel-inner { display: flex; flex-direction: column; height: 100%; flex: 1; min-width: 0; }

.panel-head {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}
.panel-title { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.panel-close {
  width: 30px; height: 30px;
  border-radius: 50%;
  border: none;
  background: var(--color-background);
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.panel-close:hover { background: var(--color-border); color: var(--color-text); }
.panel-close-left { font-size: 1.1rem; }
.panel-head-spacer { width: 30px; height: 30px; flex-shrink: 0; }

.select-panel-body { flex: 1; overflow-y: auto; padding: 0; display: flex; flex-direction: column; }
.select-empty { padding: var(--spacing-lg); text-align: center; }

.chat-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  text-align: left;
  font-family: var(--font-main);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--color-border);
  padding: 14px var(--spacing-lg);
  cursor: pointer;
  transition: var(--transition-smooth);
}
.chat-row:hover { background: var(--color-background); }

.chat-row-avatar {
  width: 48px; height: 48px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-weight: 800; font-size: 0.95rem;
}

.chat-row-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.chat-row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.chat-row-name { font-size: 0.92rem; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-row-status { flex-shrink: 0; font-size: 0.68rem; padding: 2px 8px; }
.chat-row-preview { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.chat-row-meta { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.chat-row-time { font-size: 0.72rem; }
.chat-row-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--color-primary); display: inline-block; }

@media (max-width: 480px) {
  .chat-row-avatar { width: 40px; height: 40px; }
}
</style>
