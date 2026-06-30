<script setup>
import { ref, computed, onActivated, onMounted, onBeforeUnmount, watch } from 'vue'
import { useBookingStore } from '@/stores/booking'
import { usePayment, getStripe } from '@/composables/usePayment'
import JobStatusStepper from './JobStatusStepper.vue'
import TipRatingModal from './TipRatingModal.vue'

const props = defineProps({
  id: { type: [String, Number], required: true },
})
const emit = defineEmits(['close'])

const bookingStore = useBookingStore()
const { pay, processing: payProcessing, payError, succeeded: paySucceeded } = usePayment()

const showReviewModal = ref(false)
const confirming = ref(false)
const cancelling = ref(false)
const confirmationMessage = ref('')

// ── Stripe Elements ───────────────────────────────────────────────────────
const showPayForm  = ref(false)
const cardMounted  = ref(false)
const cardError    = ref('')

let cardElement = null

async function mountCard() {
  if (cardMounted.value) return
  const stripe   = await getStripe()   // same instance used by confirmCardPayment
  const elements = stripe.elements()
  const themeStyles = getComputedStyle(document.body)
  const stripeText = themeStyles.getPropertyValue('--color-text').trim() || '#1e293b'
  const stripeMuted = themeStyles.getPropertyValue('--color-muted').trim() || '#94a3b8'
  cardElement = elements.create('card', {
    style: {
      base: {
        fontFamily: 'Inter, sans-serif',
        fontSize:   '15px',
        color:      stripeText,
        '::placeholder': { color: stripeMuted },
      },
      invalid: { color: '#ef4444' },
    },
  })
  cardElement.mount('#stripe-card-element')
  cardElement.on('change', (e) => { cardError.value = e.error?.message ?? '' })
  cardMounted.value = true
}

async function openPayForm() {
  showPayForm.value = true
  await mountCard()
}

async function submitPayment() {
  if (!cardElement) return
  const ok = await pay(job.value.id, cardElement)
  if (ok) {
    bookingStore.markPaid(job.value.id)
    confirmationMessage.value = 'Payment successful! Your job is now closed.'
    showPayForm.value = false
    // Refresh the full list so the banner and Upcoming count update immediately
    await bookingStore.loadBookings()
    await bookingStore.loadJob(job.value.id)
  }
}

onBeforeUnmount(() => { cardElement?.destroy() })

const job = computed(() => bookingStore.activeJob)

const needsCostConfirmation = computed(() => job.value?.status === 'cost_pending')
// Payment is due only after cost is confirmed (closed) and Stripe hasn't been paid yet
const needsPayment = computed(() =>
  job.value?.status === 'closed' && job.value?.payment_status !== 'paid'
)
// Review prompt after payment is confirmed, or once the job reaches 'reviewed'
const needsReview = computed(() =>
  job.value?.status === 'reviewed' ||
  (job.value?.status === 'closed' && job.value?.payment_status === 'paid')
)
const canCancel = computed(() => ['requested', 'accepted'].includes(job.value?.status))
const isRecurringInstance = computed(() => job.value?.is_recurring)

// Mirrors ProviderCard's per-provider accent palette so the ticket header
// reads consistently with how this provider looks elsewhere in the app.
const PALETTE = [
  { banner: 'linear-gradient(135deg, #3B82F6, #2563EB)', avatarBg: '#DBEAFE', avatarColor: '#2563EB' },
  { banner: 'linear-gradient(135deg, #2DD4BF, #059669)', avatarBg: '#CCFBF1', avatarColor: '#0F766E' },
  { banner: 'linear-gradient(135deg, #FBBF24, #D97706)', avatarBg: '#FEF3C7', avatarColor: '#B45309' },
  { banner: 'linear-gradient(135deg, #4ADE80, #16A34A)', avatarBg: '#DCFCE7', avatarColor: '#15803D' },
  { banner: 'linear-gradient(135deg, #38BDF8, #2563EB)', avatarBg: '#E0F2FE', avatarColor: '#0369A1' },
]
const theme = computed(() => (job.value ? PALETTE[job.value.provider_id % PALETTE.length] : PALETTE[0]))

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

// Human-readable label + accent for the current job status.
const STATUS_META = {
  requested:    { label: 'Requested',          color: '#2563EB' },
  accepted:     { label: 'Confirmed',          color: '#0EA5E9' },
  en_route:     { label: 'Provider en route',  color: '#0EA5E9' },
  in_progress:  { label: 'In progress',        color: '#F59E0B' },
  completed:    { label: 'Awaiting final cost', color: '#D97706' },
  cost_pending: { label: 'Confirm cost',       color: '#D97706' },
  closed:       { label: 'Payment due',        color: '#ea580c' },
  reviewed:     { label: 'Reviewed',           color: '#16A34A' },
  cancelled:    { label: 'Cancelled',          color: '#EF4444' },
}
const statusMeta = computed(() => STATUS_META[job.value?.status] || STATUS_META.requested)
const currentCostStatus = computed(() => {
  if (needsCostConfirmation.value) return 'Awaiting your confirmation'
  if (['closed', 'reviewed'].includes(job.value?.status)) return 'Cost confirmed'
  return 'Not ready yet'
})

// "2026-06-23 09:00" -> "Tue, 23 Jun 2026 - 9:00 AM"
const prettyScheduled = computed(() => {
  const raw = job.value?.scheduled_at
  if (!raw) return '—'
  const d = new Date(raw.replace(' ', 'T'))
  if (isNaN(d)) return raw
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} - ${time}`
})

async function load() {
  await bookingStore.loadJob(props.id)
}

onMounted(load)
onActivated(load)                         // re-fetch when panel becomes visible again
watch(() => props.id, load, { immediate: false })  // re-fetch when a different job is selected

async function confirmCost() {
  confirming.value = true
  try {
    await bookingStore.confirmJobCost(job.value.id)
    await bookingStore.loadJob(job.value.id)   // refresh so stepper + payment section update
    confirmationMessage.value = 'Final cost confirmed. You can now pay below.'
  } finally {
    confirming.value = false
  }
}

async function cancel() {
  if (!confirm('Cancel this booking?')) return
  cancelling.value = true
  await bookingStore.cancelBooking(job.value.id)
  cancelling.value = false
}

async function onSubmitReview(payload) {
  await bookingStore.submitReview(job.value.id, payload)
  showReviewModal.value = false
}
</script>

<template>
  <div class="job-ticket-panel customer-ticket-panel">
    <header class="panel-head">
      <div>
        <span class="ticket-kicker">Job Ticket</span>
        <h3 class="panel-title">Job Ticket · #{{ job?.id || props.id }}</h3>
      </div>
      <button class="panel-close" type="button" aria-label="Close" @click="emit('close')">✕</button>
    </header>

    <div class="panel-body">
      <div v-if="bookingStore.loading" class="muted">Loading ticket…</div>
      <div v-else-if="!job" class="empty-state">
        <p class="muted">We couldn't find that booking.</p>
      </div>

      <template v-else>
        <section class="ticket-header-card">
          <div class="ticket-banner" :style="{ background: theme.banner }">
            <div class="tb-pattern" aria-hidden="true"></div>
          </div>
          <div class="ticket-avatar" :style="{ background: theme.avatarBg, color: theme.avatarColor }">
            {{ initials(job.provider_name) }}
          </div>
          <div class="ticket-head-body">
            <div class="ticket-head-row">
              <div>
                <h2>{{ job.provider_name }}</h2>
                <p class="muted ticket-head-sub">{{ job.category_name }} · Job #{{ job.id }}</p>
              </div>
              <span class="ticket-status-badge">
                <span class="tsb-dot" :style="{ background: statusMeta.color }"></span>
                {{ statusMeta.label }}
              </span>
            </div>
            <div class="ticket-provider-meta">
              <span>{{ job.category_name }} service</span>
              <span>{{ currentCostStatus }}</span>
              <span v-if="isRecurringInstance">Recurring: {{ job.recurring_frequency }}</span>
            </div>
          </div>
        </section>

        <section class="ticket-card stepper-card">
          <JobStatusStepper :status="job.status" />
        </section>

        <section class="ticket-card details-grid">
          <div class="detail-item">
            <div class="detail-icon">📅</div>
            <div class="detail-text">
              <small class="muted detail-label">Scheduled date and time</small>
              <p class="detail-value">{{ prettyScheduled }}</p>
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-icon">📍</div>
            <div class="detail-text">
              <small class="muted detail-label">Address / service area</small>
              <p class="detail-value">{{ job.address }}</p>
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-icon">💰</div>
            <div class="detail-text">
              <small class="muted detail-label">Estimated cost</small>
              <p class="detail-value detail-value-cost">RM {{ job.estimated_cost }}</p>
            </div>
          </div>
          <div v-if="job.notes" class="detail-item detail-item-wide">
            <div class="detail-icon">📝</div>
            <div class="detail-text">
              <small class="muted detail-label">Customer note</small>
              <p class="detail-value detail-value-normal">{{ job.notes }}</p>
            </div>
          </div>
        </section>

        <!-- ── Stripe Payment Section ────────────────────────────────── -->
        <section v-if="needsPayment" class="ticket-card payment-section">
          <div class="payment-header">
            <div>
              <small class="muted cost-highlight-label">Amount due</small>
              <strong class="cost-highlight-amount">RM {{ job.final_cost ?? job.estimated_cost }}</strong>
            </div>
            <span class="payment-badge">💳 Payment requested</span>
          </div>
          <p class="muted" style="margin:0;">Your provider has completed this job and is requesting payment.</p>

          <div v-if="!showPayForm">
            <button class="btn-ui btn-ui-primary cost-confirm-btn" @click="openPayForm">
              Pay now with card
            </button>
          </div>

          <div v-else class="stripe-form">
            <label class="stripe-label">Card details</label>
            <div id="stripe-card-element" class="stripe-card-input"></div>
            <p v-if="cardError" class="stripe-error">{{ cardError }}</p>
            <p v-if="payError" class="stripe-error">{{ payError }}</p>

            <div class="stripe-actions">
              <button class="btn-ui btn-ui-outline" @click="showPayForm = false" :disabled="payProcessing">Cancel</button>
              <button
                class="btn-ui btn-ui-primary"
                style="flex:1;"
                :disabled="!cardMounted || payProcessing"
                @click="submitPayment"
              >
                {{ payProcessing ? 'Processing…' : `Pay RM ${job.final_cost ?? job.estimated_cost}` }}
              </button>
            </div>
            <p class="stripe-secure">🔒 Secured by Stripe · Test Mode</p>
          </div>
        </section>

        <section v-else-if="job.payment_status === 'paid'" class="ticket-card cost-confirm done">
          <h3>Payment</h3>
          <div class="cost-row">
            <span>Amount paid</span>
            <strong>RM {{ job.final_cost ?? job.estimated_cost }}</strong>
          </div>
          <span class="badge-ui badge-ui-success">✓ Paid</span>
        </section>
        <!-- ── /Stripe Payment Section ─────────────────────────────── -->

        <section v-if="needsCostConfirmation" class="ticket-card cost-highlight">
          <div>
            <small class="muted cost-highlight-label">Final Cost</small>
            <strong class="cost-highlight-amount">RM {{ job.final_cost }}</strong>
          </div>
          <p class="muted">The provider has completed this service and submitted the final amount for your confirmation.</p>
          <p v-if="job.provider_note || job.cost_note" class="provider-note">{{ job.provider_note || job.cost_note }}</p>
          <button class="btn-ui btn-ui-primary cost-confirm-btn" :disabled="confirming" @click="confirmCost">
            {{ confirming ? 'Confirming…' : 'Confirm & Accept Cost' }}
          </button>
        </section>

        <section v-else-if="['closed', 'reviewed'].includes(job.status)" class="ticket-card cost-confirm done">
          <h3>Final Cost</h3>
          <div class="cost-row">
            <span>Confirmed cost</span>
            <strong>RM {{ job.final_cost ?? job.estimated_cost }}</strong>
          </div>
          <span class="badge-ui badge-ui-success">✓ Confirmed</span>
        </section>

        <p v-if="confirmationMessage" class="ticket-toast">{{ confirmationMessage }}</p>

        <section v-if="needsReview" class="ticket-card review-prompt">
          <h3>How was your service?</h3>
          <p class="review-stars">⭐⭐⭐⭐⭐</p>
          <p class="muted">Leave a review and an optional tip for {{ job.provider_name }}.</p>
          <button class="btn-ui btn-ui-primary review-btn" @click="showReviewModal = true">Rate & tip</button>
        </section>

        <section v-else-if="job.reviewed" class="ticket-card review-prompt done">
          <h3>✓ Review submitted</h3>
          <p v-if="job.tip_amount" class="muted">You tipped RM {{ job.tip_amount }}. Thank you!</p>
        </section>

        <div v-if="canCancel" class="ticket-actions">
          <button class="btn-ui btn-ui-danger" :disabled="cancelling" @click="cancel">
            {{ cancelling ? 'Cancelling…' : 'Cancel booking' }}
          </button>
        </div>
      </template>
    </div>

    <TipRatingModal v-if="showReviewModal" :job="job" @submit="onSubmitReview" @close="showReviewModal = false" />
  </div>
</template>

<style scoped>
.job-ticket-panel { display: flex; flex-direction: column; height: 100%; flex: 1; min-width: 0; }
.panel-head {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}
.panel-title { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.panel-close {
  width: 30px; height: 30px;
  border-radius: 50%;
  border: none;
  background: var(--color-background);
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.panel-close:hover { background: var(--color-border); color: var(--color-text); }
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex; flex-direction: column; gap: var(--spacing-lg);
}

.ticket-header-card {
  position: relative;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.ticket-banner { height: 80px; position: relative; overflow: hidden; }
.tb-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 18% 25%, rgba(255,255,255,0.2) 0, transparent 42%),
    radial-gradient(circle at 82% 75%, rgba(255,255,255,0.12) 0, transparent 38%);
  pointer-events: none;
}
.ticket-status-badge {
  position: absolute;
  top: 12px; right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.92);
  color: #1E293B;
  font-size: 0.74rem;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  backdrop-filter: blur(6px);
}
.tsb-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
}
.ticket-avatar {
  position: absolute;
  left: var(--spacing-lg); top: 44px;
  width: 64px; height: 64px; border-radius: 50%;
  border: 4px solid var(--color-card);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800;
  box-shadow: 0 4px 10px rgba(0,0,0,0.18);
  z-index: 2;
}
.ticket-head-body { padding: 40px var(--spacing-lg) var(--spacing-lg); }
.ticket-head-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ticket-head-row h2 { font-size: 1.3rem; font-weight: 800; color: var(--color-text); letter-spacing: -0.02em; }
.ticket-head-sub { font-size: 0.85rem; margin-top: 2px; }

.ticket-card {
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}
.stepper-card {
  padding: var(--spacing-xl);
  background: var(--color-card);
  box-shadow: var(--shadow-md);
}

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); }
.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
}
.detail-item-wide { grid-column: 1 / -1; }
.detail-icon {
  flex-shrink: 0;
  width: 34px; height: 34px;
  border-radius: var(--radius-sm);
  background: var(--color-background);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
}
.detail-text { min-width: 0; }
.detail-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.detail-value { margin-top: 3px; font-size: 0.98rem; font-weight: 700; color: var(--color-text); }
.detail-value-normal { font-weight: 500; line-height: 1.4; }
.detail-value-cost { color: var(--color-primary); font-size: 1.1rem; }

/* ── Payment section ──────────────────────────────────────────────────── */
.payment-section {
  display: flex; flex-direction: column; gap: var(--spacing-md);
  background: rgba(234, 88, 12, 0.07);
  border-color: rgba(234, 88, 12, 0.3);
}
.payment-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.payment-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(234, 88, 12, 0.12); color: #ea580c;
  font-size: 0.75rem; font-weight: 800;
  padding: 4px 10px; border-radius: 999px;
}
.stripe-form { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.stripe-label { font-size: 0.78rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.stripe-card-input {
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}
.stripe-error { color: #ef4444; font-size: 0.82rem; margin: 0; }
.stripe-actions { display: flex; gap: 10px; margin-top: 4px; }
.stripe-secure { text-align: center; font-size: 0.73rem; color: var(--color-muted); margin: 0; }
/* ── /Payment section ─────────────────────────────────────────────────── */

.cost-confirm, .review-prompt { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cost-confirm h3, .review-prompt h3 { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.cost-confirm.done, .review-prompt.done { background: var(--color-background); }
.cost-row { display: flex; align-items: center; justify-content: space-between; font-size: 1rem; }
.cost-row strong { font-size: 1.2rem; color: var(--color-text); }

.cost-highlight {
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  background: rgba(37, 99, 235, 0.1);
  border-color: transparent;
}
.cost-highlight-label { font-size: 0.75rem; }
.cost-highlight-amount { font-size: 2rem; font-weight: 800; color: var(--color-primary); }
.cost-confirm-btn { width: 100%; margin-top: 6px; }

.review-stars { font-size: 1.4rem; letter-spacing: 4px; margin: 2px 0; }
.review-btn { width: 100%; }

.ticket-actions { display: flex; justify-content: flex-end; }

.customer-ticket-panel {
  width: 100%;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.customer-ticket-panel .panel-head {
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom-width: 1px;
}
.ticket-kicker {
  display: block;
  color: var(--color-muted);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.customer-ticket-panel .panel-title {
  margin-top: 4px;
  font-size: clamp(1.2rem, 2.6vw, 1.55rem);
}
.customer-ticket-panel .panel-body {
  padding: clamp(16px, 2.6vw, 24px);
  gap: 16px;
}
.customer-ticket-panel .stepper-card {
  padding: clamp(14px, 2vw, 20px);
}
.customer-ticket-panel .ticket-header-card,
.customer-ticket-panel .ticket-card {
  border-width: 1px;
}
.customer-ticket-panel .ticket-banner {
  height: 72px;
}
.customer-ticket-panel .ticket-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}
.customer-ticket-panel .ticket-head-body {
  padding-top: 38px;
}
.customer-ticket-panel .ticket-head-row {
  justify-content: space-between;
  align-items: flex-start;
}
.customer-ticket-panel .ticket-status-badge {
  position: static;
  flex: 0 0 auto;
  color: #0f172a;
}
.ticket-provider-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.ticket-provider-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-muted);
  font-size: .78rem;
  font-weight: 800;
}
.customer-ticket-panel .details-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.customer-ticket-panel .detail-item {
  min-height: 104px;
  border-width: 1px;
}
.customer-ticket-panel .detail-item-wide {
  grid-column: 1 / -1;
  min-height: auto;
}
.customer-ticket-panel .detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.provider-note {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgba(37, 99, 235, .22);
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, .08);
  color: var(--color-text);
  line-height: 1.5;
}
.ticket-toast {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid rgba(34, 197, 94, .28);
  border-radius: var(--radius-md);
  background: rgba(34, 197, 94, .1);
  color: var(--color-success);
  font-weight: 800;
}

@media (max-width: 760px) {
  .customer-ticket-panel .panel-head,
  .customer-ticket-panel .panel-body {
    padding-left: 16px;
    padding-right: 16px;
  }
  .customer-ticket-panel .ticket-head-row,
  .customer-ticket-panel .details-grid {
    grid-template-columns: 1fr;
  }
  .customer-ticket-panel .ticket-status-badge {
    margin-top: 10px;
  }
  .ticket-provider-meta {
    display: grid;
  }
  .cost-confirm-btn,
  .review-btn,
  .ticket-actions .btn-ui {
    width: 100%;
  }
}
</style>
