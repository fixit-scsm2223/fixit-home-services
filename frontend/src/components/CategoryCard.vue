<script setup>
import { computed } from 'vue'

const props = defineProps({
  category: { type: Object, required: true },
})
defineEmits(['select'])

const PALETTE = [
  { bg: '#DBEAFE', color: '#2563EB', glow: '#60A5FA' },
  { bg: '#FEF3C7', color: '#D97706', glow: '#FBBF24' },
  { bg: '#DCFCE7', color: '#059669', glow: '#34D399' },
  { bg: '#FFE4E6', color: '#E11D48', glow: '#FB7185' },
  { bg: '#E0F2FE', color: '#0284C7', glow: '#38BDF8' },
  { bg: '#F3E8FF', color: '#7E22CE', glow: '#C084FC' },
]

const theme = computed(() => PALETTE[(props.category.id ?? 0) % PALETTE.length])
const categoryMark = computed(() => {
  const parts = String(props.category.name || '')
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return 'FI'
  if (parts[0].length <= 3) return parts[0].slice(0, 2).toUpperCase()

  return parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})
</script>

<template>
  <button
    class="category-card"
    :style="{ '--cat-bg': theme.bg, '--cat-color': theme.color, '--cat-glow': theme.glow }"
    type="button"
    @click="$emit('select', category)"
  >
    <div class="cat-icon" aria-hidden="true">
      <span class="cat-mark">{{ categoryMark }}</span>
    </div>
    <div class="cat-copy">
      <h4 class="cat-title">{{ category.name }}</h4>
      <p class="cat-desc">{{ category.description }}</p>
    </div>
    <span class="cat-action" aria-hidden="true">
      <span>View</span>
      <strong>-></strong>
    </span>
  </button>
</template>

<style scoped>
.category-card {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 104px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--color-border) 72%, var(--cat-color));
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 18% 8%, color-mix(in srgb, var(--cat-bg) 82%, transparent), transparent 38%),
    linear-gradient(145deg, color-mix(in srgb, var(--color-card) 94%, #ffffff 6%), color-mix(in srgb, var(--color-card) 86%, var(--cat-bg))),
    var(--color-card);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition: var(--transition-smooth);
  font-family: var(--font-main);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.category-card::before {
  content: "";
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: calc(var(--radius-lg) - 1px);
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.26), transparent 34%),
    radial-gradient(circle at 78% 110%, color-mix(in srgb, var(--cat-glow) 34%, transparent), transparent 42%);
  opacity: .8;
  pointer-events: none;
}

.category-card::after {
  content: "";
  position: absolute;
  width: 118px;
  height: 118px;
  right: -54px;
  bottom: -64px;
  border: 22px solid color-mix(in srgb, var(--cat-glow) 30%, transparent);
  border-radius: 50%;
  opacity: .65;
  pointer-events: none;
  transition: var(--transition-smooth);
}

.category-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--cat-color) 70%, var(--color-border));
  box-shadow: 0 22px 50px color-mix(in srgb, var(--cat-color) 16%, rgba(15, 23, 42, 0.16));
}

.category-card:hover::after {
  transform: translate(-8px, -6px) scale(1.08);
  opacity: .82;
}

.category-card:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--cat-color) 42%, transparent);
  outline-offset: 3px;
}

.cat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border: 1px solid color-mix(in srgb, #ffffff 34%, transparent);
  border-radius: 17px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, .28), transparent 42%),
    linear-gradient(135deg, var(--cat-color), color-mix(in srgb, var(--cat-color) 66%, #14b8a6));
  color: #fff;
  box-shadow:
    0 16px 28px color-mix(in srgb, var(--cat-color) 28%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, .26);
  transition: var(--transition-smooth);
}

.category-card:hover .cat-icon {
  transform: scale(1.04);
  box-shadow:
    0 18px 34px color-mix(in srgb, var(--cat-color) 34%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, .3);
}

.cat-mark {
  font-size: .8rem;
  font-weight: 950;
  letter-spacing: .03em;
}

.cat-copy {
  min-width: 0;
}

.cat-title {
  margin: 0;
  color: var(--color-text);
  font-size: 1.02rem;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.cat-desc {
  margin: 6px 0 0;
  color: var(--color-muted);
  font-size: .82rem;
  line-height: 1.38;
  max-width: 18ch;
}

.cat-action {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--cat-color);
  font-size: .74rem;
  font-weight: 900;
  letter-spacing: .01em;
  padding: 7px 9px;
  border: 1px solid color-mix(in srgb, var(--cat-color) 22%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cat-bg) 58%, transparent);
  opacity: .9;
  transition: var(--transition-smooth);
  white-space: nowrap;
}

.cat-action strong {
  font-size: .78rem;
  line-height: 1;
}

.category-card:hover .cat-action {
  background: var(--cat-color);
  border-color: var(--cat-color);
  color: #fff;
  transform: translateX(2px);
}

body.night-mode-active .category-card {
  background:
    radial-gradient(circle at 18% 4%, color-mix(in srgb, var(--cat-color) 34%, transparent), transparent 38%),
    linear-gradient(145deg, color-mix(in srgb, var(--color-card) 78%, var(--cat-color) 22%), color-mix(in srgb, var(--color-card) 88%, #020617 12%)),
    var(--color-card);
  border-color: color-mix(in srgb, var(--cat-color) 28%, var(--color-border));
  box-shadow: 0 18px 42px rgba(0, 0, 0, .3);
}

body.night-mode-active .category-card::before {
  background:
    linear-gradient(115deg, rgba(255, 255, 255, 0.12), transparent 34%),
    radial-gradient(circle at 78% 110%, color-mix(in srgb, var(--cat-glow) 28%, transparent), transparent 42%);
}

body.night-mode-active .cat-action {
  background: color-mix(in srgb, var(--cat-color) 18%, rgba(15, 23, 42, .7));
  border-color: color-mix(in srgb, var(--cat-color) 36%, var(--color-border));
}

@media (max-width: 620px) {
  .category-card {
    grid-template-columns: 52px minmax(0, 1fr) auto;
    min-height: 96px;
    padding: 15px;
  }

  .cat-icon {
    width: 50px;
    height: 50px;
  }

  .cat-action span {
    display: none;
  }
}
</style>
