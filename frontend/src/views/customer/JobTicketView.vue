<script setup>
import { useRouter } from 'vue-router'
import JobTicketPanel from '@/components/JobTicketPanel.vue'

defineProps({
  id: { type: [String, Number], required: true },
})

const router = useRouter()
</script>

<template>
  <div class="job-ticket-view">
    <button class="back-link" @click="router.push({ name: 'my-bookings' })">← Back to My Bookings</button>
    <div class="ticket-frame">
      <JobTicketPanel :id="id" @close="router.push({ name: 'my-bookings' })" />
    </div>
  </div>
</template>

<style scoped>
.job-ticket-view { width: min(1120px, 100%); margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-md); }
.back-link { align-self: flex-start; background: none; border: none; cursor: pointer; color: var(--color-primary); font-weight: 600; font-size: 0.85rem; padding: 0; }
.ticket-frame {
  background: var(--color-card);
  border: 0;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 400px;
  box-shadow: var(--shadow-lg);
}
</style>
