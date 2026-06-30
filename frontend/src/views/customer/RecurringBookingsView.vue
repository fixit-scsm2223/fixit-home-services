<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const router = useRouter()
const bookingStore = useBookingStore()

onMounted(() => {
  bookingStore.loadBookings()
})

const series = computed(() => bookingStore.recurringSeries)

const STATUS_BADGE = {
  requested: 'badge-ui-warning',
  accepted: 'badge-ui-success',
  en_route: 'badge-ui-warning',
  in_progress: 'badge-ui-warning',
  cost_pending: 'badge-ui-success',
  closed: 'badge-ui-success',
  reviewed: 'badge-ui-success',
  cancelled: 'badge-ui-danger',
}
const STATUS_LABEL = {
  requested: 'Pending',
  accepted: 'Confirmed',
  en_route: 'En Route',
  in_progress: 'In Progress',
  cost_pending: 'Completed',
  closed: 'Completed',
  reviewed: 'Completed',
  cancelled: 'Cancelled',
}

function occurrencesOf(parentId) {
  return bookingStore.bookings.filter((b) => b.parent_job_id === parentId)
}

function activeOccurrenceCount(parentId) {
  return occurrencesOf(parentId).filter((b) => ['requested', 'accepted', 'en_route', 'in_progress'].includes(b.status)).length
}

// All jobs belonging to a series — the parent (first) booking plus every
// child occurrence — used for the "next visit" lookup and the expanded panel.
function allOccurrencesOf(seriesId) {
  const parent = bookingStore.bookings.find((b) => b.id === seriesId)
  return parent ? [parent, ...occurrencesOf(seriesId)] : occurrencesOf(seriesId)
}

function formatVisit(dt) {
  const d = new Date(dt.replace(' ', 'T'))
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${datePart}, ${timePart}`
}

function nextOccurrenceOf(seriesId) {
  const upcoming = allOccurrencesOf(seriesId)
    .filter((b) => ['requested', 'accepted'].includes(b.status))
    .sort((a, b) => new Date(a.scheduled_at.replace(' ', 'T')) - new Date(b.scheduled_at.replace(' ', 'T')))
  return upcoming[0] || null
}

function nextVisitLabel(seriesId) {
  const next = nextOccurrenceOf(seriesId)
  return next ? `Next: ${formatVisit(next.scheduled_at)}` : 'No upcoming visits'
}

// Mock — number of completed jobs in this series so far (not tracked by the store).
function completedCountFor(seriesId) {
  return 8 + (seriesId % 5)
}

/* ---- Pause / Resume (mock, local only) ---- */
const pausedSeries = reactive({})
function togglePause(seriesId) {
  pausedSeries[seriesId] = !pausedSeries[seriesId]
}

/* ---- View all occurrences (mock, local only) ---- */
const expandedSeries = reactive({})
function toggleExpanded(seriesId) {
  expandedSeries[seriesId] = !expandedSeries[seriesId]
}

/* ---- Row selection (drives the stats bar) ---- */
const selectedSeriesId = ref(null)
function selectSeries(seriesId) {
  selectedSeriesId.value = selectedSeriesId.value === seriesId ? null : seriesId
}
function clearSelection() {
  selectedSeriesId.value = null
}
const selectedSeries = computed(() => series.value.find((s) => s.id === selectedSeriesId.value) || null)

/* ---- Summary stats ---- */
const activeSeriesCount = computed(() => series.value.length)

const nextVisitOverall = computed(() => {
  const all = series.value
    .map((s) => nextOccurrenceOf(s.id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.scheduled_at.replace(' ', 'T')) - new Date(b.scheduled_at.replace(' ', 'T')))
  return all[0] ? formatVisit(all[0].scheduled_at) : '—'
})

const totalSpentLabel = computed(() => {
  const total = series.value.reduce(
    (sum, s) => sum + Number(s.estimated_cost || 0) * completedCountFor(s.id),
    0
  )
  return `RM ${total}`
})

const selectedNextVisitLabel = computed(() => {
  if (!selectedSeries.value) return ''
  const next = nextOccurrenceOf(selectedSeries.value.id)
  return next ? formatVisit(next.scheduled_at) : 'No upcoming visits'
})

const selectedSpentLabel = computed(() => {
  if (!selectedSeries.value) return ''
  const s = selectedSeries.value
  return `RM ${Number(s.estimated_cost || 0) * completedCountFor(s.id)}`
})

async function cancelSeries(parentId) {
  if (!confirm('Cancel all upcoming occurrences in this recurring booking?')) return
  await bookingStore.cancelRecurringSeries(parentId)
}
</script>

<template>
  <div class="recurring-view">
    <header class="page-head">
      <button class="btn-ui btn-ui-primary" @click="router.push({ name: 'create-booking' })">+ New booking</button>
    </header>

    <div v-if="series.length" class="stats-bar-wrap">
      <div class="stats-bar">
        <template v-if="!selectedSeries">
          <div class="stat-card">
            <span class="stat-icon">🔄</span>
            <div>
              <small class="muted">Active Series</small>
              <strong class="stat-value">{{ activeSeriesCount }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📅</span>
            <div>
              <small class="muted">Next Visit</small>
              <strong class="stat-value">{{ nextVisitOverall }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💰</span>
            <div>
              <small class="muted">Total Spent on Recurring</small>
              <strong class="stat-value">{{ totalSpentLabel }}</strong>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="stat-card">
            <span class="stat-icon">🔄</span>
            <div>
              <small class="muted">Selected Series</small>
              <strong class="stat-value">{{ selectedSeries.provider_name }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📅</span>
            <div>
              <small class="muted">Next Visit</small>
              <strong class="stat-value">{{ selectedNextVisitLabel }}</strong>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💰</span>
            <div>
              <small class="muted">Spent on This Series</small>
              <strong class="stat-value">{{ selectedSpentLabel }}</strong>
            </div>
          </div>
        </template>
      </div>
      <button v-if="selectedSeries" class="btn-ui btn-ui-outline btn-ui-sm show-all-btn" @click="clearSelection">
        Show all
      </button>
    </div>

    <div v-if="!series.length" class="empty-state">
      <p class="muted">You don't have any recurring bookings yet.</p>
      <button class="btn-ui btn-ui-primary" @click="router.push({ name: 'create-booking' })">Set up a recurring booking</button>
    </div>

    <div v-else class="series-list">
      <article
        v-for="s in series" :key="s.id"
        class="series-card"
        :class="{ selected: selectedSeriesId === s.id }"
        @click="selectSeries(s.id)"
      >
        <div class="series-main">
          <div class="series-title-row">
            <h4>{{ s.provider_name }}</h4>
            <span class="tag-pill">🔄 {{ s.recurring_frequency }}</span>
          </div>
          <p class="muted">{{ s.category_name }} · {{ s.address }}</p>
          <p class="muted series-occurrences">
            {{ activeOccurrenceCount(s.id) }} upcoming occurrence{{ activeOccurrenceCount(s.id) === 1 ? '' : 's' }} scheduled
          </p>

          <div class="series-info-row">
            <span class="series-info-item">{{ nextVisitLabel(s.id) }}</span>
            <span class="series-info-item">RM {{ s.estimated_cost }} / visit</span>
            <span class="badge-ui" :class="pausedSeries[s.id] ? 'badge-ui-neutral' : 'badge-ui-success'">
              {{ pausedSeries[s.id] ? '⏸ Paused' : '● Active' }}
            </span>
            <span class="series-info-item">{{ completedCountFor(s.id) }} jobs completed</span>
          </div>
        </div>

        <div class="series-side">
          <button class="btn-ui btn-ui-outline btn-ui-sm" @click.stop="togglePause(s.id)">
            {{ pausedSeries[s.id] ? 'Resume' : 'Pause' }}
          </button>
          <button class="btn-ui btn-ui-outline btn-ui-sm" @click.stop="toggleExpanded(s.id)">
            {{ expandedSeries[s.id] ? 'Hide occurrences' : 'View all occurrences' }}
          </button>
          <button
            class="btn-ui btn-ui-danger btn-ui-sm"
            @click.stop="cancelSeries(s.id)"
          >Cancel series</button>
        </div>

        <div v-if="expandedSeries[s.id]" class="series-occurrences-panel">
          <div v-for="job in allOccurrencesOf(s.id)" :key="job.id" class="occurrence-row">
            <span>{{ formatVisit(job.scheduled_at) }}</span>
            <span class="badge-ui" :class="STATUS_BADGE[job.status]">{{ STATUS_LABEL[job.status] }}</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.recurring-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.page-head { display: flex; align-items: center; justify-content: flex-end; gap: var(--spacing-md); flex-wrap: wrap; }
.empty-state {
  display: flex; flex-direction: column; align-items: flex-start; gap: 12px;
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-card);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
}
.series-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.series-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.series-card.selected {
  border-color: var(--color-primary);
  background: rgba(37, 99, 235, 0.06);
}
body.night-mode-active .series-card.selected { background: rgba(37, 99, 235, 0.16); }
.series-title-row { display: flex; align-items: center; gap: 8px; }
.series-title-row h4 { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.series-occurrences { font-size: 0.8rem; }
.series-side { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }

.series-main { flex: 1; min-width: 240px; }
.series-info-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.series-info-item { font-size: 0.8rem; color: var(--color-text); }
.badge-ui-neutral { background: var(--color-border); color: var(--color-muted); }

.series-occurrences-panel {
  flex: 1 0 100%;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 2px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.occurrence-row {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.85rem;
  padding: 8px 10px;
  background: var(--color-background);
  border-radius: var(--radius-md);
}

/* Summary stats bar */
.stats-bar-wrap { display: flex; flex-direction: column; gap: 10px; }
.show-all-btn { align-self: flex-end; }
.stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }
.stat-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex; align-items: center; gap: var(--spacing-md);
}
.stat-icon { font-size: 1.6rem; flex-shrink: 0; }
.stat-value { display: block; font-size: 1.2rem; font-weight: 800; color: var(--color-text); margin-top: 2px; }

@media (max-width: 720px) {
  .stats-bar { grid-template-columns: 1fr; }
  .series-side { width: 100%; }
}
</style>
