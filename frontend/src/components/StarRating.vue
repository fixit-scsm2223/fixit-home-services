<script setup>
// Read-only star rating. value is 0–5 (can be fractional).
const props = defineProps({
  value: { type: Number, default: 0 },
  count: { type: Number, default: null }, // optional review count
})

function starType(i) {
  const v = props.value
  if (v >= i) return 'full'
  if (v >= i - 0.5) return 'half'
  return 'empty'
}
</script>

<template>
  <span class="star-rating" :aria-label="`Rated ${value} out of 5`">
    <span v-for="i in 5" :key="i" class="star" :class="starType(i)">★</span>
    <span class="rating-value">{{ value.toFixed(1) }}</span>
    <span v-if="count != null" class="muted rating-count">({{ count }})</span>
  </span>
</template>

<style scoped>
.star-rating { display: inline-flex; align-items: center; gap: 1px; font-size: 0.95rem; }
.star { color: var(--color-border); line-height: 1; }
.star.full { color: var(--color-warning); }
.star.half {
  background: linear-gradient(90deg, var(--color-warning) 50%, var(--color-border) 50%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.rating-value { margin-left: 6px; font-weight: 700; font-size: 0.85rem; color: var(--color-text); }
.rating-count { margin-left: 4px; font-size: 0.78rem; }
</style>
