<script setup>
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useBookingStore } from '@/stores/booking'
import { onMounted, onBeforeUnmount, onActivated, ref, reactive, computed, watch, nextTick } from 'vue'
import { usePayment, getStripe } from '@/composables/usePayment'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import CategoryCard from '@/components/CategoryCard.vue'
import TipRatingModal from '@/components/TipRatingModal.vue'

const router = useRouter()
const store = useCatalogStore()
const bookingStore = useBookingStore()
const searchQuery = ref('')

const STATUS_BADGE = {
  requested: 'badge-ui-warning',
  accepted: 'badge-ui-success',
  en_route: 'badge-ui-warning',
  in_progress: 'badge-ui-warning',
  // cost_pending/closed/reviewed are all post-completion sub-states — same
  // badge the old single 'completed' status always showed.
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

const confirmingId = ref(null)
const { pay, processing: payProcessing, payError } = usePayment()
const showDashboardPayForm = ref(false)
const dashboardCardMounted = ref(false)
const dashboardCardError = ref('')
const dashboardPaymentMessage = ref('')
let dashboardCardElement = null

const selectedBookingId = ref(null)
const ACTIVE_DASHBOARD_STATUSES = new Set(['requested', 'accepted', 'en_route', 'in_progress', 'cost_pending'])

function bookingNeedsPayment(booking) {
  return booking?.status === 'closed' && booking?.payment_status !== 'paid'
}

function bookingBelongsOnDashboard(booking) {
  return ACTIVE_DASHBOARD_STATUSES.has(booking?.status) || bookingNeedsPayment(booking)
}

function dashboardStatusLabel(booking) {
  if (bookingNeedsPayment(booking)) return 'Payment Due'
  if (booking?.status === 'cost_pending') return 'Confirm Cost'
  return STATUS_LABEL[booking.status] || booking.status
}

function dashboardStatusBadge(booking) {
  if (bookingNeedsPayment(booking)) return 'badge-ui-warning'
  return STATUS_BADGE[booking.status] || 'badge-ui-neutral'
}

function dashboardPaymentLabel(booking) {
  if (bookingNeedsPayment(booking)) return 'waiting for payment'
  return booking.payment_status || 'not started'
}

function dashboardPaymentBadge(booking) {
  if (bookingNeedsPayment(booking)) return 'badge-ui-warning'
  if (booking?.payment_status === 'paid') return 'badge-ui-success'
  return 'badge-ui-neutral'
}

function bookingServiceName(booking) {
  return booking?.category_name || booking?.service_title || 'Home service'
}

const dashboardBookings = computed(() =>
  bookingStore.bookings
    .filter(bookingBelongsOnDashboard)
    .slice()
    .sort((a, b) => {
      const bDate = new Date(String(b.created_at || b.scheduled_at || '').replace(' ', 'T'))
      const aDate = new Date(String(a.created_at || a.scheduled_at || '').replace(' ', 'T'))
      return (Number.isNaN(bDate.getTime()) ? 0 : bDate.getTime()) - (Number.isNaN(aDate.getTime()) ? 0 : aDate.getTime())
    })
)
const selectedBooking = computed(() =>
  dashboardBookings.value.find((b) => Number(b.id) === Number(selectedBookingId.value)) || dashboardBookings.value[0] || null
)
const selectedBookingNeedsPayment = computed(() => bookingNeedsPayment(selectedBooking.value))
const selectedBookingCanReview = computed(() =>
  selectedBooking.value?.status === 'closed' && selectedBooking.value?.payment_status === 'paid'
)
function selectBooking(id) {
  selectedBookingId.value = id
}

function shortDate(dt) {
  if (!dt) return 'Not set'
  const parsed = new Date(String(dt).replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return dt
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function money(value) {
  if (value === null || value === undefined || value === '') return 'Not set'
  return `RM ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

watch(
  dashboardBookings,
  (bookings) => {
    if (!bookings.length) {
      selectedBookingId.value = null
      return
    }
    if (!bookings.some((booking) => Number(booking.id) === Number(selectedBookingId.value))) {
      selectedBookingId.value = bookings[0].id
    }
  },
  { immediate: true }
)

watch(
  () => selectedBooking.value?.id,
  () => {
    closeDashboardPaymentForm()
  }
)

const TIMELINE_STEPS = ['Request created', 'Provider accepted', 'Provider on the way', 'Work in progress', 'Final cost confirmed']
const STATUS_STEP = { requested: 1, accepted: 2, en_route: 3, in_progress: 4, cost_pending: 5, closed: 5, reviewed: 5, cancelled: 1 }
function stepState(stepIndex, status) {
  if (status === 'reviewed') return 'done'
  const active = STATUS_STEP[status] ?? 1
  if (stepIndex < active) return 'done'
  if (stepIndex === active) return 'active'
  return 'future'
}

// ─── compact read-only Leaflet widget (replaces the old radar mock) ───
const dashMapEl = ref(null)
let dashMap = null
let dashMapResizeObserver = null

const dashBlueIcon = L.divIcon({
  className: 'dash-map-pin-wrap',
  html: '<div class="dash-map-pin"></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
})

// Duplicated from MapView.vue's "you are here" red pin style.
const dashRedIcon = L.divIcon({
  className: 'dash-map-pin-wrap',
  html: '<div class="dash-map-pin-red"></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
})
let youAreHereMarker = null

function dashProviderCoords(provider) {
  const dist = Number(provider.distance) || 1
  const angle = ((provider.id * 47) % 360) * (Math.PI / 180)
  const latOffset = (dist / 111) * Math.cos(angle)
  const lngOffset = (dist / (111 * Math.cos((store.customerLocation.lat * Math.PI) / 180))) * Math.sin(angle)
  return { lat: store.customerLocation.lat + latOffset, lng: store.customerLocation.lng + lngOffset }
}

const hoveredProvider = ref(null)
const cardPosition = ref({ x: 0, y: 0 })
let hoverHideTimer = null

function cancelHoverHide() {
  if (hoverHideTimer) {
    clearTimeout(hoverHideTimer)
    hoverHideTimer = null
  }
}

function scheduleHoverHide() {
  hoverHideTimer = setTimeout(() => {
    hoveredProvider.value = null
  }, 150)
}

function positionDashCard(marker) {
  if (!dashMap || !dashMapEl.value) return
  const point = dashMap.latLngToContainerPoint(marker.getLatLng())
  const mapRect = dashMapEl.value.getBoundingClientRect()
  const CARD_WIDTH = 200
  const CARD_HEIGHT_ESTIMATE = 110
  const GAP = 10
  const PIN_HEIGHT = 30

  const markerX = mapRect.left + point.x
  const pinTopY = mapRect.top + point.y - PIN_HEIGHT

  let top = pinTopY - GAP - CARD_HEIGHT_ESTIMATE
  if (top < 8) top = 8

  let left = markerX - CARD_WIDTH / 2
  const viewportW = window.innerWidth
  if (left + CARD_WIDTH > viewportW - 8) left = viewportW - CARD_WIDTH - 8
  if (left < 8) left = 8

  cardPosition.value = { x: left, y: top }
}

function showDashCard(provider, marker) {
  cancelHoverHide()
  hoveredProvider.value = provider
  positionDashCard(marker)
}

let dashMarkers = []

function renderDashMarkers() {
  if (!dashMap) return
  dashMarkers.forEach((m) => dashMap.removeLayer(m))
  dashMarkers = []
  store.providers.forEach((p) => {
    const coords = dashProviderCoords(p)
    const marker = L.marker([coords.lat, coords.lng], { icon: dashBlueIcon }).addTo(dashMap)
    marker.on('mouseover', () => showDashCard(p, marker))
    marker.on('mouseout', () => scheduleHoverHide())
    marker.on('click', () => router.push(`/customer/providers/${p.id}`))
    dashMarkers.push(marker)
  })
}

const locating = ref(false)

function detectLocation() {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser — keeping default location.')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      store.customerLocation = { lat, lng, label: 'Your location' }
      if (dashMap) dashMap.setView([lat, lng], 13)
      await store.loadProviders()
      renderDashMarkers()
      locating.value = false
    },
    (err) => {
      console.warn('Unable to detect location, keeping default.', err)
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  )
}

const recenterError = ref('')
let recenterErrorTimer = null

function flashRecenterError(message) {
  recenterError.value = message
  clearTimeout(recenterErrorTimer)
  recenterErrorTimer = setTimeout(() => {
    recenterError.value = ''
  }, 3000)
}

function recenterMap() {
  if (!navigator.geolocation) {
    if (dashMap) dashMap.setView([store.customerLocation.lat, store.customerLocation.lng], 13)
    flashRecenterError('Location access denied.')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      if (dashMap) dashMap.setView([lat, lng], 13)
      if (youAreHereMarker) {
        dashMap.removeLayer(youAreHereMarker)
        youAreHereMarker = null
      }
      youAreHereMarker = L.marker([lat, lng], { icon: dashRedIcon })
        .bindPopup('📍 You are here')
        .addTo(dashMap)
      locating.value = false
    },
    () => {
      if (dashMap) dashMap.setView([store.customerLocation.lat, store.customerLocation.lng], 13)
      locating.value = false
      flashRecenterError('Location access denied.')
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  )
}

function refreshDashboardBookings() {
  return bookingStore.loadBookings()
}

onMounted(async () => {
  if (!store.categories.length) store.loadCategories()
  refreshDashboardBookings()

  if (!store.providers.length) await store.loadProviders()

  dashMap = L.map(dashMapEl.value, {
    center: [store.customerLocation.lat, store.customerLocation.lng],
    zoom: 13,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(dashMap)
  renderDashMarkers()
  dashMap.invalidateSize()

  // The radar card stretches to match the recurring-bookings card height, so
  // the map container can resize after data loads — keep Leaflet in sync.
  dashMapResizeObserver = new ResizeObserver(() => {
    if (dashMap) dashMap.invalidateSize()
  })
  dashMapResizeObserver.observe(dashMapEl.value)

  detectLocation()
})

onActivated(refreshDashboardBookings)

onBeforeUnmount(() => {
  cancelHoverHide()
  clearTimeout(recenterErrorTimer)
  if (dashMapResizeObserver) dashMapResizeObserver.disconnect()
  if (dashMap) dashMap.remove()
  closeDashboardPaymentForm()
})

function closeDashboardPaymentForm(clearMessage = true) {
  showDashboardPayForm.value = false
  dashboardCardError.value = ''
  if (clearMessage) dashboardPaymentMessage.value = ''
  if (dashboardCardElement) {
    dashboardCardElement.destroy()
    dashboardCardElement = null
  }
  dashboardCardMounted.value = false
}

async function mountDashboardCard() {
  if (dashboardCardMounted.value) return
  await nextTick()
  const stripe = await getStripe()
  const elements = stripe.elements()
  const themeStyles = getComputedStyle(document.body)
  const stripeText = themeStyles.getPropertyValue('--color-text').trim() || '#1e293b'
  const stripeMuted = themeStyles.getPropertyValue('--color-muted').trim() || '#94a3b8'

  dashboardCardElement = elements.create('card', {
    style: {
      base: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '15px',
        color: stripeText,
        '::placeholder': { color: stripeMuted },
      },
      invalid: { color: '#ef4444' },
    },
  })
  dashboardCardElement.mount('#dashboard-stripe-card-element')
  dashboardCardElement.on('change', (event) => {
    dashboardCardError.value = event.error?.message ?? ''
  })
  dashboardCardMounted.value = true
}

async function openDashboardPayForm() {
  dashboardPaymentMessage.value = ''
  showDashboardPayForm.value = true
  await mountDashboardCard()
}

async function submitDashboardPayment() {
  if (!selectedBooking.value || !dashboardCardElement) return
  const paidBookingId = selectedBooking.value.id
  const ok = await pay(paidBookingId, dashboardCardElement)
  if (!ok) return

  bookingStore.markPaid(paidBookingId)
  closeDashboardPaymentForm(false)
  await bookingStore.loadBookings()
  await nextTick()
  dashboardPaymentMessage.value = `Payment successful for #FX-${paidBookingId}.`
}

async function confirmCost(id) {
  confirmingId.value = id
  try {
    await bookingStore.confirmJobCost(id)
    await bookingStore.loadBookings()
  } finally {
    confirmingId.value = null
  }
}

const showReviewModal = ref(false)

async function onSubmitReview(payload) {
  await bookingStore.submitReview(selectedBooking.value.id, payload)
  showReviewModal.value = false
}

function runSearch() {
  store.setFilter({ search: searchQuery.value })
  router.push('/customer/providers')
}

function openCategory(category) {
  store.setFilter({ categoryId: category.id })
  router.push('/customer/providers')
}

const recurringSeries = computed(() => bookingStore.recurringSeries)

function activeOccurrenceCount(parentId) {
  return bookingStore.bookings.filter(
    (b) => b.parent_job_id === parentId && ['requested', 'accepted'].includes(b.status)
  ).length
}

// Mirrors RecurringBookingsView so the dashboard cards behave the same.
// (STATUS_BADGE / STATUS_LABEL are already declared above and reused here.)
function occurrencesOf(parentId) {
  return bookingStore.bookings.filter((b) => b.parent_job_id === parentId)
}
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
function completedCountFor(seriesId) {
  return allOccurrencesOf(seriesId).filter((job) => ['closed', 'reviewed'].includes(job.status)).length
}

const pausedSeries = reactive({})
function togglePause(seriesId) {
  pausedSeries[seriesId] = !pausedSeries[seriesId]
}
const expandedSeries = reactive({})
function toggleExpanded(seriesId) {
  expandedSeries[seriesId] = !expandedSeries[seriesId]
}

async function cancelSeries(parentId) {
  if (!confirm('Cancel all upcoming occurrences in this recurring booking?')) return
  await bookingStore.cancelRecurringSeries(parentId)
}
</script>

<template>
  <div>
    <!-- Hero Banner -->
    <div class="marketplace-hero-banner">
      <div class="hero-top-flex">
        <div class="hero-message-side">
          <h2>Plumbing, electrical, cleaning — verified locals, one tap away.</h2>
          <p>Find premium home care professionals across Skudai, Johor. Transparent quotes, verified providers.</p>
          <div class="hero-integrated-search-bar">
            <div class="search-input-field-group">
              <span>🔍</span>
              <input v-model="searchQuery" type="text" placeholder="What requires fixing? (e.g. Clogged pipe)" @keydown.enter="runSearch" />
            </div>
            <div class="search-input-field-group" style="border-left:2px solid var(--color-border); padding-left:12px;">
              <span>📍</span>
              <input type="text" value="Skudai, Johor" readonly />
            </div>
            <button class="btn-ui btn-ui-primary" @click="runSearch">Search Marketplace</button>
          </div>

          <!-- Quick Actions -->
          <div class="quick-action-button-strip">
            <button class="hero-quick-btn" @click="router.push('/customer/providers')">🧑‍🔧 Find Nearby Providers</button>
            <button class="hero-quick-btn" @click="router.push({ name: 'my-bookings' })">📋 Track Existing Bookings</button>
            <button class="hero-quick-btn" @click="router.push({ name: 'recurring-bookings' })">⚙️ Configure Automation Rules</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <div class="category-tile-row-head">
      <h3>Browse by category</h3>
      <button class="hero-link-btn" @click="router.push('/customer/providers')">See all providers →</button>
    </div>
    <div v-if="store.loading && !store.categories.length" class="state muted">Loading categories…</div>
    <div v-else class="category-tile-row">
      <CategoryCard
        v-for="c in store.categories"
        :key="c.id"
        :category="c"
        @select="openCategory"
      />
    </div>

    <!-- My Bookings + Job Ticket -->
    <div class="bookings-ticket-grid">
      <!-- My Bookings -->
      <div class="dash-card">
        <div class="dash-card-head">
          <div>
            <h3>My Bookings</h3>
            <p class="muted">Pending work, active visits, and payments due.</p>
          </div>
          <button class="btn-ui btn-ui-outline btn-ui-sm" @click="router.push({ name: 'my-bookings' })">View Ledger</button>
        </div>
        <div v-if="!dashboardBookings.length" class="state muted">
          No pending, active, or payment-due bookings right now. Completed jobs stay in the ledger.
        </div>
        <div v-else class="table-responsive-frame">
          <table class="table-ui-core">
            <thead>
              <tr>
                <th class="col-job-id">Job ID</th>
                <th>Service</th>
                <th>Provider</th>
                <th>Date</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in dashboardBookings"
                :key="b.id"
                class="bookings-row"
                :class="{ selected: selectedBooking?.id === b.id }"
                @click="selectBooking(b.id)"
              >
                <td class="col-job-id"><small class="muted">#FX-{{ b.id }}</small></td>
                <td>{{ bookingServiceName(b) }}</td>
                <td><strong>{{ b.provider_name }}</strong></td>
                <td><small>{{ shortDate(b.scheduled_at) }}</small></td>
                <td><span class="badge-ui" :class="dashboardStatusBadge(b)">{{ dashboardStatusLabel(b) }}</span></td>
                <td><small>{{ money(b.final_cost ?? b.estimated_cost) }}</small></td>
                <td><span class="badge-ui" :class="dashboardPaymentBadge(b)">{{ dashboardPaymentLabel(b) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Job Ticket -->
      <div class="dash-card job-ticket-card">
        <template v-if="selectedBooking">
          <div class="jt-head">
            <h3>Job Ticket · #FX-{{ selectedBooking.id }}</h3>
            <p class="muted">{{ bookingServiceName(selectedBooking) }} · {{ selectedBooking.provider_name }}</p>
          </div>

          <ul class="jt-timeline">
            <li
              v-for="(label, i) in TIMELINE_STEPS"
              :key="label"
              class="jt-step"
              :class="stepState(i + 1, selectedBooking.status)"
            >
              <span class="jt-dot"></span>
              <span class="jt-label">{{ label }}</span>
            </li>
          </ul>

          <div class="jt-cost-block">
            <span class="muted">{{ selectedBooking.final_cost != null ? 'Final cost from provider' : 'Estimated cost' }}</span>
            <strong class="jt-cost-amount">{{ money(selectedBooking.final_cost ?? selectedBooking.estimated_cost) }}</strong>
            <span class="muted">Payment: {{ dashboardPaymentLabel(selectedBooking) }}</span>
          </div>

          <button
            class="btn-ui btn-ui-primary jt-confirm-btn"
            :disabled="selectedBooking.status !== 'cost_pending' || selectedBooking.final_cost == null || confirmingId === selectedBooking.id"
            @click="confirmCost(selectedBooking.id)"
          >
            {{ confirmingId === selectedBooking.id ? 'Confirming…' : 'Confirm final cost' }}
          </button>

          <div v-if="selectedBookingNeedsPayment" class="dashboard-payment-box">
            <div class="dashboard-payment-head">
              <div>
                <span class="muted">Amount due</span>
                <strong>{{ money(selectedBooking.final_cost ?? selectedBooking.estimated_cost) }}</strong>
              </div>
              <span class="badge-ui badge-ui-warning">waiting for payment</span>
            </div>
            <p class="muted">Pay securely here without leaving your dashboard.</p>

            <button
              v-if="!showDashboardPayForm"
              class="btn-ui btn-ui-primary jt-confirm-btn"
              @click="openDashboardPayForm"
            >
              Pay now with card
            </button>

            <div v-else class="dashboard-stripe-form">
              <label class="stripe-label">Card details</label>
              <div id="dashboard-stripe-card-element" class="stripe-card-input"></div>
              <p v-if="dashboardCardError" class="stripe-error">{{ dashboardCardError }}</p>
              <p v-if="payError" class="stripe-error">{{ payError }}</p>

              <div class="stripe-actions">
                <button class="btn-ui btn-ui-outline" :disabled="payProcessing" @click="closeDashboardPaymentForm(false)">Cancel</button>
                <button
                  class="btn-ui btn-ui-primary"
                  :disabled="!dashboardCardMounted || payProcessing"
                  @click="submitDashboardPayment"
                >
                  {{ payProcessing ? 'Processing...' : `Pay ${money(selectedBooking.final_cost ?? selectedBooking.estimated_cost)}` }}
                </button>
              </div>
              <p class="stripe-secure">Secured by Stripe - Test Mode</p>
            </div>
          </div>

          <p v-if="dashboardPaymentMessage" class="dashboard-payment-success">{{ dashboardPaymentMessage }}</p>

          <div v-if="selectedBookingCanReview" class="jt-review-prompt">
            <span class="muted">How was your service?</span>
            <button class="btn-ui btn-ui-primary jt-confirm-btn" @click="showReviewModal = true">Rate & tip</button>
          </div>

          <div v-else-if="selectedBooking.status === 'reviewed'" class="jt-review-done">
            <span class="badge-ui badge-ui-success">✓ Review submitted</span>
            <span v-if="selectedBooking.tip_amount" class="muted">You tipped RM {{ selectedBooking.tip_amount }}. Thank you!</span>
          </div>
        </template>
        <div v-else class="state muted">Select a booking to view its ticket.</div>
      </div>
    </div>

    <TipRatingModal
      v-if="showReviewModal && selectedBooking"
      :job="selectedBooking"
      @submit="onSubmitReview"
      @close="showReviewModal = false"
    />

    <!-- Recurring Bookings + Live Provider Radar -->
    <div class="bottom-two-col">
      <!-- Recurring Bookings -->
      <div class="dash-card">
        <div class="dash-card-head">
          <div>
            <h3>Recurring Bookings</h3>
            <p class="muted">Manage your repeating service schedules.</p>
          </div>
          <button class="btn-ui btn-ui-primary btn-ui-sm" @click="router.push({ name: 'create-booking' })">+ New booking</button>
        </div>

        <div v-if="!recurringSeries.length" class="state muted">No recurring bookings yet.</div>

        <div v-else class="series-list">
          <article v-for="s in recurringSeries" :key="s.id" class="series-card">
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

      <!-- Map Radar -->
      <div class="dash-card radar-section">
        <div class="dash-card-head">
          <h3>Live Provider Radar</h3>
          <div class="radar-head-actions">
            <span v-if="locating" class="locating-pill muted">Locating you…</span>
            <span v-if="recenterError" class="recenter-error">{{ recenterError }}</span>
            <button class="btn-ui btn-ui-outline btn-ui-sm" @click="router.push('/customer/map')">View Fullscreen</button>
            <button class="btn-ui btn-ui-sm btn-ui-outline" @click="recenterMap" :disabled="locating">
              {{ locating ? 'Detecting…' : '📍 Recenter' }}
            </button>
          </div>
        </div>
        <div ref="dashMapEl" class="dash-map-widget"></div>

        <Transition name="dm-fade">
          <div
            v-if="hoveredProvider"
            class="dm-card"
            :style="{ left: cardPosition.x + 'px', top: cardPosition.y + 'px' }"
            @mouseenter="cancelHoverHide"
            @mouseleave="scheduleHoverHide"
          >
            <strong class="dm-name">{{ hoveredProvider.name }}</strong>
            <p class="muted dm-meta-line">
              ⭐ {{ Number(hoveredProvider.rating || 0).toFixed(1) }} • {{ hoveredProvider.service }}
            </p>
            <button type="button" class="btn-ui btn-ui-primary dm-details-btn" @click="router.push('/customer/map')">
              See details
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hero */
.marketplace-hero-banner {
  background: linear-gradient(135deg, var(--color-primary), #1D4ED8);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  margin-bottom: 24px;
  color: #fff;
}
.hero-top-flex { display: flex; align-items: stretch; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.hero-message-side { flex: 1 1 auto; min-width: 260px; }
.hero-message-side h2 { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; }
.hero-message-side p { color: rgba(255,255,255,0.85); margin: 10px 0 16px; font-size: 0.9rem; }
.hero-integrated-search-bar {
  display: flex; gap: 10px;
  background: var(--color-card);
  padding: 7px; border-radius: var(--radius-md);
  flex-wrap: wrap;
}
.search-input-field-group {
  flex: 1; min-width: 160px;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; color: var(--color-text);
}
.search-input-field-group input {
  border: none; outline: none; width: 100%;
  font-family: var(--font-main); background: transparent;
  color: var(--color-text); font-size: 0.9rem;
}

/* Quick actions (now inside the hero banner) */
.quick-action-button-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
.hero-quick-btn {
  font-family: var(--font-main);
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.14);
  border: 2px solid rgba(255,255,255,0.3);
  color: #fff;
  font-weight: 600; font-size: 0.8rem;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-smooth);
  white-space: nowrap;
}
.hero-quick-btn:hover { background: rgba(255,255,255,0.24); transform: translateY(-1px); }

/* Category tile row (replaces the old hero categories column + metric cards) */
.category-tile-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 4px 0 14px;
}
.category-tile-row-head h3 { font-size: 1.15rem; font-weight: 900; color: var(--color-text); letter-spacing: -0.02em; }
.hero-link-btn {
  font-family: var(--font-main);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(37,99,235,0.08);
  border: 1px solid rgba(37,99,235,0.16);
  border-radius: 999px;
  color: var(--color-primary);
  font-weight: 600; font-size: 0.8rem;
  cursor: pointer; white-space: nowrap;
  padding: 7px 11px;
  transition: var(--transition-smooth);
}
.hero-link-btn:hover { background: rgba(37,99,235,0.14); transform: translateY(-1px); }
.hero-link-btn:focus-visible { outline: 3px solid rgba(37,99,235,0.22); outline-offset: 3px; }
.category-tile-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

/* My Bookings + Job Ticket grid */
.bookings-ticket-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
  gap: 24px;
  margin-bottom: 32px;
}
.bookings-ticket-grid > * { min-width: 0; }
@media (max-width:1100px) { .bookings-ticket-grid { grid-template-columns: 1fr; } }
@media (max-width: 560px) {
  .dash-card {
    padding: 16px;
  }
}
.col-job-id { width: 1%; white-space: nowrap; }

.bookings-row { cursor: pointer; transition: background .15s; }
.bookings-row.selected td { background: rgba(37,99,235,0.06); }
body.night-mode-active .bookings-row.selected td { background: rgba(37,99,235,0.16); }

/* Job ticket panel */
.job-ticket-card { display: flex; flex-direction: column; gap: 20px; padding: 32px; align-self: start; height: auto; max-width: 100%; overflow: hidden; }
.jt-head h3 { font-size: 1.05rem; font-weight: 800; color: var(--color-text); }
.jt-head p { font-size: 0.82rem; margin-top: 2px; }
.jt-head,
.jt-head h3,
.jt-head p,
.jt-label { min-width: 0; overflow-wrap: anywhere; }

.jt-timeline { display: flex; flex-direction: column; padding-left: 4px; }
.jt-step { display: flex; align-items: flex-start; gap: 12px; position: relative; padding-bottom: 22px; }
.jt-step:last-child { padding-bottom: 0; }
.jt-step::before {
  content: '';
  position: absolute;
  left: 5px; top: 16px; bottom: -6px;
  width: 2px;
  background: var(--color-border);
}
.jt-step:last-child::before { display: none; }
.jt-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-border); flex-shrink: 0; margin-top: 2px; position: relative; z-index: 1; }
.jt-label { font-size: 0.86rem; color: var(--color-muted); }

.jt-step.done .jt-dot { background: var(--color-success); }
.jt-step.done::before { background: var(--color-success); }
.jt-step.active .jt-dot { background: var(--color-primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.18); }
.jt-step.active .jt-label { font-weight: 700; color: var(--color-text); }

.jt-cost-block {
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px 16px;
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
}
.jt-cost-amount { font-size: 1.3rem; font-weight: 800; color: var(--color-text); }
.jt-confirm-btn { width: 100%; margin-top: 6px; }

.dashboard-payment-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 2px solid rgba(234, 88, 12, 0.3);
  border-radius: var(--radius-md);
  background: rgba(234, 88, 12, 0.07);
}
.dashboard-payment-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.dashboard-payment-head > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dashboard-payment-head strong {
  color: var(--color-text);
  font-size: 1.25rem;
  font-weight: 800;
}
.dashboard-stripe-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.stripe-label {
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.stripe-card-input {
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}
.stripe-error {
  margin: 0;
  color: #ef4444;
  font-size: 0.82rem;
}
.stripe-actions {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
.stripe-actions .btn-ui-primary {
  flex: 1;
}
.stripe-secure {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.73rem;
  text-align: center;
}
.dashboard-payment-success {
  margin: 0;
  color: var(--color-success);
  font-size: 0.84rem;
  font-weight: 700;
}

.jt-review-prompt { display: flex; flex-direction: column; gap: 10px; }
.jt-review-done { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }

/* Recurring Bookings + Map Radar grid */
.bottom-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }
@media (max-width:1100px) { .bottom-two-col { grid-template-columns: 1fr; } }
.radar-section { margin-bottom: 0; display: flex; flex-direction: column; }

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
}
.series-main { flex: 1; min-width: 200px; }
.series-title-row { display: flex; align-items: center; gap: 8px; }
.series-title-row h4 { font-size: 1rem; font-weight: 800; color: var(--color-text); }
.series-occurrences { font-size: 0.8rem; }
.series-info-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.series-info-item { font-size: 0.8rem; color: var(--color-text); }
.badge-ui-neutral { background: var(--color-border); color: var(--color-muted); }
.series-side { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
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

.dash-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  min-width: 0;
}
.dash-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.dash-card-head h3 { font-size: 1.05rem; font-weight: 800; }
.dash-card-head p { font-size: 0.82rem; margin-top: 2px; }

.radar-head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.locating-pill { font-size: 0.75rem; }
.recenter-error { font-size: 0.75rem; color: var(--color-danger); }

/* Table */
.table-responsive-frame { overflow-x: auto; max-width: 100%; }
.table-ui-core { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 0.88rem; }
.table-ui-core th { padding: 10px 14px; text-align: left; font-size: 0.72rem; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid var(--color-border); }
.table-ui-core td { padding: 14px; border-bottom: 2px solid var(--color-border); vertical-align: middle; }
.table-ui-core tr:last-child td { border-bottom: none; }
.table-ui-core tr:hover td { background: var(--color-background); }

/* Dashboard map widget — fills the remaining card height so the radar card
   has no empty space below the map. */
.dash-map-widget {
  flex: 1;
  min-height: 300px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Hover provider card (floating over the dashboard map widget) */
.dm-card {
  position: fixed;
  width: 200px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1000;
}
.dm-fade-enter-active, .dm-fade-leave-active { transition: opacity 0.2s ease; }
.dm-fade-enter-from, .dm-fade-leave-to { opacity: 0; }

.dm-name { font-size: 0.85rem; color: var(--color-text); }
.dm-meta-line { font-size: 0.7rem; }

.dm-details-btn { width: 100%; margin-top: 2px; padding: 6px 10px; font-size: 0.75rem; }
</style>

<style>
.dash-map-pin-wrap { background: transparent; border: none; }
.dash-map-pin {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #2563eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  position: relative;
}
.dash-map-pin::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
}

.dash-map-pin-red {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: #ef4444;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  position: relative;
}
.dash-map-pin-red::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
}
</style>
