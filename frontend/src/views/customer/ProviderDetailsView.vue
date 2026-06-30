<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import StarRating from '@/components/StarRating.vue'

const store = useCatalogStore()
const route = useRoute()
const router = useRouter()

const profile = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const loadError = ref('')
const saved = ref(false)
const shareNote = ref('')
let requestToken = 0

const PALETTE = [
  { accent: '#2563EB', accentSoft: 'rgba(37, 99, 235, 0.16)', glow: 'rgba(37, 99, 235, 0.34)', wash: 'rgba(37, 99, 235, 0.08)' },
  { accent: '#0891B2', accentSoft: 'rgba(8, 145, 178, 0.16)', glow: 'rgba(8, 145, 178, 0.32)', wash: 'rgba(8, 145, 178, 0.08)' },
  { accent: '#0F766E', accentSoft: 'rgba(15, 118, 110, 0.16)', glow: 'rgba(20, 184, 166, 0.28)', wash: 'rgba(20, 184, 166, 0.08)' },
  { accent: '#7C3AED', accentSoft: 'rgba(124, 58, 237, 0.16)', glow: 'rgba(124, 58, 237, 0.3)', wash: 'rgba(124, 58, 237, 0.08)' },
  { accent: '#D97706', accentSoft: 'rgba(217, 119, 6, 0.16)', glow: 'rgba(245, 158, 11, 0.28)', wash: 'rgba(245, 158, 11, 0.08)' },
]

const FALLBACK_AREAS = ['Skudai', 'Taman Universiti', 'Mutiara Rini', 'Kangkar Pulai', 'Taman Sutera', 'Bukit Indah']
const SERVICE_COPY = {
  Plumbing: ['Leak tracing', 'Tap and pipe repair', 'Water pressure checks', 'Bathroom fittings'],
  Electrical: ['Power trip diagnosis', 'Switch and socket repair', 'Lighting installation', 'Safety inspection'],
  Cleaning: ['Move-in deep clean', 'Bathroom sanitizing', 'Kitchen degreasing', 'Post-renovation tidy-up'],
  Gardening: ['Lawn mowing', 'Hedge trimming', 'Plant care', 'Landscape cleanup'],
  'AC Service': ['Chemical wash', 'Gas top-up check', 'Filter cleaning', 'Cooling diagnosis'],
}

const providerId = computed(() => String(route.params.id || ''))

const provider = computed(() => profile.value)
const theme = computed(() => {
  const id = Number(provider.value?.id || 0)
  return PALETTE[id % PALETTE.length]
})
const serviceName = computed(() => provider.value?.service || 'Home service')
const categoryNames = computed(() => {
  const categories = provider.value?.categories || []
  return categories.map((category) => category.name).filter(Boolean)
})
const tags = computed(() => {
  const ownTags = provider.value?.tags || []
  const serviceTags = SERVICE_COPY[serviceName.value] || []
  return [...new Set([...ownTags, ...categoryNames.value, ...serviceTags])].slice(0, 8)
})
const rating = computed(() => Number(provider.value?.rating || 0))
const reviewCount = computed(() => Number(provider.value?.total_reviews || 0))
const baseRate = computed(() => Number(provider.value?.base_rate || 0))
const isVerified = computed(() => provider.value?.verification_status === 'verified')
const initials = computed(() => makeInitials(provider.value?.name || 'FixIt Provider'))
const distanceText = computed(() => {
  if (provider.value?.distance == null) return null
  return `${Number(provider.value.distance).toFixed(1)} km away`
})
const completedJobs = computed(() => {
  const id = Number(provider.value?.id || 1)
  return Math.max(24, reviewCount.value * 3 + id * 4)
})
const responseTime = computed(() => {
  const id = Number(provider.value?.id || 0)
  return id % 2 === 0 ? '20 min' : '30 min'
})
const nextAvailable = computed(() => {
  const first = availabilityDays.value.find((day) => day.available)
  return first?.label || 'Soon'
})
const reviews = computed(() => store.activeReviews || [])
const reviewsPreview = computed(() => reviews.value.slice(0, 3))

const bioText = computed(() => {
  const p = provider.value
  if (!p) return ''
  if (p.bio) return p.bio
  return `${p.name} is a verified ${serviceName.value.toLowerCase()} specialist serving ${p.location || 'Johor Bahru'}. Every booking includes clear job notes, quote confirmation, and secure FixIt payment tracking.`
})

const heroStats = computed(() => [
  { label: 'Rating', value: rating.value ? rating.value.toFixed(1) : 'New', sub: `${reviewCount.value} reviews` },
  { label: 'Completed', value: `${completedJobs.value}+`, sub: 'FixIt jobs' },
  { label: 'Response', value: responseTime.value, sub: 'average reply' },
  { label: 'On time', value: '98%', sub: 'arrival score' },
])

const credentialCards = computed(() => [
  { title: 'Identity verified', text: isVerified.value ? 'KYC checked by FixIt admin.' : 'Verification pending admin approval.' },
  { title: 'Quote protected', text: 'Review the cost before confirming the job.' },
  { title: 'Secure payment', text: 'Pay through the existing FixIt booking flow.' },
])

const packageCards = computed(() => {
  const rate = baseRate.value || 0
  return [
    {
      title: `${serviceName.value} inspection`,
      price: `RM ${rate || 40}`,
      text: 'Diagnosis, photos, and a clear recommendation before repair starts.',
    },
    {
      title: 'Standard service visit',
      price: `RM ${rate ? rate + 35 : 75}`,
      text: 'Best for common fixes, routine servicing, and small home tasks.',
    },
    {
      title: 'Priority booking',
      price: 'Quote first',
      text: 'Faster scheduling for urgent issues, subject to provider availability.',
    },
  ]
})

const serviceAreas = computed(() => {
  const home = provider.value?.location
  return [...new Set([home, ...FALLBACK_AREAS].filter(Boolean))].slice(0, 6)
})

const availabilityDays = computed(() => {
  const days = []
  const now = new Date()
  for (let i = 0; i < 6; i += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() + i)
    const isSunday = date.getDay() === 0
    days.push({
      key: i,
      label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      available: !isSunday,
    })
  }
  return days
})

const detailRows = computed(() => [
  { label: 'Main service', value: serviceName.value },
  { label: 'Base rate', value: `RM ${baseRate.value || 0} per hour` },
  { label: 'Location', value: provider.value?.location || 'Johor Bahru' },
  { label: 'Service radius', value: 'Up to 15 km' },
  { label: 'Languages', value: 'English, Malay' },
  { label: 'Payment', value: 'FixIt secure checkout' },
])

function normaliseProvider(raw) {
  if (!raw) return null
  const categories = Array.isArray(raw.categories) ? raw.categories : []
  const service = raw.service || raw.service_category || categories[0]?.name || 'Home service'
  return {
    ...raw,
    service,
    categories,
    tags: Array.isArray(raw.tags) ? raw.tags : categories.map((category) => category.name).filter(Boolean),
    rating: Number(raw.rating ?? 0),
    total_reviews: Number(raw.total_reviews ?? 0),
    base_rate: Number(raw.base_rate ?? 0),
    distance: raw.distance != null ? Number(raw.distance) : null,
  }
}

function makeInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function cachedProvider(id) {
  return store.providers.find((item) => String(item.id) === String(id))
}

async function loadProfile() {
  const token = ++requestToken
  const id = providerId.value
  const cached = cachedProvider(id)

  profile.value = normaliseProvider(cached)
  loading.value = !profile.value
  refreshing.value = !!profile.value
  loadError.value = ''

  try {
    await store.loadProvider(id)
    if (token !== requestToken) return

    if (store.activeProvider && String(store.activeProvider.id) === id) {
      profile.value = normaliseProvider({ ...cached, ...store.activeProvider })
    }

    if (!profile.value) {
      await store.loadProviders()
      if (token !== requestToken) return
      profile.value = normaliseProvider(cachedProvider(id))
    }

    if (!profile.value && store.error) {
      loadError.value = store.error
    }
  } catch (error) {
    if (token === requestToken) loadError.value = error.message || 'Unable to load this provider.'
  } finally {
    if (token === requestToken) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'providers' })
}

function startBooking() {
  if (!provider.value || !isVerified.value) return
  router.push({ name: 'create-booking', query: { provider: provider.value.id } })
}

function toggleSave() {
  saved.value = !saved.value
}

async function shareProfile() {
  if (!provider.value) return
  const url = window.location.href
  try {
    if (navigator.share) {
      await navigator.share({ title: provider.value.name, url })
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      shareNote.value = 'Profile link copied'
      setTimeout(() => { shareNote.value = '' }, 1800)
    }
  } catch {
    shareNote.value = ''
  }
}

onMounted(loadProfile)
watch(providerId, loadProfile)
</script>

<template>
  <div class="provider-details-page" :style="{ '--profile-accent': theme.accent, '--profile-soft': theme.accentSoft, '--profile-glow': theme.glow, '--profile-wash': theme.wash }">
    <button class="back-link" type="button" @click="goBack">&larr; Back to results</button>

    <section v-if="loading" class="profile-state">
      <div class="state-orb"></div>
      <h2>Loading profile...</h2>
      <p class="muted">Checking the provider details and latest reviews.</p>
    </section>

    <section v-else-if="!provider" class="profile-state">
      <div class="state-orb state-orb-muted"></div>
      <h2>Provider profile unavailable</h2>
      <p class="muted">{{ loadError || 'This provider could not be found.' }}</p>
      <button class="btn-ui btn-ui-primary" type="button" @click="router.push({ name: 'providers' })">Browse providers</button>
    </section>

    <template v-else>
      <section class="profile-hero">
        <div class="hero-light hero-light-one"></div>
        <div class="hero-light hero-light-two"></div>

        <div class="hero-main">
          <div class="avatar-block">
            <div class="avatar-ring">
              <span>{{ initials }}</span>
              <span v-if="isVerified" class="verified-dot">OK</span>
            </div>
          </div>

          <div class="hero-copy">
            <div class="hero-kicker">
              <span class="live-dot"></span>
              Provider profile
              <span class="kicker-divider"></span>
              {{ isVerified ? 'Verified by FixIt' : 'Pending verification' }}
            </div>

            <h1>{{ provider.name }}</h1>
            <p class="hero-subtitle">{{ serviceName }} specialist for {{ provider.location || 'your area' }} homes.</p>

            <div class="hero-rating-row">
              <StarRating :value="rating" :count="reviewCount" />
              <span v-if="distanceText" class="meta-pill">{{ distanceText }}</span>
              <span class="meta-pill">RM {{ baseRate }}/hr</span>
              <span v-if="refreshing" class="meta-pill meta-pill-soft">Refreshing...</span>
            </div>

            <div class="hero-actions">
              <button class="btn-ui btn-ui-primary hero-book" type="button" :disabled="!isVerified" @click="startBooking">
                Book this provider
              </button>
              <button class="btn-ui btn-ui-outline" type="button" @click="toggleSave">
                {{ saved ? 'Saved' : 'Save provider' }}
              </button>
              <button class="btn-ui btn-ui-outline" type="button" @click="shareProfile">Share</button>
              <span v-if="shareNote" class="share-note">{{ shareNote }}</span>
            </div>
          </div>
        </div>

        <aside class="hero-booking-card">
          <span class="booking-label">Ready to book</span>
          <div class="booking-price">
            <strong>RM {{ baseRate }}</strong>
            <span>/ hour</span>
          </div>
          <p>Next available: <strong>{{ nextAvailable }}</strong></p>
          <div class="booking-mini-grid">
            <span>Secure quote</span>
            <span>Status tracking</span>
            <span>Payment protected</span>
            <span>Review after job</span>
          </div>
          <button class="btn-ui btn-ui-primary" type="button" :disabled="!isVerified" @click="startBooking">Start booking</button>
          <small v-if="!isVerified" class="muted">Bookings open after admin verification.</small>
        </aside>
      </section>

      <section class="hero-stat-grid" aria-label="Provider highlights">
        <article v-for="stat in heroStats" :key="stat.label" class="stat-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.sub }}</small>
        </article>
      </section>

      <div class="profile-layout">
        <main class="profile-main-col">
          <section class="detail-panel about-panel">
            <div class="panel-heading">
              <span class="section-label">Overview</span>
              <h2>Why customers book {{ provider.name }}</h2>
            </div>
            <p class="bio-copy">{{ bioText }}</p>

            <div class="detail-row-grid">
              <div v-for="row in detailRows" :key="row.label" class="detail-row">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-panel">
            <div class="panel-heading panel-heading-row">
              <div>
                <span class="section-label">Services</span>
                <h2>What this provider can handle</h2>
              </div>
              <span class="service-badge">{{ serviceName }}</span>
            </div>

            <div class="tag-cloud">
              <span v-for="tag in tags" :key="tag" class="tag-pill">{{ tag }}</span>
            </div>

            <div class="package-grid">
              <article v-for="item in packageCards" :key="item.title" class="package-card">
                <span>{{ item.price }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </article>
            </div>
          </section>

          <section class="detail-panel">
            <div class="panel-heading panel-heading-row">
              <div>
                <span class="section-label">Reviews</span>
                <h2>Customer feedback</h2>
              </div>
              <StarRating :value="rating" :count="reviewCount" />
            </div>

            <div v-if="reviewsPreview.length" class="review-list">
              <article v-for="review in reviewsPreview" :key="review.id" class="review-card">
                <StarRating :value="Number(review.rating || 0)" />
                <p>{{ review.comment || 'Great service and clear communication.' }}</p>
                <small class="muted">{{ review.created_at || 'Recent booking' }}</small>
              </article>
            </div>

            <div v-else class="empty-reviews">
              <strong>No written reviews yet</strong>
              <p class="muted">This profile is ready for its next customer review after a completed booking.</p>
            </div>
          </section>
        </main>

        <aside class="profile-side-col">
          <section class="side-panel availability-panel">
            <span class="section-label">Availability</span>
            <h2>This week</h2>
            <div class="day-strip">
              <div v-for="day in availabilityDays" :key="day.key" class="day-pill" :class="{ unavailable: !day.available }">
                <span>{{ day.label }}</span>
                <strong>{{ day.date }}</strong>
                <small>{{ day.available ? 'Open' : 'Full' }}</small>
              </div>
            </div>
          </section>

          <section class="side-panel">
            <span class="section-label">Coverage</span>
            <h2>Service area</h2>
            <p class="muted">Covers {{ provider.location || 'Johor Bahru' }} and nearby neighborhoods.</p>
            <div class="area-list">
              <span v-for="area in serviceAreas" :key="area">{{ area }}</span>
            </div>
          </section>

          <section class="side-panel">
            <span class="section-label">Trust</span>
            <h2>Booking protection</h2>
            <div class="trust-stack">
              <article v-for="item in credentialCards" :key="item.title" class="trust-item">
                <span></span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.text }}</p>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.provider-details-page {
  --profile-accent: #2563EB;
  --profile-soft: rgba(37, 99, 235, 0.16);
  --profile-glow: rgba(37, 99, 235, 0.34);
  --profile-wash: rgba(37, 99, 235, 0.08);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.back-link {
  align-self: flex-start;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-family: var(--font-main);
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}

.back-link:hover { text-decoration: underline; }

.profile-state {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 28%, var(--profile-wash), transparent 34%),
    var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 48px 20px;
}

.profile-state h2 {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--color-text);
}

.state-orb {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: var(--profile-accent);
  box-shadow: 0 0 0 12px var(--profile-soft), 0 18px 40px var(--profile-glow);
  animation: state-pulse 1.4s ease-in-out infinite;
}

.state-orb-muted {
  background: var(--color-muted);
  box-shadow: 0 0 0 12px rgba(148, 163, 184, 0.16);
  animation: none;
}

@keyframes state-pulse {
  0%, 100% { transform: scale(0.96); opacity: 0.75; }
  50% { transform: scale(1); opacity: 1; }
}

.profile-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--spacing-xl);
  align-items: stretch;
  border: 2px solid var(--color-border);
  border-radius: 24px;
  padding: clamp(20px, 3vw, 34px);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-card) 94%, #ffffff 6%),
      color-mix(in srgb, var(--color-card) 86%, var(--profile-wash))
    ),
    radial-gradient(circle at 16% 18%, var(--profile-soft), transparent 30%),
    var(--color-card);
  box-shadow: 0 26px 70px -42px var(--profile-glow);
}

.hero-light {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: var(--profile-glow);
  filter: blur(42px);
  opacity: 0.36;
  pointer-events: none;
}

.hero-light-one { right: 16%; top: -140px; }
.hero-light-two { left: -120px; bottom: -150px; opacity: 0.22; }

.hero-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  min-width: 0;
}

.avatar-block { display: flex; align-items: center; justify-content: center; }

.avatar-ring {
  position: relative;
  width: clamp(96px, 10vw, 132px);
  height: clamp(96px, 10vw, 132px);
  border-radius: 32px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 950;
  letter-spacing: -0.06em;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--profile-accent) 92%, #38BDF8), var(--profile-accent));
  box-shadow: 0 20px 48px -20px var(--profile-glow);
}

.avatar-ring::after {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 24px;
}

.verified-dot {
  position: absolute;
  right: -8px;
  bottom: -8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  border: 4px solid var(--color-card);
  background: #22C55E;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 950;
  letter-spacing: 0.04em;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  max-width: 100%;
  color: var(--color-primary);
  background: var(--profile-soft);
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.76rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22C55E;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.15);
  flex: 0 0 auto;
}

.kicker-divider {
  width: 1px;
  height: 14px;
  background: currentColor;
  opacity: 0.28;
}

.hero-copy h1 {
  font-size: clamp(2.1rem, 4vw, 4.4rem);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: -0.06em;
  color: var(--color-text);
  max-width: 760px;
}

.hero-subtitle {
  max-width: 620px;
  color: var(--color-muted);
  font-size: clamp(1rem, 1.3vw, 1.16rem);
  line-height: 1.55;
  font-weight: 650;
}

.hero-rating-row,
.hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.78rem;
  font-weight: 850;
}

.meta-pill-soft {
  color: var(--color-primary);
  background: var(--profile-soft);
}

.hero-book {
  box-shadow: 0 14px 28px -16px var(--profile-accent);
}

.share-note {
  color: var(--color-success);
  font-size: 0.78rem;
  font-weight: 850;
}

.hero-booking-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--profile-accent) 24%, var(--color-border));
  border-radius: 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-card) 86%, transparent), var(--color-card)),
    var(--color-card);
  box-shadow: 0 22px 54px -36px rgba(15, 23, 42, 0.48);
}

.booking-label,
.section-label {
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 950;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.booking-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.booking-price strong {
  color: var(--color-text);
  font-size: 2.35rem;
  line-height: 1;
  letter-spacing: -0.06em;
}

.booking-price span,
.hero-booking-card p {
  color: var(--color-muted);
  font-weight: 700;
}

.booking-mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.booking-mini-grid span {
  padding: 9px 10px;
  border-radius: 12px;
  background: var(--profile-wash);
  color: var(--color-text);
  font-size: 0.74rem;
  font-weight: 850;
}

.hero-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background:
    linear-gradient(135deg, var(--color-card), color-mix(in srgb, var(--color-card) 86%, var(--profile-wash))),
    var(--color-card);
  box-shadow: 0 14px 36px -30px rgba(15, 23, 42, 0.45);
}

.stat-card span,
.stat-card small {
  display: block;
  color: var(--color-muted);
  font-weight: 800;
}

.stat-card span {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat-card strong {
  display: block;
  margin: 7px 0 2px;
  color: var(--color-text);
  font-size: 1.65rem;
  line-height: 1;
  letter-spacing: -0.04em;
}

.stat-card small { font-size: 0.76rem; }

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--spacing-lg);
  align-items: start;
}

.profile-main-col,
.profile-side-col {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  min-width: 0;
}

.profile-side-col {
  position: sticky;
  top: 20px;
}

.detail-panel,
.side-panel {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-card);
  box-shadow: 0 18px 46px -38px rgba(15, 23, 42, 0.46);
}

.detail-panel { padding: clamp(18px, 2.4vw, 26px); }
.side-panel { padding: 18px; }

.panel-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.panel-heading-row {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-heading h2,
.side-panel h2 {
  color: var(--color-text);
  font-size: 1.35rem;
  font-weight: 950;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.side-panel h2 { margin: 6px 0 10px; }

.bio-copy {
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.7;
  font-weight: 600;
}

.detail-row-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.detail-row {
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background);
}

.detail-row span,
.detail-row strong {
  display: block;
}

.detail-row span {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.detail-row strong {
  margin-top: 5px;
  color: var(--color-text);
  font-size: 0.94rem;
  line-height: 1.35;
}

.service-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--profile-soft);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 900;
  white-space: nowrap;
}

.tag-cloud,
.area-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-cloud { margin-bottom: 18px; }

.package-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.package-card {
  min-height: 150px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background:
    linear-gradient(160deg, var(--color-background), var(--color-card));
}

.package-card span {
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 950;
}

.package-card h3 {
  margin: 10px 0 8px;
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.25;
  font-weight: 950;
}

.package-card p {
  color: var(--color-muted);
  font-size: 0.86rem;
  line-height: 1.5;
  font-weight: 650;
}

.review-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.review-card,
.empty-reviews {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-background);
}

.review-card p {
  margin: 10px 0 8px;
  color: var(--color-text);
  line-height: 1.55;
  font-weight: 650;
}

.empty-reviews {
  text-align: center;
  padding: 28px;
}

.empty-reviews strong {
  color: var(--color-text);
  font-size: 1rem;
}

.empty-reviews p {
  margin: 8px auto 0;
  max-width: 360px;
}

.day-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.day-pill {
  padding: 10px 8px;
  text-align: center;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--profile-accent) 30%, var(--color-border));
  background: var(--profile-wash);
}

.day-pill span,
.day-pill small,
.day-pill strong {
  display: block;
}

.day-pill span,
.day-pill small {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 850;
}

.day-pill strong {
  color: var(--color-text);
  font-size: 1.2rem;
  line-height: 1.1;
  margin: 4px 0;
}

.day-pill.unavailable {
  opacity: 0.52;
  border-color: var(--color-border);
  background: var(--color-background);
}

.area-list { margin-top: 14px; }

.area-list span {
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.78rem;
  font-weight: 850;
}

.trust-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trust-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: start;
}

.trust-item > span {
  width: 14px;
  height: 14px;
  margin-top: 3px;
  border-radius: 999px;
  background: var(--profile-accent);
  box-shadow: 0 0 0 5px var(--profile-soft);
}

.trust-item strong {
  color: var(--color-text);
  font-size: 0.92rem;
  font-weight: 950;
}

.trust-item p {
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  font-weight: 650;
  margin-top: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .state-orb { animation: none; }
}

@media (max-width: 1080px) {
  .profile-hero,
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .profile-side-col {
    position: static;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: stretch;
  }
}

@media (max-width: 860px) {
  .hero-main {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-kicker,
  .hero-rating-row,
  .hero-actions {
    justify-content: center;
  }

  .hero-stat-grid,
  .package-grid,
  .review-list,
  .profile-side-col {
    grid-template-columns: 1fr 1fr;
  }

  .detail-row-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .provider-details-page {
    gap: var(--spacing-md);
  }

  .profile-hero {
    border-radius: 18px;
    padding: 18px;
  }

  .hero-copy h1 {
    font-size: 2.35rem;
  }

  .hero-kicker {
    white-space: normal;
    justify-content: center;
  }

  .hero-stat-grid,
  .package-grid,
  .review-list,
  .profile-side-col,
  .detail-row-grid,
  .booking-mini-grid,
  .day-strip {
    grid-template-columns: 1fr;
  }

  .panel-heading-row {
    flex-direction: column;
  }

  .hero-actions .btn-ui {
    width: 100%;
    justify-content: center;
  }
}
</style>
