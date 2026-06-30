<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'

const router = useRouter()
const bookingStore = useBookingStore()

const search = ref('')
const serviceFilter = ref('all')
const ratingFilter = ref('all')
const sortOrder = ref('newest')
const selectedReview = ref(null)

onMounted(() => {
  bookingStore.loadReviews()
  bookingStore.loadBookings()
})

const pendingReviews = computed(() => bookingStore.pendingReviews)
const totalTips = computed(() => bookingStore.reviews.reduce((sum, review) => sum + Number(review.tip_amount || 0), 0))
const averageRating = computed(() => {
  if (!bookingStore.reviews.length) return '0.0'
  const total = bookingStore.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0)
  return (total / bookingStore.reviews.length).toFixed(1)
})

const serviceOptions = computed(() => {
  const names = bookingStore.reviews.map((review) => serviceName(review)).filter(Boolean)
  return [...new Set(names)].sort()
})

const filteredReviews = computed(() => {
  const term = search.value.trim().toLowerCase()
  return bookingStore.reviews
    .filter((review) => {
      const service = serviceName(review)
      const text = [review.provider_name, service, review.comment, review.job_id].join(' ').toLowerCase()
      const matchesSearch = !term || text.includes(term)
      const matchesService = serviceFilter.value === 'all' || service === serviceFilter.value
      const matchesRating = ratingFilter.value === 'all' || Number(review.rating) === Number(ratingFilter.value)
      return matchesSearch && matchesService && matchesRating
    })
    .sort((a, b) => {
      if (sortOrder.value === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortOrder.value === 'highest') return Number(b.rating || 0) - Number(a.rating || 0)
      if (sortOrder.value === 'lowest') return Number(a.rating || 0) - Number(b.rating || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })
})

function relatedBooking(review) {
  return bookingStore.bookings.find((booking) => Number(booking.id) === Number(review.job_id))
}

function serviceName(review) {
  return review.category_name || relatedBooking(review)?.category_name || 'Service'
}

function providerInitials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'PV'
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function stars(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating || 0)))
  return '★'.repeat(safe) + '☆'.repeat(5 - safe)
}

function openPendingReview() {
  if (!pendingReviews.value.length) return
  router.push({ name: 'job-ticket', params: { id: pendingReviews.value[0].id } })
}

function openBooking(review) {
  const booking = relatedBooking(review)
  if (booking) router.push({ name: 'job-ticket', params: { id: booking.id } })
}
</script>

<template>
  <div class="reviews-view">
    <header class="reviews-header">
      <div>
        <h1>My Reviews</h1>
        <p>Review your completed services and track feedback you have shared with providers.</p>
      </div>
    </header>

    <div v-if="pendingReviews.length" class="pending-banner">
      <div>
        <strong>{{ pendingReviews.length }} completed service{{ pendingReviews.length === 1 ? '' : 's' }} awaiting review</strong>
        <span>You have completed services waiting for your feedback.</span>
      </div>
      <button class="btn-ui btn-ui-primary btn-ui-sm" @click="openPendingReview">Review Now</button>
    </div>

    <section class="review-summary-grid">
      <article class="summary-card">
        <span>Total Reviews Given</span>
        <strong>{{ bookingStore.reviews.length }}</strong>
      </article>
      <article class="summary-card">
        <span>Average Rating Given</span>
        <strong>{{ averageRating }} / 5</strong>
      </article>
      <article class="summary-card">
        <span>Tips Sent</span>
        <strong>RM {{ totalTips }}</strong>
      </article>
      <article class="summary-card">
        <span>Pending Reviews</span>
        <strong>{{ pendingReviews.length }}</strong>
      </article>
    </section>

    <section class="reviews-filter-panel">
      <label>
        <span>Search</span>
        <input v-model.trim="search" type="search" placeholder="Search by provider, service, or review text" />
      </label>
      <label>
        <span>Service category</span>
        <select v-model="serviceFilter">
          <option value="all">All services</option>
          <option v-for="service in serviceOptions" :key="service" :value="service">{{ service }}</option>
        </select>
      </label>
      <label>
        <span>Rating</span>
        <select v-model="ratingFilter">
          <option value="all">All ratings</option>
          <option v-for="rating in [5,4,3,2,1]" :key="rating" :value="rating">{{ rating }} stars</option>
        </select>
      </label>
      <label>
        <span>Sort</span>
        <select v-model="sortOrder">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </label>
      <span class="result-badge">{{ filteredReviews.length }} result{{ filteredReviews.length === 1 ? '' : 's' }}</span>
    </section>

    <div v-if="bookingStore.loading" class="muted">Loading reviews…</div>

    <div v-else-if="!bookingStore.reviews.length" class="empty-state">
      <p class="muted">You haven't submitted any reviews yet.</p>
    </div>

    <div v-else-if="!filteredReviews.length" class="empty-state">
      <p class="muted">No reviews match your filters.</p>
    </div>

    <div v-else class="reviews-list">
      <article
        v-for="review in filteredReviews"
        :key="review.id"
        class="customer-review-card"
        tabindex="0"
        @click="selectedReview = review"
        @keydown.enter="selectedReview = review"
      >
        <div class="review-main">
          <span class="review-avatar">{{ providerInitials(review.provider_name) }}</span>
          <div>
            <div class="review-title-row">
              <h3>{{ review.provider_name }}</h3>
              <span class="service-badge">{{ serviceName(review) }}</span>
            </div>
            <p class="review-comment">“{{ review.comment }}”</p>
            <div class="review-meta-row">
              <span>#FX-{{ review.job_id }}</span>
              <span>{{ formatDate(review.created_at) }}</span>
              <span v-if="review.tip_amount" class="tip-badge">RM {{ review.tip_amount }} tip</span>
            </div>
          </div>
        </div>
        <aside class="review-side">
          <strong>{{ stars(review.rating) }}</strong>
          <span>{{ Number(review.rating || 0).toFixed(1) }} / 5</span>
          <button class="btn-ui btn-ui-outline btn-ui-sm" type="button" @click.stop="openBooking(review)">View Booking</button>
        </aside>
      </article>
    </div>

    <div v-if="selectedReview" class="review-modal-backdrop" @click.self="selectedReview = null">
      <section class="review-details-modal" role="dialog" aria-modal="true" aria-label="Review details">
        <header>
          <div>
            <span class="review-modal-kicker">Review Details</span>
            <h2>{{ selectedReview.provider_name }}</h2>
            <p>{{ serviceName(selectedReview) }} · #FX-{{ selectedReview.job_id }}</p>
          </div>
          <button class="panel-close" type="button" aria-label="Close" @click="selectedReview = null">✕</button>
        </header>
        <div class="modal-detail-grid">
          <span><small>Completed date</small><strong>{{ formatDate(relatedBooking(selectedReview)?.scheduled_at || selectedReview.created_at) }}</strong></span>
          <span><small>Rating</small><strong>{{ selectedReview.rating }} / 5</strong></span>
          <span><small>Tip amount</small><strong>{{ selectedReview.tip_amount ? `RM ${selectedReview.tip_amount}` : 'No tip sent' }}</strong></span>
          <span><small>Final cost</small><strong>RM {{ relatedBooking(selectedReview)?.final_cost ?? relatedBooking(selectedReview)?.estimated_cost ?? '0' }}</strong></span>
          <span><small>Booking status</small><strong>{{ relatedBooking(selectedReview)?.status || 'Reviewed' }}</strong></span>
        </div>
        <blockquote>{{ selectedReview.comment }}</blockquote>
        <footer>
          <button class="btn-ui btn-ui-outline" type="button" @click="selectedReview = null">Close</button>
          <button class="btn-ui btn-ui-primary" type="button" @click="openBooking(selectedReview)">View Booking</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.reviews-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.reviews-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}
.reviews-header h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 900;
}
.reviews-header p {
  margin: 5px 0 0;
  color: var(--color-muted);
}
.pending-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  background: rgba(37, 99, 235, .1);
  border: 1px solid rgba(37, 99, 235, .32);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  flex-wrap: wrap;
}
.pending-banner div { display: grid; gap: 4px; }
.pending-banner strong { color: var(--color-text); }
.pending-banner span { color: var(--color-muted); font-size: .9rem; }
.review-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-md);
}
.summary-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
}
.summary-card span {
  display: block;
  color: var(--color-muted);
  font-size: .75rem;
  font-weight: 900;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--color-text);
  font-size: 1.45rem;
}
.reviews-filter-panel {
  display: grid;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto;
  align-items: end;
  gap: var(--spacing-md);
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
}
.reviews-filter-panel label { display: grid; gap: 7px; }
.reviews-filter-panel label span {
  color: var(--color-muted);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.reviews-filter-panel input,
.reviews-filter-panel select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text);
  padding: 0 12px;
  outline: none;
}
.reviews-filter-panel input:focus,
.reviews-filter-panel select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
}
.result-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 13px;
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-muted);
  font-weight: 900;
  white-space: nowrap;
}
.reviews-list { display: grid; gap: var(--spacing-sm); }
.customer-review-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--spacing-md);
  align-items: stretch;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  cursor: pointer;
  transition: border-color .18s ease, transform .18s ease;
}
.customer-review-card:hover,
.customer-review-card:focus-visible {
  border-color: rgba(37, 99, 235, .55);
  transform: translateY(-1px);
  outline: none;
}
.review-main {
  display: flex;
  gap: 14px;
  min-width: 0;
}
.review-avatar {
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 99, 235, .14);
  color: var(--color-primary);
  font-weight: 900;
}
.review-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.review-title-row h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
}
.service-badge,
.tip-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 900;
}
.service-badge {
  background: rgba(37, 99, 235, .12);
  color: var(--color-primary);
}
.tip-badge {
  background: rgba(34, 197, 94, .12);
  color: var(--color-success);
}
.review-comment {
  margin: 10px 0;
  color: var(--color-text);
  line-height: 1.55;
}
.review-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--color-muted);
  font-size: .82rem;
  font-weight: 700;
}
.review-side {
  display: flex;
  min-width: 170px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  text-align: right;
}
.review-side strong {
  color: #f59e0b;
  letter-spacing: .08em;
}
.review-side span {
  color: var(--color-muted);
  font-weight: 900;
}
.empty-state {
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-card);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
}
.review-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, .68);
}
.review-details-modal {
  width: min(620px, 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.review-details-modal header,
.review-details-modal footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 18px 20px;
  border-bottom: 1px solid var(--color-border);
}
.review-details-modal footer {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
  border-bottom: 0;
}
.review-modal-kicker {
  color: var(--color-muted);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.review-details-modal h2 { margin: 4px 0 0; color: var(--color-text); }
.review-details-modal p { margin: 3px 0 0; color: var(--color-muted); }
.panel-close {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}
.panel-close:hover {
  color: var(--color-text);
  border-color: var(--color-primary);
}
.modal-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 20px;
}
.modal-detail-grid span {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
.modal-detail-grid small {
  color: var(--color-muted);
  font-size: .72rem;
  font-weight: 900;
  text-transform: uppercase;
}
.modal-detail-grid strong { color: var(--color-text); }
blockquote {
  margin: 0 20px 20px;
  padding: 16px;
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, .08);
  color: var(--color-text);
  line-height: 1.6;
}

@media (max-width: 980px) {
  .review-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reviews-filter-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .result-badge { justify-content: flex-start; }
}
@media (max-width: 640px) {
  .review-summary-grid,
  .reviews-filter-panel,
  .customer-review-card,
  .modal-detail-grid {
    grid-template-columns: 1fr;
  }
  .review-main { align-items: flex-start; }
  .review-side {
    min-width: 0;
    align-items: flex-start;
    text-align: left;
  }
  .review-details-modal footer {
    display: grid;
  }
}
</style>
