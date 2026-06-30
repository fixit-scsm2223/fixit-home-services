<script setup>
import { computed, ref } from 'vue'
import { useProviderStore } from '@/stores/provider'
import CalendarWidget from '@/components/provider/CalendarWidget.vue'

const store = useProviderStore()

const today = new Date()
const selectedDate = ref(dateKey(today))

const modeOptions = [
  {
    value: 'auto',
    label: 'Auto-confirm',
    description: 'Automatically accept bookings on available dates.',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Review every request before accepting.',
  },
  {
    value: 'offline',
    label: 'Offline',
    description: 'Temporarily stop accepting new bookings.',
  },
]

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function keyFromIso(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateKey(date)
}

function formatDate(key) {
  if (!key) return 'No date selected'
  const date = new Date(`${key}T00:00:00`)
  return date.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Time not set'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const selectedDateJobs = computed(() =>
  store.jobs
    .filter((job) => keyFromIso(job.scheduledAt) === selectedDate.value)
    .filter((job) => !['rejected', 'cancelled'].includes(job.status))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
)

const selectedIsReserved = computed(() => store.availability.reservedDates.includes(selectedDate.value))
const selectedAvailabilityLabel = computed(() =>
  selectedIsReserved.value ? 'Reserved' : selectedDateJobs.value.length ? 'Available with scheduled jobs' : 'Available',
)

const currentMonthKey = computed(() =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
)

const reservedDaysThisMonth = computed(() =>
  store.availability.reservedDates.filter((date) => date.startsWith(currentMonthKey.value)).length,
)

const availableDaysThisMonth = computed(() => {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return Math.max(daysInMonth - reservedDaysThisMonth.value, 0)
})

const upcomingJobs = computed(() =>
  store.jobs.filter((job) =>
    new Date(job.scheduledAt) >= today &&
    !['closed', 'reviewed', 'rejected', 'cancelled'].includes(job.status),
  ),
)

const currentMode = computed(() =>
  modeOptions.find((mode) => mode.value === store.availability.mode) || modeOptions[1],
)

function selectDate(cell) {
  if (!cell?.key) return
  selectedDate.value = cell.key
}

function toggleSelectedDate() {
  if (!selectedDate.value) return
  if (!selectedIsReserved.value && selectedDateJobs.value.length) {
    store.showToast('This date already has scheduled bookings. Review the jobs before reserving it.', 'warning')
    return
  }
  store.toggleReservedDate(selectedDate.value)
}

function saveAvailability() {
  store.setAvailabilityMode(store.availability.mode)
}
</script>

<template>
  <div class="provider-schedule-page">
    <section class="schedule-summary-grid">
      <article class="schedule-summary-card">
        <span>Available Days This Month</span>
        <strong>{{ availableDaysThisMonth }}</strong>
      </article>
      <article class="schedule-summary-card warning">
        <span>Reserved Days This Month</span>
        <strong>{{ reservedDaysThisMonth }}</strong>
      </article>
      <article class="schedule-summary-card blue">
        <span>Upcoming Jobs</span>
        <strong>{{ upcomingJobs.length }}</strong>
      </article>
      <article class="schedule-summary-card teal">
        <span>Current Availability Mode</span>
        <strong>{{ currentMode.label }}</strong>
      </article>
    </section>

    <section class="schedule-layout">
      <article class="card schedule-calendar-card">
        <div class="schedule-card-head">
          <div>
            <span>CALENDAR</span>
            <h3>Availability Calendar</h3>
            <p>Reserved dates block new bookings. Scheduled-job indicators show existing provider commitments.</p>
          </div>
        </div>

        <CalendarWidget
          :interactive="true"
          :selected-date="selectedDate"
          :toggle-on-click="false"
          @select-date="selectDate"
        />

        <div class="schedule-legend">
          <span><i class="available"></i>Available</span>
          <span><i class="reserved"></i>Reserved</span>
          <span><i class="today"></i>Today</span>
          <span><i class="scheduled"></i>Job Scheduled</span>
        </div>
      </article>

      <aside class="schedule-side-stack">
        <article class="card selected-date-card">
          <div class="schedule-card-head">
            <div>
              <span>SELECTED DATE</span>
              <h3>{{ formatDate(selectedDate) }}</h3>
              <p>{{ selectedAvailabilityLabel }}</p>
            </div>
            <span class="status-pill" :class="selectedIsReserved ? 'status-pill-amber' : 'status-pill-green'">
              {{ selectedIsReserved ? 'Reserved' : 'Available' }}
            </span>
          </div>

          <div class="selected-date-grid">
            <div>
              <span>Scheduled Jobs</span>
              <strong>{{ selectedDateJobs.length }}</strong>
            </div>
            <div>
              <span>Availability</span>
              <strong>{{ selectedAvailabilityLabel }}</strong>
            </div>
          </div>

          <div v-if="selectedDateJobs.length" class="selected-job-list">
            <div v-for="job in selectedDateJobs" :key="job.id">
              <strong>{{ formatTime(job.scheduledAt) }}</strong>
              <span>{{ job.service }} · {{ job.customerName }}</span>
            </div>
          </div>

          <p v-if="selectedDateJobs.length && !selectedIsReserved" class="schedule-warning">
            This date has confirmed bookings. Reserving it is blocked from this dashboard.
          </p>

          <button
            class="btn btn-primary btn-w-full"
            type="button"
            :disabled="!selectedIsReserved && selectedDateJobs.length"
            @click="toggleSelectedDate"
          >
            {{ selectedIsReserved ? 'Mark Date Available' : 'Mark Date Reserved' }}
          </button>
        </article>

        <article class="card availability-mode-card">
          <div class="schedule-card-head">
            <div>
              <span>MODE</span>
              <h3>Availability Mode</h3>
            </div>
            <span class="status-pill status-pill-blue">{{ currentMode.label }}</span>
          </div>

          <div class="mode-option-list">
            <label
              v-for="opt in modeOptions"
              :key="opt.value"
              class="mode-option"
              :class="{ active: store.availability.mode === opt.value }"
            >
              <input
                type="radio"
                name="availability-mode"
                :value="opt.value"
                :checked="store.availability.mode === opt.value"
                @change="store.setAvailabilityMode(opt.value)"
              />
              <span>
                <strong>{{ opt.label }}</strong>
                <small>{{ opt.description }}</small>
              </span>
            </label>
          </div>

          <button class="btn btn-primary btn-w-full" type="button" @click="saveAvailability">
            Save Availability Settings
          </button>
        </article>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.provider-schedule-page {
  display: grid;
  gap: 18px;
}

.schedule-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.schedule-summary-card {
  --summary-accent: var(--color-success);
  position: relative;
  display: grid;
  gap: 7px;
  min-height: 86px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.schedule-summary-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--summary-accent);
  content: "";
}

.schedule-summary-card.warning { --summary-accent: var(--color-warning); }
.schedule-summary-card.blue { --summary-accent: var(--color-primary); }
.schedule-summary-card.teal { --summary-accent: var(--color-secondary); }

.schedule-summary-card span,
.schedule-card-head span:not(.status-pill),
.selected-date-grid span {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.schedule-summary-card strong {
  font-size: 1.3rem;
}

.schedule-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
  gap: 20px;
  align-items: start;
}

.schedule-calendar-card,
.selected-date-card,
.availability-mode-card {
  margin: 0;
}

.schedule-side-stack {
  display: grid;
  gap: 20px;
}

.schedule-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.schedule-card-head h3 {
  margin-top: 5px;
  font-size: 1.1rem;
}

.schedule-card-head p,
.mode-option small,
.selected-job-list span,
.schedule-warning {
  color: var(--color-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.schedule-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.schedule-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 750;
}

.schedule-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.schedule-legend .available { background: var(--color-card); border: 1px solid var(--color-border); }
.schedule-legend .reserved { background: rgba(37, 99, 235, 0.32); }
.schedule-legend .today { background: var(--color-primary); }
.schedule-legend .scheduled { background: var(--color-secondary); }

.selected-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.selected-date-grid > div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.selected-date-grid strong {
  overflow-wrap: anywhere;
  font-size: 0.92rem;
}

.selected-job-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.selected-job-list > div {
  display: grid;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.schedule-warning {
  margin: 12px 0;
  padding: 10px;
  border-left: 3px solid var(--color-warning);
  border-radius: var(--radius-md);
  background: rgba(245, 158, 11, 0.1);
}

.mode-option-list {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.mode-option.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.mode-option input {
  margin-top: 3px;
}

.mode-option span {
  display: grid;
  gap: 3px;
}

@media (max-width: 1120px) {
  .schedule-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .schedule-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .schedule-summary-grid,
  .selected-date-grid {
    grid-template-columns: 1fr;
  }

  .schedule-card-head {
    flex-direction: column;
  }
}
</style>
