// ============================================================
// FixIt — Chat Store
// Conversation threads between the customer and providers,
// keyed by provider id. Conversations are opened on demand via
// openConversation() — no seed data.
// ============================================================

import { defineStore } from 'pinia'

let nextMessageId = 100

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const AUTO_REPLIES = [
  'Got it, see you then!',
  'Sounds good 👍',
  'Noted, thank you!',
  'Sure, I will be there on time.',
]

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: {},
    activeProviderId: null,
  }),
  getters: {
    activeConversation(state) {
      return state.activeProviderId ? state.conversations[state.activeProviderId] : null
    },
  },
  actions: {
    openConversation(providerId, providerName) {
      if (!this.conversations[providerId]) {
        this.conversations[providerId] = {
          providerId,
          providerName,
          online: true,
          messages: [],
        }
      }
      this.activeProviderId = providerId
    },
    closeConversation() {
      this.activeProviderId = null
    },
    sendMessage(text) {
      const convo = this.activeConversation
      if (!convo || !text.trim()) return

      convo.messages.push({ id: nextMessageId++, sender: 'customer', text: text.trim(), time: timeNow() })

      setTimeout(() => {
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
        convo.messages.push({ id: nextMessageId++, sender: 'provider', text: reply, time: timeNow() })
      }, 900)
    },
  },
})
