<script setup>
import { useProviderStore } from '@/stores/provider'
const store = useProviderStore()
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        class="toast-card"
        :class="t.variant"
      >
        <span>⚙️</span>
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-leave-to { opacity:0; transform:translateY(12px); }
</style>
