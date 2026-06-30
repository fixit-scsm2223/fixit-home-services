<script setup>
import { computed } from 'vue'

const props = defineProps({
  booking: { type: Object, required: true },
})
defineEmits(['view'])

const STATUS_META = {
  requested:    { label: 'Pending',             class: 'badge-ui-warning'  },
  accepted:     { label: 'Confirmed',           class: 'badge-ui-success'  },
  in_progress:  { label: 'In progress',         class: 'badge-ui-primary'  },
  completed:    { label: 'Awaiting final cost',  class: 'badge-ui-warning'  },
  cost_pending: { label: 'Confirm cost',        class: 'badge-ui-warning'  },
  closed:       { label: 'Payment due',         class: 'badge-ui-warning'  },
  reviewed:     { label: 'Reviewed',            class: 'badge-ui-success'  },
  cancelled:    { label: 'Cancelled',           class: 'badge-ui-danger'   },
}

const meta = computed(() => STATUS_META[props.booking.status] || STATUS_META.requested)

// Payment is only due after cost is confirmed (status === 'closed') and not yet paid
const needsPayment = computed(() =>
  props.booking.status === 'closed' && props.booking.payment_status !== 'paid'
)

const needsAttention = computed(() =>
  props.booking.status === 'cost_pending' || needsPayment.value
)
</script>

<template>
  <article class="booking-card" :class="{ attention: needsAttention }">
    <div class="bc-main">
      <div class="bc-title-row">
        <h4>{{ booking.provider_name }}</h4>
        <span class="badge-ui" :class="meta.class">{{ meta.label }}</span>
        <span v-if="needsPayment" class="badge-ui badge-ui-pay">💳 Payment due</span>
        <span v-if="booking.is_recurring" class="tag-pill bc-recurring">🔄 Recurring</span>
      </div>
      <p class="muted bc-category">{{ booking.category_name }}</p>
      <p class="muted bc-meta">🗓️ {{ booking.scheduled_at }} &nbsp;•&nbsp; 📍 {{ booking.address }}</p>
    </div>
    <div class="bc-side">
      <div class="bc-cost">
        <small class="muted">{{ booking.final_cost != null ? 'Final cost' : 'Estimated' }}</small>
        <strong>RM {{ booking.final_cost ?? booking.estimated_cost }}</strong>
      </div>
      <button class="btn-ui btn-ui-primary btn-ui-sm" @click="$emit('view', booking)">
        {{ needsPayment ? 'Pay now' : needsAttention ? 'Action needed' : 'View ticket' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.booking-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.booking-card.attention { border-color: var(--color-warning); }
.bc-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.bc-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.bc-title-row h4 { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.bc-recurring { background: var(--color-background); }
.bc-category { font-size: 0.85rem; }
.bc-meta { font-size: 0.8rem; }
.bc-side { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.bc-cost { text-align: right; display: flex; flex-direction: column; }
.bc-cost strong { font-size: 1.05rem; color: var(--color-text); }
.badge-ui-primary { background: rgba(37, 99, 235, 0.12); color: var(--color-primary); }
body.night-mode-active .badge-ui-primary { background: rgba(37, 99, 235, 0.22); color: #93C5FD; }
.badge-ui-pay { background: rgba(234, 88, 12, 0.12); color: #ea580c; font-weight: 800; }
body.night-mode-active .badge-ui-pay { background: rgba(234, 88, 12, 0.22); color: #fb923c; }

@media (max-width: 640px) {
  .booking-card { flex-direction: column; align-items: stretch; }
  .bc-side { justify-content: space-between; }
}
</style>
