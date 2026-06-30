<script setup>
import { computed, ref } from 'vue'
import StarRating from './StarRating.vue'

const props = defineProps({
  provider: { type: Object, required: true },
})
const emit = defineEmits(['view', 'book'])

const isVerified = computed(() => props.provider.verification_status === 'verified')
const isTopRated = computed(() => Number(props.provider.rating || 0) >= 4.8 && Number(props.provider.total_reviews || 0) >= 50)
const isNew = computed(() => Number(props.provider.total_reviews || 0) < 25)
const isNearby = computed(() => props.provider.distance != null && Number(props.provider.distance) <= 2)

const saved = ref(false)
function toggleSave() {
  saved.value = !saved.value
}

function bookNow() {
  if (isVerified.value) emit('book', props.provider)
}

// Cycled per-card accent so the marketplace grid reads as lively, not flat.
const PALETTE = [
  { banner: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59,130,246,0.35)', avatarBg: '#DBEAFE', avatarColor: '#2563EB' },
  { banner: 'linear-gradient(135deg, #2DD4BF, #059669)', glow: 'rgba(45,212,191,0.35)', avatarBg: '#CCFBF1', avatarColor: '#0F766E' },
  { banner: 'linear-gradient(135deg, #FBBF24, #D97706)', glow: 'rgba(251,191,36,0.35)', avatarBg: '#FEF3C7', avatarColor: '#B45309' },
  { banner: 'linear-gradient(135deg, #4ADE80, #16A34A)', glow: 'rgba(74,222,128,0.35)', avatarBg: '#DCFCE7', avatarColor: '#15803D' },
  { banner: 'linear-gradient(135deg, #38BDF8, #2563EB)', glow: 'rgba(56,189,248,0.35)', avatarBg: '#E0F2FE', avatarColor: '#0369A1' },
  { banner: 'linear-gradient(135deg, #F472B6, #DB2777)', glow: 'rgba(244,114,182,0.35)', avatarBg: '#FCE7F3', avatarColor: '#BE185D' },
]

const SERVICE_ICONS = {
  Plumbing: '🚰',
  Electrical: '⚡',
  Cleaning: '🧹',
  Gardening: '🏡',
  Painting: '🎨',
  Carpentry: '🪚',
  'AC Service': '❄️',
}

const theme = computed(() => PALETTE[props.provider.id % PALETTE.length])
const serviceIcon = computed(() => SERVICE_ICONS[props.provider.service] || '🛠️')

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}
</script>

<template>
  <article
    class="provider-card"
    :style="{ '--card-glow': theme.glow }"
    @click="$emit('view', provider)"
  >
    <div class="pc-banner" :style="{ background: theme.banner }">
      <div class="pc-banner-pattern" aria-hidden="true"></div>
      <span class="pc-service-icon" aria-hidden="true">{{ serviceIcon }}</span>

      <div class="pc-banner-badges">
        <span v-if="provider.distance != null" class="pc-distance">
          <span class="pc-pin">📍</span>{{ Number(provider.distance).toFixed(1) }} km
        </span>
        <span v-if="isNearby" class="pc-pill pc-pill-nearby">⚡ Nearby</span>
        <span v-if="isTopRated" class="pc-pill pc-pill-top">⭐ Top Rated</span>
        <span v-if="isNew" class="pc-pill pc-pill-new">✨ New</span>
      </div>

      <button
        class="pc-fav"
        :class="{ 'is-saved': saved }"
        type="button"
        :aria-label="saved ? 'Remove from saved' : 'Save provider'"
        @click.stop="toggleSave"
      >{{ saved ? '♥' : '♡' }}</button>
    </div>

    <!-- Avatar sits on top of the card (not the banner) so it can overhang
         the banner edge without being clipped by the banner's overflow. -->
    <div class="pc-avatar-wrap">
      <div class="pc-avatar" :style="{ background: theme.avatarBg, color: theme.avatarColor }">
        {{ initials(provider.name) }}
      </div>
      <span v-if="isVerified" class="pc-avatar-check" aria-label="Verified provider"></span>
    </div>

    <div class="pc-body">
      <div class="pc-title-row">
        <h4 class="pc-name">{{ provider.name }}</h4>
        <span class="badge-ui" :class="isVerified ? 'badge-ui-success' : 'badge-ui-warning'">
          {{ isVerified ? '✓ Verified' : 'Pending' }}
        </span>
      </div>
      <p class="muted pc-service">{{ provider.service }} specialist</p>

      <div class="pc-meta">
        <StarRating :value="Number(provider.rating || 0)" :count="provider.total_reviews" />
      </div>
      <p class="muted pc-loc"><span class="pc-loc-icon">📍</span>{{ provider.location }}</p>

      <div class="pc-tags" v-if="provider.tags?.length">
        <span v-for="t in provider.tags.slice(0, 3)" :key="t" class="tag-pill">{{ t }}</span>
        <span v-if="provider.tags.length > 3" class="tag-pill tag-pill-more">+{{ provider.tags.length - 3 }}</span>
      </div>

      <div class="pc-stats">
        <div class="pc-stat">
          <span class="pc-stat-icon">💬</span>
          <div>
            <span class="pc-stat-value">{{ provider.total_reviews || 0 }}</span>
            <span class="pc-stat-label">reviews</span>
          </div>
        </div>
        <div class="pc-stat-divider"></div>
        <div class="pc-stat">
          <span class="pc-stat-icon">⏱️</span>
          <div>
            <span class="pc-stat-value">~30m</span>
            <span class="pc-stat-label">response</span>
          </div>
        </div>
      </div>

      <div class="pc-footer">
        <div class="pc-rate">
          <small class="muted pc-rate-label">Starts from</small>
          <span class="pc-rate-value">RM {{ provider.base_rate }}</span>
        </div>
        <div class="pc-actions">
          <button
            type="button"
            class="btn-ui btn-ui-outline pc-view-btn"
            @click.stop="$emit('view', provider)"
          >
            View
          </button>
          <button
            type="button"
            class="btn-ui btn-ui-primary pc-book-btn"
            :disabled="!isVerified"
            :title="isVerified ? 'Book this provider' : 'Available to book once verified'"
            @click.stop="bookNow"
          >
            Book now →
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.provider-card {
  --card-glow: rgba(37, 99, 235, 0.35);
  position: relative;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: var(--transition-smooth);
  cursor: pointer;
}
.provider-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  pointer-events: none;
  box-shadow: 0 0 0 0 var(--card-glow);
  transition: box-shadow 0.3s ease;
}
.provider-card:hover {
  transform: translateY(-4px);
  border-color: transparent;
  box-shadow: 0 18px 40px -16px var(--card-glow), 0 4px 12px rgba(0, 0, 0, 0.12);
}
.provider-card:hover::after {
  box-shadow: 0 0 0 2px var(--card-glow);
}

.pc-banner {
  position: relative;
  height: 110px;
  flex-shrink: 0;
  overflow: hidden;
}
.pc-banner-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12) 0, transparent 35%);
  pointer-events: none;
}
.pc-service-icon {
  position: absolute;
  right: -14px;
  bottom: -22px;
  font-size: 5rem;
  opacity: 0.18;
  filter: blur(0.2px);
  pointer-events: none;
  transform: rotate(-12deg);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
}
.provider-card:hover .pc-service-icon { transform: rotate(0deg) scale(1.05); opacity: 0.28; }

.pc-banner-badges {
  position: absolute;
  top: 10px; left: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 56px);
}
.pc-distance, .pc-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.pc-distance {
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
}
.pc-pin { font-size: 0.7rem; }
.pc-pill-nearby { background: rgba(255, 255, 255, 0.22); color: #fff; }
.pc-pill-top { background: rgba(251, 191, 36, 0.92); color: #422006; }
.pc-pill-new { background: rgba(255, 255, 255, 0.92); color: #1E293B; }

.pc-fav {
  position: absolute;
  top: 10px; right: 10px;
  width: 34px; height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s, background 0.18s, color 0.18s;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 2;
}
.pc-fav:hover { background: rgba(255, 255, 255, 0.4); transform: scale(1.1); }
.pc-fav:active { transform: scale(0.92); }
.pc-fav.is-saved { background: #fff; color: #EF4444; }

.pc-avatar-wrap {
  position: absolute;
  left: 50%; top: 74px;
  transform: translateX(-50%);
  width: 72px; height: 72px;
  z-index: 2;
}
.pc-avatar {
  width: 72px; height: 72px;
  border-radius: 50%;
  border: 4px solid var(--color-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.3rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.25s ease;
}
.provider-card:hover .pc-avatar { transform: scale(1.05); }
.pc-avatar-check {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--color-card);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.pc-avatar-check::before {
  content: "";
  width: 5px;
  height: 9px;
  margin-top: -1px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(42deg);
}

.pc-body {
  padding: 44px var(--spacing-lg) var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.pc-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pc-name {
  font-size: 1.08rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.01em;
}
.pc-service {
  font-size: 0.82rem;
  margin-top: -2px;
  font-weight: 500;
}
.pc-meta { margin: 2px 0; }
.pc-loc {
  font-size: 0.82rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.pc-loc-icon { font-size: 0.85rem; }

.pc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.tag-pill-more {
  background: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  color: #fff !important;
}

.pc-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 10px 12px;
  background: var(--color-background);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}
.pc-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.pc-stat-icon { font-size: 1rem; flex-shrink: 0; }
.pc-stat > div { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
.pc-stat-value {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--color-text);
}
.pc-stat-label {
  font-size: 0.68rem;
  color: var(--color-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pc-stat-divider {
  width: 1px;
  height: 22px;
  background: var(--color-border);
  flex-shrink: 0;
}

.pc-footer {
  margin-top: 10px;
  padding-top: 14px;
  border-top: 2px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--spacing-sm);
}
.pc-rate { flex-shrink: 0; }
.pc-rate-label {
  font-size: 0.7rem;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}
.pc-rate-value {
  display: block;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-text);
  white-space: nowrap;
  letter-spacing: -0.02em;
}
.pc-rate-value::before {
  content: '';
  display: inline-block;
}
.pc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}
.pc-view-btn, .pc-book-btn {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 0.82rem;
  padding: 8px 14px;
}
.pc-book-btn { box-shadow: 0 4px 10px -3px var(--card-glow); }
.pc-book-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px -3px var(--card-glow);
}
.pc-book-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
</style>
