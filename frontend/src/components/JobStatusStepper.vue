<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
})

const STEPS = [
  { key: 'requested',     label: 'Requested'   },
  { key: 'accepted',      label: 'Confirmed'   },
  { key: 'en_route',      label: 'En Route'    },
  { key: 'in_progress',   label: 'In Progress' },
  { key: 'cost_pending',  label: 'Cost Review' },
  { key: 'closed',        label: 'Done'        },
]

const stepIndex = computed(() => {
  const s = props.status
  if (s === 'requested')                       return 0   // step 1
  if (s === 'accepted')                        return 1   // step 2
  if (s === 'en_route')                        return 2   // step 3
  if (s === 'in_progress')                     return 3   // step 4
  if (s === 'completed' || s === 'cost_pending') return 4 // step 5
  if (s === 'closed'    || s === 'reviewed')   return 5   // step 6
  return 0
})

const isCancelled = computed(() => props.status === 'cancelled')
</script>

<template>
  <div class="status-stepper" :class="{ cancelled: isCancelled }">
    <template v-if="isCancelled">
      <span class="cancelled-badge">✕ Booking cancelled</span>
    </template>
    <template v-else>
      <div
        v-for="(step, i) in STEPS"
        :key="step.key"
        class="step"
        :class="{ done: i < stepIndex, active: i === stepIndex, future: i > stepIndex }"
      >
        <div class="step-dot">{{ i < stepIndex ? '✓' : i + 1 }}</div>
        <span class="step-label">{{ step.label }}</span>
        <div v-if="i < STEPS.length - 1" class="step-line" :class="{ done: i < stepIndex }"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.status-stepper {
  display: flex;
  align-items: flex-start;
  width: 100%;
}
.cancelled-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-danger);
  font-weight: 800;
  font-size: .9rem;
}
.step {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-width: 0;
}
.step-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .86rem;
  font-weight: 900;
  background: var(--color-card);
  border: 3px solid var(--color-border);
  color: var(--color-muted);
  z-index: 1;
}
.step.done .step-dot {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}
.step.active .step-dot {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
  animation: step-pulse 2s infinite;
}
@keyframes step-pulse {
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, .45); }
  70% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}
.step.future .step-dot {
  background: var(--color-background);
}
.step-label {
  margin-top: 7px;
  max-width: 110px;
  font-size: .72rem;
  font-weight: 800;
  color: var(--color-muted);
  line-height: 1.25;
  text-align: center;
}
.step.active .step-label,
.step.done .step-label {
  color: var(--color-text);
}
.step-line {
  position: absolute;
  top: 17px;
  left: 50%;
  width: 100%;
  height: 3px;
  background: var(--color-border);
  z-index: 0;
}
.step-line.done {
  background: var(--color-success);
}

@media (max-width: 560px) {
  .status-stepper {
    display: grid;
    gap: 12px;
  }
  .step {
    min-height: 42px;
    align-items: flex-start;
    flex-direction: row;
    gap: 12px;
    padding-left: 2px;
  }
  .step-label {
    margin-top: 7px;
    max-width: none;
    text-align: left;
  }
  .step-line {
    top: 34px;
    left: 17px;
    width: 3px;
    height: calc(100% - 18px);
  }
}
</style>
