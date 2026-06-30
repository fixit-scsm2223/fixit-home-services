<script setup>
import { nextTick, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

const emit = defineEmits(['close', 'back'])

const chatStore = useChatStore()
const draft = ref('')
const messagesEl = ref(null)
const inputEl = ref(null)

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function send() {
  const text = String(draft.value || inputEl.value?.value || '').trim()
  if (!text) return
  chatStore.sendMessage(text)
  draft.value = ''
  if (inputEl.value) inputEl.value.value = ''
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

watch(() => chatStore.activeConversation?.messages.length, scrollToBottom, { immediate: true })
</script>

<template>
  <div class="chat-panel-inner">
    <header class="panel-head">
      <button class="panel-back" type="button" aria-label="Back to providers" @click="emit('back')">←</button>
      <h3 class="panel-title">Messages</h3>
      <button class="panel-close" type="button" aria-label="Close chat" @click="emit('close')">✕</button>
    </header>

    <div v-if="chatStore.activeConversation" class="chat-panel-body">
      <div class="chat-head-detail">
        <div class="chat-avatar">{{ initials(chatStore.activeConversation.providerName) }}</div>
        <div>
          <strong class="chat-name">{{ chatStore.activeConversation.providerName }}</strong>
          <p class="chat-status"><span class="status-dot"></span>Active now</p>
        </div>
      </div>

      <div ref="messagesEl" class="chat-messages">
        <div
          v-for="m in chatStore.activeConversation.messages"
          :key="m.id"
          class="chat-bubble-row"
          :class="m.sender"
        >
          <div class="chat-bubble">
            {{ m.text }}
            <span class="chat-time">{{ m.time }}</span>
          </div>
        </div>
      </div>

      <form class="chat-input-row" @submit.prevent="send">
        <input
          ref="inputEl"
          v-model="draft"
          type="text"
          class="chat-input"
          placeholder="Type a message…"
        />
        <button type="submit" class="btn-ui btn-ui-primary btn-ui-sm">Send</button>
      </form>
    </div>

    <div v-else class="chat-panel-body chat-empty-state">
      <div class="chat-empty-card">
        <strong>No conversation selected</strong>
        <p class="muted">Choose a provider from your booking messages to start chatting.</p>
        <button class="btn-ui btn-ui-primary btn-ui-sm" type="button" @click="emit('back')">Choose provider</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 0;
  background: var(--color-card);
  color: var(--color-text);
}

/* Mirrors JobTicketPanel.vue's .panel-head/.panel-title/.panel-close exactly,
   so the chat drawer's header chrome matches the ticket drawer's. */
.panel-head {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}
.panel-title { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.panel-back {
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
.panel-back:hover { background: var(--color-border); color: var(--color-text); }
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

.chat-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-card);
}

.chat-empty-state {
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.chat-empty-card {
  display: grid;
  gap: 10px;
  width: min(100%, 300px);
  padding: 22px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.chat-empty-card strong {
  color: var(--color-text);
}

.chat-head-detail {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}
.chat-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 0.85rem;
  flex-shrink: 0;
}
.chat-name { font-size: 0.92rem; font-weight: 700; display: block; color: var(--color-text); }
.chat-status { font-size: 0.74rem; color: var(--color-muted); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-success); display: inline-block; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-background);
}

.chat-bubble-row { display: flex; }
.chat-bubble-row.customer { justify-content: flex-end; }
.chat-bubble-row.provider { justify-content: flex-start; }

.chat-bubble {
  max-width: 80%;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  line-height: 1.35;
  background: var(--color-card);
  color: var(--color-text);
  border: 2px solid var(--color-border);
  position: relative;
}
.chat-bubble-row.customer .chat-bubble {
  background: var(--color-primary);
  color: #fff;
  border-color: transparent;
  border-bottom-right-radius: 4px;
}
.chat-bubble-row.provider .chat-bubble {
  border-bottom-left-radius: 4px;
}
.chat-time {
  display: block;
  margin-top: 4px;
  font-size: 0.65rem;
  opacity: 0.7;
  text-align: right;
}

.chat-input-row {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 2px solid var(--color-border);
  background: var(--color-card);
}
.chat-input {
  flex: 1;
  border: 2px solid var(--color-border);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-family: var(--font-main);
  background: var(--color-background);
  color: var(--color-text);
  outline: none;
}
.chat-input:focus { border-color: var(--color-primary); }
</style>
