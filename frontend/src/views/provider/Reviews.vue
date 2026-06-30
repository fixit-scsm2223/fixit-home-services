<script setup>
import { computed, ref } from 'vue'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()

const search = ref('')
const serviceFilter = ref('all')
const ratingFilter = ref('all')
const sortBy = ref('newest')
const openReplyId = ref(null)
const replyDrafts = ref({})
const sentReplies = ref({})

function stars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0))
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating)
}

function formatDate(iso) {
  if (!iso) return 'Not dated'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name) {
  return String(name || 'Customer')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function relatedJob(review) {
  return store.jobs.find((job) =>
    job.customerName === review.customerName &&
    (!review.service || job.service === review.service),
  )
}

function ratingLabel(rating) {
  if (Number(rating) >= 5) return 'Excellent'
  if (Number(rating) >= 4) return 'Good'
  return 'Needs Attention'
}

function toggleReply(review) {
  openReplyId.value = openReplyId.value === review.id ? null : review.id
  if (!replyDrafts.value[review.id] && sentReplies.value[review.id]) {
    replyDrafts.value[review.id] = sentReplies.value[review.id]
  }
}

function cancelReply(review) {
  openReplyId.value = null
  if (!sentReplies.value[review.id]) replyDrafts.value[review.id] = ''
}

function sendReply(review) {
  const draft = String(replyDrafts.value[review.id] || '').trim()
  if (!draft) return
  sentReplies.value = { ...sentReplies.value, [review.id]: draft }
  openReplyId.value = null
}

const totalReviews = computed(() => store.reviews.length)
const fiveStarCount = computed(() => store.reviews.filter((review) => review.rating === 5).length)
const fiveStarPercent = computed(() =>
  totalReviews.value ? Math.round((fiveStarCount.value / totalReviews.value) * 100) : 0,
)

const reputationMessage = computed(() => {
  if (store.averageRating >= 4.7 && totalReviews.value >= 3) return 'Excellent provider reputation'
  if (store.averageRating >= 4) return 'Strong customer satisfaction'
  return 'Keep improving customer experience'
})

const ratingDistribution = computed(() =>
  [5, 4, 3, 2, 1].map((rating) => {
    const count = store.reviews.filter((review) => review.rating === rating).length
    return {
      rating,
      count,
      percent: totalReviews.value ? Math.round((count / totalReviews.value) * 100) : 0,
    }
  }),
)

const serviceOptions = computed(() => {
  const services = new Set()
  store.reviews.forEach((review) => {
    if (review.service) services.add(review.service)
  })
  store.jobs.forEach((job) => {
    if (job.service) services.add(job.service)
  })
  return ['all', ...Array.from(services).sort()]
})

const filteredReviews = computed(() => {
  const query = search.value.trim().toLowerCase()
  let results = [...store.reviews]

  if (query) {
    results = results.filter((review) =>
      [review.customerName, review.service, review.comment, relatedJob(review)?.ticketRef, relatedJob(review)?.id]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }

  if (serviceFilter.value !== 'all') {
    results = results.filter((review) => review.service === serviceFilter.value)
  }

  if (ratingFilter.value !== 'all') {
    results = results.filter((review) => Number(review.rating) === Number(ratingFilter.value))
  }

  results.sort((a, b) => {
    if (sortBy.value === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0)
    if (sortBy.value === 'highest') return Number(b.rating || 0) - Number(a.rating || 0)
    if (sortBy.value === 'lowest') return Number(a.rating || 0) - Number(b.rating || 0)
    return new Date(b.date || 0) - new Date(a.date || 0)
  })

  return results
})
</script>

<template>
  <div class="provider-reviews-page">
    <section class="reviews-summary-card">
      <div class="reviews-score-block">
        <span>AVERAGE RATING</span>
        <strong>{{ store.averageRating.toFixed(1) }}</strong>
        <div class="reviews-stars">{{ stars(Math.round(store.averageRating)) }}</div>
        <p>{{ reputationMessage }}</p>
      </div>

      <div class="reviews-summary-grid">
        <div>
          <span>Total Reviews</span>
          <strong>{{ totalReviews }}</strong>
        </div>
        <div>
          <span>Five-Star Share</span>
          <strong>{{ fiveStarPercent }}%</strong>
        </div>
        <div>
          <span>Completed Jobs</span>
          <strong>{{ store.completedJobCount }}</strong>
        </div>
      </div>

      <div class="reviews-distribution">
        <div v-for="row in ratingDistribution" :key="row.rating" class="reviews-distribution-row">
          <span>{{ row.rating }}★</span>
          <div><i :style="{ width: `${row.percent}%` }"></i></div>
          <small>{{ row.count }}</small>
        </div>
      </div>
    </section>

    <section class="card reviews-filter-card">
      <div class="reviews-filter-head">
        <div>
          <span>REVIEWS</span>
          <h3>Customer Feedback</h3>
        </div>
        <strong>{{ filteredReviews.length }} results</strong>
      </div>

      <div class="reviews-filter-grid">
        <label class="form-group reviews-search">
          <span>Search</span>
          <input v-model.trim="search" class="form-control" placeholder="Search by customer name, service, or review text" />
        </label>

        <label class="form-group">
          <span>Service</span>
          <select v-model="serviceFilter" class="form-control">
            <option v-for="service in serviceOptions" :key="service" :value="service">
              {{ service === 'all' ? 'All services' : service }}
            </option>
          </select>
        </label>

        <label class="form-group">
          <span>Rating</span>
          <select v-model="ratingFilter" class="form-control">
            <option value="all">All ratings</option>
            <option v-for="rating in [5, 4, 3, 2, 1]" :key="rating" :value="rating">{{ rating }} stars</option>
          </select>
        </label>

        <label class="form-group">
          <span>Sort</span>
          <select v-model="sortBy" class="form-control">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </label>
      </div>
    </section>

    <section class="reviews-list">
      <article v-if="!filteredReviews.length" class="card reviews-empty-state">
        <strong>No reviews found</strong>
        <span>Customer reviews matching these filters will appear here.</span>
      </article>

      <article v-for="review in filteredReviews" :key="review.id" class="card review-card enhanced-review-card">
        <div class="review-card-grid">
          <div class="review-left">
            <span class="review-avatar">{{ initials(review.customerName) }}</span>
            <div class="review-content">
              <div class="review-title-line">
                <div>
                  <strong>{{ review.customerName }}</strong>
                  <small>{{ formatDate(review.date) }}</small>
                </div>
                <div class="review-meta-row">
                  <span class="badge badge-info">{{ review.service || 'Service' }}</span>
                  <span class="review-job-id">Job #{{ relatedJob(review)?.ticketRef || relatedJob(review)?.id || 'Not linked' }}</span>
                </div>
              </div>
              <p class="review-text">“{{ review.comment || 'No written comment supplied.' }}”</p>
            </div>
          </div>

          <aside class="review-rating-panel">
            <span>{{ stars(review.rating) }}</span>
            <strong>{{ Number(review.rating || 0).toFixed(1) }} / 5</strong>
            <small>{{ ratingLabel(review.rating) }}</small>
          </aside>
        </div>

        <div v-if="sentReplies[review.id]" class="provider-response-box">
          <span>Provider replied</span>
          <p>{{ sentReplies[review.id] }}</p>
        </div>

        <div class="review-card-footer">
          <button class="btn btn-outline btn-sm" type="button" @click="toggleReply(review)">
            {{ openReplyId === review.id ? 'Hide Reply' : 'Reply to Review' }}
          </button>
          <span>{{ sentReplies[review.id] ? 'Provider replied' : 'No reply sent yet' }}</span>
        </div>

        <form v-if="openReplyId === review.id" class="review-reply-box" @submit.prevent="sendReply(review)">
          <div class="reply-form-head">
            <strong>{{ review.customerName }}</strong>
            <span>{{ review.service || 'Related service' }}</span>
          </div>
          <textarea
            v-model="replyDrafts[review.id]"
            class="form-control"
            rows="3"
            placeholder="Write a professional response"
            required
          ></textarea>
          <div class="reply-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="cancelReply(review)">Cancel</button>
            <button class="btn btn-primary btn-sm" type="submit">Send Reply</button>
          </div>
        </form>
      </article>
    </section>
  </div>
</template>

<style scoped>
.provider-reviews-page {
  display: grid;
  gap: 18px;
}

.reviews-summary-card {
  display: grid;
  grid-template-columns: minmax(210px, 0.75fr) minmax(0, 1fr) minmax(260px, 0.8fr);
  gap: 16px;
  align-items: stretch;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.reviews-score-block,
.reviews-summary-grid > div,
.reviews-distribution {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.reviews-score-block {
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 16px;
}

.reviews-score-block span,
.reviews-summary-grid span,
.reviews-filter-head span,
.reviews-filter-grid .form-group > span {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.reviews-score-block strong {
  font-size: 2.25rem;
  line-height: 1;
}

.reviews-score-block p,
.reviews-filter-head p,
.review-card small,
.review-job-id,
.review-reply-box small,
.reviews-empty-state span {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.reviews-stars,
.review-rating span {
  color: var(--color-warning);
  letter-spacing: 0.03em;
}

.reviews-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.reviews-summary-grid > div {
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 14px;
}

.reviews-summary-grid strong {
  font-size: 1.35rem;
}

.reviews-distribution {
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 14px;
}

.reviews-distribution-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 28px;
  gap: 8px;
  align-items: center;
}

.reviews-distribution-row span,
.reviews-distribution-row small {
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 800;
}

.reviews-distribution-row div {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-card);
}

.reviews-distribution-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-warning);
}

.reviews-filter-card {
  margin: 0;
}

.reviews-filter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.reviews-filter-head h3 {
  margin-top: 5px;
  font-size: 1.1rem;
}

.reviews-filter-head strong {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.78rem;
}

.reviews-filter-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.35fr) repeat(3, minmax(150px, 1fr));
  gap: 12px;
}

.reviews-filter-grid .form-group {
  margin: 0;
}

.reviews-filter-grid .form-group > span {
  display: block;
  margin-bottom: 6px;
}

.reviews-list {
  display: grid;
  gap: 14px;
}

.review-card {
  display: grid;
  gap: 13px;
  margin: 0;
}

.review-card-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.review-avatar {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.13);
  color: var(--color-primary);
  font-weight: 900;
}

.review-card-head > div:not(.review-rating) {
  display: grid;
  gap: 3px;
}

.review-rating {
  display: grid;
  justify-items: end;
  gap: 3px;
}

.review-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.review-job-id {
  padding: 4px 9px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
}

.review-text {
  line-height: 1.6;
}

.review-reply-area {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.review-reply-box {
  display: grid;
  width: 100%;
  gap: 7px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.reviews-empty-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 6px;
  margin: 0;
  text-align: center;
}

.enhanced-review-card {
  gap: 12px;
  padding: 16px;
}
.review-card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 16px;
  align-items: stretch;
}
.review-left {
  display: flex;
  gap: 13px;
  min-width: 0;
}
.review-content {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.review-title-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.review-title-line > div:first-child {
  display: grid;
  gap: 3px;
}
.review-rating-panel {
  display: grid;
  align-content: center;
  justify-items: end;
  gap: 5px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  text-align: right;
}
.review-rating-panel span {
  color: var(--color-warning);
  letter-spacing: .04em;
}
.review-rating-panel strong {
  color: var(--color-text);
  font-size: 1.05rem;
}
.review-rating-panel small {
  color: var(--color-muted);
  font-weight: 800;
}
.enhanced-review-card .review-text {
  margin: 0;
  padding: 13px 14px;
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, .08);
}
.review-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}
.review-card-footer span {
  color: var(--color-muted);
  font-size: .8rem;
  font-weight: 800;
}
.provider-response-box {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid rgba(37, 99, 235, .22);
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, .08);
}
.provider-response-box span {
  color: var(--color-primary);
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.provider-response-box p {
  margin: 0;
  color: var(--color-text);
  line-height: 1.5;
}
.reply-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.reply-form-head span {
  color: var(--color-muted);
  font-size: .82rem;
  font-weight: 800;
}
.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1120px) {
  .reviews-summary-card,
  .reviews-filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .reviews-summary-grid,
  .review-card-head,
  .review-card-grid {
    grid-template-columns: 1fr;
  }

  .review-rating {
    justify-items: start;
  }

  .review-rating-panel {
    justify-items: start;
    text-align: left;
  }

  .reviews-filter-head {
    flex-direction: column;
  }

  .review-title-line,
  .review-card-footer,
  .reply-form-head,
  .reply-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
