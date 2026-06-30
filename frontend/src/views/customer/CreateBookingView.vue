<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useBookingStore } from '@/stores/booking'
import StarRating from '@/components/StarRating.vue'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const bookingStore = useBookingStore()

const submitting = ref(false)
const error = ref(null)

const form = ref({
  provider_id: null,
  scheduled_date: '',
  scheduled_time: '',
  address: '',
  notes: '',
  is_recurring: false,
  recurring_frequency: 'weekly',
})

const selectedProvider = computed(() =>
  catalog.providers.find((p) => p.id === Number(form.value.provider_id)) || null
)
const selectedCategory = computed(() => {
  const provider = selectedProvider.value
  if (!provider) return null
  return provider.categories?.[0] || catalog.categories.find((category) => category.name === provider.service) || null
})

const minDate = computed(() => new Date().toISOString().slice(0, 10))

// Per-provider accent so the preview avatar matches the marketplace grid.
const PALETTE = [
  { banner: 'linear-gradient(135deg, #3B82F6, #2563EB)', avatarBg: '#DBEAFE', avatarColor: '#2563EB' },
  { banner: 'linear-gradient(135deg, #2DD4BF, #059669)', avatarBg: '#CCFBF1', avatarColor: '#0F766E' },
  { banner: 'linear-gradient(135deg, #FBBF24, #D97706)', avatarBg: '#FEF3C7', avatarColor: '#B45309' },
  { banner: 'linear-gradient(135deg, #4ADE80, #16A34A)', avatarBg: '#DCFCE7', avatarColor: '#15803D' },
  { banner: 'linear-gradient(135deg, #38BDF8, #2563EB)', avatarBg: '#E0F2FE', avatarColor: '#0369A1' },
  { banner: 'linear-gradient(135deg, #F472B6, #DB2777)', avatarBg: '#FCE7F3', avatarColor: '#BE185D' },
]
const theme = computed(() => PALETTE[(selectedProvider.value?.id || 0) % PALETTE.length])
function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// Quick pickers ------------------------------------------------------------
function isoDate(d) { return d.toISOString().slice(0, 10) }
const today = computed(() => isoDate(new Date()))
const tomorrow = computed(() => {
  const d = new Date(); d.setDate(d.getDate() + 1); return isoDate(d)
})
function pickDate(value) { form.value.scheduled_date = value }

const TIME_SLOTS = [
  { label: '☀️ Morning', value: '09:00' },
  { label: '🌤️ Midday', value: '12:00' },
  { label: '🌆 Afternoon', value: '15:00' },
  { label: '🌙 Evening', value: '18:00' },
]
function pickTime(value) { form.value.scheduled_time = value }

const prettyDate = computed(() => {
  if (!form.value.scheduled_date) return null
  const d = new Date(form.value.scheduled_date + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
})

// Cost summary -------------------------------------------------------------
const PLATFORM_FEE = 5
const estTotal = computed(() => {
  if (!selectedProvider.value) return 0
  return Number(selectedProvider.value.base_rate) + PLATFORM_FEE
})

onMounted(async () => {
  const tasks = []
  if (!catalog.categories.length) tasks.push(catalog.loadCategories())
  if (!catalog.providers.length) tasks.push(catalog.loadProviders())
  if (tasks.length) await Promise.all(tasks)

  const queryProvider = route.query.provider
  if (queryProvider) {
    form.value.provider_id = Number(queryProvider)
  } else if (catalog.providers.length) {
    form.value.provider_id = catalog.providers[0].id
  }
  form.value.address = catalog.customerLocation?.label || ''
})

function validate() {
  if (!form.value.provider_id) return 'Please choose a provider'
  if (!form.value.scheduled_date || !form.value.scheduled_time) return 'Please pick a date and time'
  if (!form.value.address.trim()) return 'Please enter a service address'
  return null
}

async function submit() {
  const v = validate()
  if (v) { error.value = v; return }
  error.value = null
  submitting.value = true

  try {
    const job = await bookingStore.createBooking({
      provider_id: selectedProvider.value.id,
      provider_name: selectedProvider.value.name,
      category_id: selectedCategory.value?.id ?? null,
      category_name: selectedCategory.value?.name || selectedProvider.value.service,
      scheduled_at: `${form.value.scheduled_date} ${form.value.scheduled_time}`,
      address: form.value.address.trim(),
      notes: form.value.notes.trim(),
      estimated_cost: selectedProvider.value.base_rate,
      is_recurring: form.value.is_recurring,
      recurring_frequency: form.value.recurring_frequency,
    })

    await bookingStore.loadBookings()
    router.push({ name: 'job-ticket', params: { id: job.id } })
  } catch (e) {
    error.value = e.message || 'Could not create booking. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="create-booking-view">
    <header class="page-head">
      <h2>Book a service</h2>
      <p class="muted">Confirm the details below to request a provider.</p>
    </header>

    <form class="booking-form" @submit.prevent="submit">
      <!-- Selected provider hero -->
      <div v-if="selectedProvider" class="provider-hero" :style="{ background: theme.banner }">
        <div class="ph-pattern" aria-hidden="true"></div>
        <div class="ph-avatar" :style="{ background: theme.avatarBg, color: theme.avatarColor }">
          {{ initials(selectedProvider.name) }}
        </div>
        <div class="ph-info">
          <div class="ph-name-row">
            <h3 class="ph-name">{{ selectedProvider.name }}</h3>
            <span v-if="selectedProvider.verification_status === 'verified'" class="ph-verified">✓ Verified</span>
          </div>
          <p class="ph-service">{{ selectedProvider.service }} specialist</p>
          <div class="ph-meta">
            <span class="ph-stars">⭐ {{ Number(selectedProvider.rating).toFixed(1) }}
              <span class="ph-reviews">({{ selectedProvider.total_reviews }})</span>
            </span>
            <span class="ph-dot">·</span>
            <span class="ph-loc">📍 {{ selectedProvider.location }}</span>
          </div>
        </div>
        <div class="ph-rate">
          <span class="ph-rate-label">From</span>
          <span class="ph-rate-value">RM {{ selectedProvider.base_rate }}</span>
        </div>
      </div>

      <!-- Date + Time: a shared grid so both inputs sit on the same row even
           when the chip rows above them differ in height. -->
      <div class="datetime-grid">
        <label class="form-label">📅 Date</label>
        <label class="form-label">⏰ Time</label>

        <div class="quick-chips">
          <button type="button" class="quick-chip" :class="{ active: form.scheduled_date === today }" @click="pickDate(today)">Today</button>
          <button type="button" class="quick-chip" :class="{ active: form.scheduled_date === tomorrow }" @click="pickDate(tomorrow)">Tomorrow</button>
          <span v-if="prettyDate" class="quick-chip-selected">{{ prettyDate }}</span>
        </div>
        <div class="quick-chips">
          <button
            v-for="slot in TIME_SLOTS" :key="slot.value"
            type="button"
            class="quick-chip"
            :class="{ active: form.scheduled_time === slot.value }"
            @click="pickTime(slot.value)"
          >{{ slot.label }}</button>
        </div>

        <input v-model="form.scheduled_date" type="date" :min="minDate" class="form-input-element-control" />
        <input v-model="form.scheduled_time" type="time" class="form-input-element-control" />
      </div>

      <!-- Address -->
      <div class="form-group">
        <label class="form-label">📍 Service address</label>
        <input v-model="form.address" type="text" class="form-input-element-control" placeholder="Where should the provider go?" />
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label class="form-label">📝 Notes for the provider (optional)</label>
        <textarea v-model="form.notes" rows="3" class="form-input-element-control" placeholder="Describe the issue or any access details"></textarea>
      </div>

      <!-- Recurring -->
      <div class="recurring-box">
        <label class="recurring-toggle">
          <input v-model="form.is_recurring" type="checkbox" />
          <span>🔄 Make this a recurring booking</span>
        </label>
        <div v-if="form.is_recurring" class="form-group recurring-freq">
          <label class="form-label">Frequency</label>
          <select v-model="form.recurring_frequency" class="form-select-control">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
          </select>
          <p class="muted recurring-hint">We'll schedule the next 3 occurrences automatically — manage or cancel them anytime from Recurring Bookings.</p>
        </div>
      </div>

      <!-- Cost summary -->
      <div v-if="selectedProvider" class="cost-summary">
        <div class="cost-row">
          <span class="muted">Service starting rate</span>
          <span>RM {{ selectedProvider.base_rate }}</span>
        </div>
        <div class="cost-row">
          <span class="muted">Platform fee</span>
          <span>RM {{ PLATFORM_FEE }}</span>
        </div>
        <div class="cost-row cost-total">
          <span>Estimated total</span>
          <span>RM {{ estTotal }}</span>
        </div>
        <p class="cost-note">Final price is confirmed by the provider after they review the job.</p>
      </div>

      <p v-if="error" class="form-error">⚠️ {{ error }}</p>

      <div class="form-actions">
        <button type="button" class="btn-ui btn-ui-ghost" @click="router.back()">Cancel</button>
        <button type="submit" class="btn-ui btn-ui-primary btn-confirm" :disabled="submitting">
          <span v-if="submitting">Booking…</span>
          <span v-else>Confirm booking · RM {{ estTotal }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-booking-view { max-width: 940px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-lg); }
.page-head h2 { font-size: 1.5rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.02em; }
.page-head p { margin-top: 4px; }
.booking-form {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-md);
}
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 0.82rem; font-weight: 700; color: var(--color-text); display: inline-flex; align-items: center; gap: 6px; }

/* Date + Time share one grid: 2 columns × 3 rows (labels / chips / inputs).
   Because the two chip cells live in the same grid row, the input row below
   them starts at the same Y in both columns — so the inputs always line up. */
.datetime-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--spacing-md);
  row-gap: 8px;
  align-items: start;
}

/* ----- Provider hero ----- */
.provider-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-md);
  overflow: hidden;
  color: #fff;
}
.ph-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 15% 20%, rgba(255,255,255,0.18) 0, transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(255,255,255,0.12) 0, transparent 35%);
  pointer-events: none;
}
.ph-avatar {
  position: relative;
  width: 56px; height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.15rem;
  flex-shrink: 0;
  border: 3px solid rgba(255,255,255,0.6);
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
}
.ph-info { position: relative; flex: 1; min-width: 0; }
.ph-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ph-name { font-size: 1.05rem; font-weight: 800; color: #fff; }
.ph-verified {
  font-size: 0.66rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(4px);
}
.ph-service { font-size: 0.8rem; opacity: 0.9; margin-top: 2px; }
.ph-meta { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; margin-top: 4px; opacity: 0.95; }
.ph-reviews { opacity: 0.8; }
.ph-dot { opacity: 0.6; }
.ph-rate { position: relative; text-align: right; flex-shrink: 0; }
.ph-rate-label { display: block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.85; font-weight: 700; }
.ph-rate-value { display: block; font-size: 1.25rem; font-weight: 800; line-height: 1.1; }

/* ----- Quick chips ----- */
.quick-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.quick-chip {
  border: 2px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-muted);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition-smooth);
  font-family: var(--font-main);
}
.quick-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.quick-chip.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.quick-chip-selected {
  margin-left: auto;
  align-self: center;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-primary);
}

/* ----- Recurring ----- */
.recurring-box { border-top: 2px solid var(--color-border); padding-top: var(--spacing-md); display: flex; flex-direction: column; gap: 10px; }
.recurring-toggle { display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--color-text); }
.recurring-toggle input { width: 16px; height: 16px; cursor: pointer; }
.recurring-freq { padding-left: 4px; }
.recurring-hint { font-size: 0.78rem; }

/* ----- Cost summary ----- */
.cost-summary {
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cost-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
.cost-row span:last-child { font-weight: 700; color: var(--color-text); }
.cost-total {
  border-top: 2px dashed var(--color-border);
  padding-top: 10px;
  margin-top: 2px;
  font-size: 1rem;
}
.cost-total span { font-weight: 800; }
.cost-total span:last-child { color: var(--color-primary); font-size: 1.15rem; }
.cost-note { font-size: 0.72rem; color: var(--color-muted); margin-top: 2px; }

.form-error { color: var(--color-danger); font-size: 0.85rem; font-weight: 600; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; align-items: center; }
.btn-confirm { box-shadow: 0 4px 12px -3px rgba(37, 99, 235, 0.5); }
.btn-confirm:hover:not(:disabled) { transform: translateY(-1px); }

@media (max-width: 560px) {
  .datetime-grid { grid-template-columns: 1fr; }
  .provider-hero { flex-wrap: wrap; }
  .ph-rate { text-align: left; }
  .form-actions { flex-direction: column-reverse; }
  .form-actions .btn-ui { width: 100%; justify-content: center; }
}
</style>
