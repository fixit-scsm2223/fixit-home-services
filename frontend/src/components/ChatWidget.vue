<script setup>
import { computed, onMounted, ref } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { useChatStore } from '@/stores/chat'
import SidePanelDrawer from './SidePanelDrawer.vue'
import ChatPanel from './ChatPanel.vue'
import ProviderSelectPanel from './ProviderSelectPanel.vue'

const MESSAGEABLE_STATUSES = ['accepted', 'en_route', 'in_progress', 'completed', 'cost_pending', 'closed', 'reviewed']

const bookingStore = useBookingStore()
const chatStore = useChatStore()

const isOpen = ref(false)
const view = ref('select')

const eligibleProviders = computed(() => {
  const seen = new Set()
  const result = []
  for (const b of bookingStore.bookings) {
    const providerName = b.provider_name || b.provider?.name || ''
    const providerId = b.provider_id ?? b.provider?.id ?? (providerName ? `provider-${providerName}` : '')
    if (!providerId || !providerName || !MESSAGEABLE_STATUSES.includes(b.status) || seen.has(providerId)) continue
    seen.add(providerId)
    result.push({
      provider_id: providerId,
      provider_name: providerName,
      category_name: b.category_name || b.service_title || 'Service',
      status: b.status,
    })
  }

  if (!result.length) {
    for (const b of bookingStore.bookings) {
      const providerName = b.provider_name || b.provider?.name || ''
      const providerId = b.provider_id ?? b.provider?.id ?? (providerName ? `provider-${providerName}` : '')
      if (!providerId || !providerName || seen.has(providerId) || b.status === 'cancelled') continue
      seen.add(providerId)
      result.push({
        provider_id: providerId,
        provider_name: providerName,
        category_name: b.category_name || b.service_title || 'Service',
        status: b.status,
      })
      if (result.length >= 4) break
    }
  }
  return result
})

function selectProvider(providerId, providerName) {
  chatStore.openConversation(providerId, providerName)
  view.value = 'chat'
}

async function openChat() {
  if (!bookingStore.bookings.length && !bookingStore.loading) await bookingStore.loadBookings()
  const providers = eligibleProviders.value
  if (providers.length === 1) {
    selectProvider(providers[0].provider_id, providers[0].provider_name)
  } else {
    chatStore.closeConversation()
    view.value = 'select'
  }
  isOpen.value = true
}

function minimizeChat() {
  isOpen.value = false
  view.value = 'select'
}

onMounted(async () => {
  if (!bookingStore.bookings.length) await bookingStore.loadBookings()
})
</script>

<template>
  <button v-if="!isOpen" class="icon-btn" type="button" aria-label="Open chat" @click="openChat">💬</button>
  <SidePanelDrawer :open="isOpen" @close="minimizeChat">
    <ProviderSelectPanel
      v-if="view === 'select'"
      :providers="eligibleProviders"
      @select="selectProvider"
      @close="minimizeChat"
    />
    <ChatPanel v-else @close="minimizeChat" @back="view = 'select'" />
  </SidePanelDrawer>
</template>

<style scoped>
.icon-btn {
  background: var(--topbar-control-bg, var(--color-background));
  border: 1px solid var(--topbar-control-border, var(--color-border));
  padding: 7px 11px;
  border-radius: 10px;
  cursor: pointer; font-size: .95rem;
  transition: background .18s, border-color .18s;
}
.icon-btn:hover {
  background: var(--topbar-control-hover, var(--color-border));
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--topbar-control-border, var(--color-border)));
}
</style>
