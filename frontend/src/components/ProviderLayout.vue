<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import AppSidebar from './provider/AppSidebar.vue'
import AppHeader from './provider/AppHeader.vue'
import ToastStack from './provider/ToastStack.vue'
import ProviderMessagesDrawer from './provider/ProviderMessagesDrawer.vue'
import { useProviderStore } from '@/stores/provider'
import '@/assets/provider.css'

const sidebarCollapsed = ref(false)
const nightMode = ref(localStorage.getItem('fixit-provider-theme') === 'dark')
const messagesOpen = ref(false)
const store = useProviderStore()

onMounted(() => {
  // Try to sync with backend — silently falls back to empty state if unavailable
  store.bootstrap().catch(() => {})
  window.addEventListener('fixit-provider-theme-change', syncThemeFromSettings)
})

onBeforeUnmount(() => {
  window.removeEventListener('fixit-provider-theme-change', syncThemeFromSettings)
})

watch(nightMode, (enabled) => {
  localStorage.setItem('fixit-provider-theme', enabled ? 'dark' : 'light')
}, { immediate: true })

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function syncThemeFromSettings(event) {
  nightMode.value = event.detail?.dark ?? event.detail?.theme === 'dark'
}

function toggleTheme() {
  nightMode.value = !nightMode.value
}

function openMessages() {
  messagesOpen.value = true
}
</script>

<template>
  <div class="provider-module app-shell" :class="{ 'night-mode': nightMode }">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />

    <div class="app-viewport">
      <AppHeader
        :night-mode="nightMode"
        @toggle-theme="toggleTheme"
        @open-messages="openMessages"
      />

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ToastStack />
    <ProviderMessagesDrawer :open="messagesOpen" @close="messagesOpen = false" />
  </div>
</template>
