<script setup>
// Interactive star picker (1-5, whole stars) for the review/tip prompt.
// Counterpart to the read-only StarRating.vue used elsewhere in the app.
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue'])

const hovered = ref(0)

function pick(i) {
  emit('update:modelValue', i)
}
</script>

<template>
  <span class="star-input" @mouseleave="hovered = 0">
    <button
      v-for="i in 5" :key="i"
      type="button"
      class="star-btn"
      :class="{ filled: (hovered || modelValue) >= i }"
      @mouseenter="hovered = i"
      @click="pick(i)"
    >★</button>
  </span>
</template>

<style scoped>
.star-input { display: inline-flex; gap: 4px; }
.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--color-border);
  padding: 0;
  transition: color .12s, transform .12s;
}
.star-btn:hover { transform: scale(1.1); }
.star-btn.filled { color: var(--color-warning); }
</style>
