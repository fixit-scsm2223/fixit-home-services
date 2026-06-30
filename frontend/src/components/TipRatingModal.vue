<script setup>
import { ref } from 'vue'
import StarRatingInput from '@/components/StarRatingInput.vue'

const props = defineProps({
  job: { type: Object, required: true },
})
const emit = defineEmits(['submit', 'close'])

const TIP_PRESETS = [0, 5, 10, 20]

const rating = ref(0)
const comment = ref('')
const tipAmount = ref(0)
const customTip = ref('')

function pickTip(amount) {
  tipAmount.value = amount
  customTip.value = ''
}

function onCustomTip() {
  const n = Number(customTip.value)
  tipAmount.value = Number.isFinite(n) && n > 0 ? n : 0
}

function submit() {
  if (!rating.value) return
  emit('submit', { rating: rating.value, comment: comment.value, tipAmount: tipAmount.value })
}
</script>

<template>
  <div class="trm-overlay" @click.self="$emit('close')">
    <div class="trm-card">
      <div class="trm-head">
        <h3>How was your service?</h3>
        <button class="trm-close" @click="$emit('close')">✕</button>
      </div>
      <p class="muted trm-sub">Rate {{ job.provider_name }} for the {{ job.category_name }} job</p>

      <div class="trm-stars">
        <StarRatingInput v-model="rating" />
      </div>

      <textarea
        v-model="comment"
        class="form-input-element-control trm-textarea"
        rows="3"
        placeholder="Share a few words about your experience (optional)"
      ></textarea>

      <div class="trm-tip-section">
        <label class="trm-label">Add a tip</label>
        <div class="chip-row">
          <button
            v-for="amt in TIP_PRESETS" :key="amt"
            type="button"
            class="btn-chip"
            :class="{ active: tipAmount === amt && !customTip }"
            @click="pickTip(amt)"
          >{{ amt === 0 ? 'No tip' : `RM ${amt}` }}</button>
        </div>
        <input
          v-model="customTip"
          @input="onCustomTip"
          type="number" min="0" step="1"
          class="form-input-element-control trm-custom-tip"
          placeholder="Custom amount (RM)"
        />
      </div>

      <div class="trm-actions">
        <button class="btn-ui btn-ui-ghost" @click="$emit('close')">Skip</button>
        <button class="btn-ui btn-ui-primary" :disabled="!rating" @click="submit">Submit review</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--spacing-md);
}
.trm-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}
.trm-head { display: flex; align-items: center; justify-content: space-between; }
.trm-head h3 { font-size: 1.1rem; font-weight: 800; color: var(--color-text); }
.trm-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--color-muted); }
.trm-sub { margin-top: -8px; font-size: 0.85rem; }
.trm-stars { display: flex; justify-content: center; padding: 4px 0; }
.trm-textarea { width: 100%; resize: vertical; }
.trm-tip-section { display: flex; flex-direction: column; gap: 8px; }
.trm-label { font-size: 0.85rem; font-weight: 700; color: var(--color-text); }
.btn-chip.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.trm-custom-tip { width: 100%; }
.trm-actions { display: flex; justify-content: flex-end; gap: 10px; }
</style>
