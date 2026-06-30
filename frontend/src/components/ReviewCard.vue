<script setup>
import StarRating from '@/components/StarRating.vue'

defineProps({
  review: { type: Object, required: true },
})
</script>

<template>
  <article class="review-card">
    <div class="rc-head">
      <h4>{{ review.provider_name }}</h4>
      <StarRating :value="review.rating" />
    </div>
    <p class="rc-comment">{{ review.comment }}</p>
    <div class="rc-foot">
      <span class="muted">{{ review.created_at }}</span>
      <span v-if="review.tip_amount" class="tag-pill rc-tip">💸 Tipped RM {{ review.tip_amount }}</span>
    </div>
  </article>
</template>

<style scoped>
.review-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rc-head h4 { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.rc-comment { font-size: 0.9rem; color: var(--color-text); line-height: 1.4; }
.rc-foot { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; }
.rc-tip { background: var(--color-background); }
</style>
