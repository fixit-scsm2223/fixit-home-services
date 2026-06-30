<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderStore } from '@/stores/provider'

const router = useRouter()
const store = useProviderStore()

const selectedUpcomingId = ref(null)
const finalCostAmount = ref('')
const finalCostNote = ref('')
const finalCostError = ref('')

function formatSchedule(iso) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today, ${time}`
  return `${d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}, ${time}`
}

function formatScheduleFull(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function shortAddress(address) {
  return String(address || 'Location not provided').split(',')[0]
}

function statusLabel(status) {
  return String(status || 'pending').replace(/_/g, ' ').toUpperCase()
}

function statusClass(status) {
  if (['accepted', 'en_route', 'in_progress'].includes(status)) return 'status-pill-blue'
  if (['closed', 'reviewed', 'completed', 'verified'].includes(status)) return 'status-pill-green'
  if (['rejected', 'cancelled'].includes(status)) return 'status-pill-red'
  return 'status-pill-amber'
}

function ticketReference(job) {
  if (job?.ticketRef) return job.ticketRef
  return `FX-${String(job?.id || 0).padStart(4, '0')}`
}

function moneyLabel(value) {
  const amount = Number(value || 0)
  return amount > 0 ? `RM ${amount.toLocaleString()}` : 'Not entered'
}

function estimatedCost(job) {
  return Number(job?.initialEstimate ?? job?.offeredRate ?? store.profile.baseRate ?? 0)
}

function finalCostLabel(job) {
  return job?.finalCost != null ? moneyLabel(job.finalCost) : 'Not entered'
}

function customerContact(job) {
  return job?.customerPhone || job?.customerEmail || 'Not available'
}

function customerNote(job) {
  return job?.costNote || job?.note || 'No customer note supplied.'
}

function costConfirmationLabel(job) {
  if (!job) return 'Not ready'
  if (job.status === 'cost_pending') return 'Waiting for customer confirmation'
  if (['closed', 'reviewed'].includes(job.status)) return 'Confirmed by customer'
  if (job.status === 'completed') return 'Ready for final cost'
  return 'Not ready'
}

const latestRequest = computed(() => store.jobRequests[0] || null)
const nextUpcoming = computed(() => store.upcomingItems[0] || null)

const providerName = computed(() => store.profile.name || 'FixIt Provider')
const profileInitials = computed(() =>
  providerName.value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

const ratingLabel = computed(() => {
  const rating = Number(store.averageRating || 0)
  return rating > 0 ? rating.toFixed(1) : '0.0'
})

const reservedDayCount = computed(() => store.availability.reservedDates.length)
const availabilityLabel = computed(() =>
  store.availability.mode === 'auto' ? 'Auto matching' : 'Manual control',
)

const totalOpenWork = computed(() =>
  store.pendingRequestCount + store.activeJobCount,
)

const todayQueueLabel = computed(() => {
  if (store.pendingRequestCount) return `${store.pendingRequestCount} request waiting`
  if (store.activeJobCount) return `${store.activeJobCount} active job`
  return 'Queue clear'
})

const actionCards = computed(() => [
  {
    code: 'CAL',
    title: 'Update Availability',
    caption: 'Reserve dates and manage matching',
    path: '/provider/availability',
  },
  {
    code: 'JOB',
    title: 'Manage Jobs',
    caption: 'Requests, active work, and history',
    path: '/provider/my-jobs',
  },
  {
    code: 'PRO',
    title: 'Edit Profile',
    caption: 'Tune public marketplace details',
    path: '/provider/profile',
  },
  {
    code: 'IN',
    title: 'Incoming Jobs',
    caption: store.pendingRequestCount
      ? 'New customer requests need your response'
      : 'Review new customer booking requests',
    path: '/provider/my-jobs?tab=incoming',
    pending: store.pendingRequestCount,
  },
])

const dashboardMetrics = computed(() => [
  {
    code: 'REQ',
    label: 'Pending Requests',
    value: store.pendingRequestCount,
    caption: latestRequest.value ? `Latest from ${latestRequest.value.customerName}` : 'No waiting requests',
    tone: 'orange',
  },
  {
    code: 'LIVE',
    label: 'Active Jobs',
    value: store.activeJobCount,
    caption: nextUpcoming.value ? `Next: ${formatSchedule(nextUpcoming.value.scheduledAt)}` : 'No active assignments',
    tone: 'blue',
  },
  {
    code: 'DONE',
    label: 'Completed',
    value: store.completedJobCount,
    caption: 'Closed provider tickets',
    tone: 'green',
  },
  {
    code: 'RM',
    label: 'Lifetime Earnings',
    value: `RM ${Number(store.earnings.lifetime || 0).toLocaleString()}`,
    caption: `Avg rating ${ratingLabel.value} / 5`,
    tone: 'teal',
  },
])

const dashboardUpcomingJobs = computed(() => {
  return store.jobs
    .filter((job) => !['closed', 'reviewed', 'rejected'].includes(job.status))
    .map((job) => ({
      ...job,
      source: 'job',
      ticketRef: ticketReference(job),
      initialEstimate: Number(job.initialEstimate ?? store.profile.baseRate ?? 0),
      timestamps: job.timestamps || {},
    }))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
})

const selectedUpcomingJob = computed(() =>
  dashboardUpcomingJobs.value.find((job) => String(job.id) === String(selectedUpcomingId.value)) ||
  dashboardUpcomingJobs.value[0] ||
  null,
)

const providerTicketSteps = [
  { key: 'requested', label: 'Request received', statuses: ['requested'] },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { key: 'scheduled', label: 'Scheduled service', statuses: ['en_route', 'scheduled'] },
  { key: 'in_progress', label: 'Work in progress', statuses: ['in_progress'] },
  { key: 'completed', label: 'Job completed', statuses: ['completed'] },
  { key: 'cost_pending', label: 'Waiting for customer cost confirmation', statuses: ['cost_pending'] },
  { key: 'closed', label: 'Closed', statuses: ['closed'] },
  { key: 'reviewed', label: 'Customer review submitted', statuses: ['reviewed'] },
]

watch(
  dashboardUpcomingJobs,
  (jobs) => {
    if (!jobs.length) {
      selectedUpcomingId.value = null
      return
    }
    if (!jobs.some((job) => String(job.id) === String(selectedUpcomingId.value))) {
      selectedUpcomingId.value = jobs[0].id
    }
  },
  { immediate: true },
)

watch(
  selectedUpcomingJob,
  (job) => {
    finalCostError.value = ''
    finalCostNote.value = job?.costNote || ''
    finalCostAmount.value = job?.status === 'completed'
      ? String(Number(job.finalCost ?? estimatedCost(job) ?? 0) || '')
      : ''
  },
  { immediate: true },
)

function selectUpcomingJob(job) {
  selectedUpcomingId.value = job.id
}

function providerTicketStepState(job, index) {
  const currentIndex = providerTicketSteps.findIndex((step) => step.statuses.includes(job?.status))
  return {
    done: currentIndex > index,
    current: currentIndex === index,
  }
}

function startTicketJob(job) {
  if (!job) return
  const nextStatus = job.status === 'accepted' ? 'en_route' : 'in_progress'
  store.advanceJobStatus(job.id, nextStatus)
}

function openFullTicket(job) {
  if (job?.source !== 'request') router.push('/provider/my-jobs')
}

function reviewForJob(job) {
  if (!job) return null
  return store.reviews.find((review) =>
    review.customerName === job.customerName &&
    (!review.service || review.service === job.service),
  ) || null
}

async function submitTicketFinalCost() {
  const job = selectedUpcomingJob.value
  const amount = Number(finalCostAmount.value)
  if (!job || job.status !== 'completed') return
  if (!Number.isFinite(amount) || amount <= 0) {
    finalCostError.value = 'Enter a valid positive RM amount.'
    return
  }
  finalCostError.value = ''
  await store.submitFinalCost(job.id, amount, 0, finalCostNote.value)
}
</script>

<template>
  <div class="provider-dashboard-page">
    <section class="dashboard-hero-card">
      <div class="dashboard-hero-copy">
        <span>PROVIDER COMMAND CENTER</span>
        <h2>Welcome back, {{ providerName }}</h2>
        <p>
          Manage booking demand, schedule capacity, live tickets, and marketplace readiness from one provider workspace.
        </p>

        <div class="dashboard-hero-pills">
          <span>{{ store.profile.location || 'Location not set' }}</span>
          <span>{{ todayQueueLabel }}</span>
          <span>{{ store.kyc.status === 'approved' || store.kyc.status === 'verified' ? 'Marketplace live' : 'Verification in progress' }}</span>
        </div>
      </div>

      <div class="dashboard-provider-card">
        <div class="dashboard-provider-head">
          <span class="dashboard-avatar">{{ profileInitials }}</span>
          <div>
            <strong>{{ providerName }}</strong>
            <small>{{ store.profile.email || 'Email not set' }} &middot; {{ availabilityLabel }} &middot; {{ reservedDayCount }} reserved days</small>
          </div>
        </div>

        <div class="dashboard-provider-grid">
          <div>
            <span>Open Work</span>
            <strong>{{ totalOpenWork }}</strong>
          </div>
          <div>
            <span>Rating</span>
            <strong>{{ ratingLabel }} / 5</strong>
          </div>
          <div>
            <span>Base Rate</span>
            <strong>RM {{ Number(store.profile.baseRate || 0).toLocaleString() }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="dashboard-action-grid" aria-label="Provider quick actions">
      <button
        v-for="action in actionCards"
        :key="action.title"
        type="button"
        class="dashboard-action-card"
        :class="{ 'is-pending': action.pending }"
        @click="router.push(action.path)"
      >
        <span>
          {{ action.code }}
          <i v-if="action.pending" class="dashboard-action-dot"></i>
        </span>
        <div>
          <strong>{{ action.title }}</strong>
          <small>{{ action.caption }}</small>
          <em v-if="action.pending">{{ action.pending }} pending</em>
          <em v-else-if="action.title === 'Incoming Jobs'">No pending requests</em>
        </div>
      </button>
    </section>

    <section class="dashboard-kpi-grid">
      <article
        v-for="metric in dashboardMetrics"
        :key="metric.label"
        class="dashboard-kpi-card"
        :class="metric.tone"
      >
        <span class="dashboard-kpi-code">{{ metric.code }}</span>
        <div>
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.caption }}</small>
        </div>
      </article>
    </section>

    <section class="dashboard-layout">
      <div class="dashboard-main-stack">
        <article class="card dashboard-panel upcoming-panel">
            <div class="dashboard-panel-head">
              <div>
                <span>SCHEDULE</span>
                <h3>Upcoming Jobs</h3>
                <p>Customer jobs ordered by scheduled time.</p>
              </div>
              <strong>{{ dashboardUpcomingJobs.length }} listed</strong>
            </div>

            <div v-if="dashboardUpcomingJobs.length === 0" class="dashboard-empty-state compact">
              <strong>Nothing scheduled</strong>
              <span>Your upcoming jobs will show here once bookings are assigned.</span>
            </div>

            <div v-else class="dashboard-table-frame">
              <table class="data-table dashboard-data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Schedule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in dashboardUpcomingJobs"
                    :key="`${item.source}-${item.id}`"
                    :class="{ selected: selectedUpcomingJob && String(selectedUpcomingJob.id) === String(item.id) }"
                    @click="selectUpcomingJob(item)"
                  >
                    <td>
                      <strong>{{ item.customerName }}</strong>
                      <small>#{{ ticketReference(item) }}</small>
                    </td>
                    <td>{{ item.service }}</td>
                    <td>{{ formatSchedule(item.scheduledAt) }}</td>
                    <td>
                      <span class="status-pill" :class="statusClass(item.status)">
                        {{ statusLabel(item.status) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
      </div>

      <aside class="dashboard-side-stack">
        <article class="card dashboard-job-ticket-card">
            <template v-if="selectedUpcomingJob">
              <div class="dashboard-job-ticket-head">
                <div>
                  <span>PROVIDER JOB TICKET</span>
                  <h3>Job Ticket &middot; #{{ ticketReference(selectedUpcomingJob) }}</h3>
                  <p>{{ selectedUpcomingJob.service }} &middot; {{ selectedUpcomingJob.customerName }}</p>
                </div>
                <span class="status-pill" :class="statusClass(selectedUpcomingJob.status)">
                  {{ statusLabel(selectedUpcomingJob.status) }}
                </span>
              </div>

              <div class="dashboard-ticket-info-grid">
                <div>
                  <span>Scheduled</span>
                  <strong>{{ formatScheduleFull(selectedUpcomingJob.scheduledAt) }}</strong>
                </div>
                <div>
                  <span>Service Area</span>
                  <strong>{{ shortAddress(selectedUpcomingJob.address) }}</strong>
                </div>
                <div>
                  <span>Customer Contact</span>
                  <strong>{{ customerContact(selectedUpcomingJob) }}</strong>
                </div>
              </div>

              <div class="dashboard-ticket-note">
                <span>Customer request / service note</span>
                <p>{{ customerNote(selectedUpcomingJob) }}</p>
              </div>

              <div class="dashboard-ticket-cost-card">
                <div>
                  <span>Estimated Cost</span>
                  <strong>{{ moneyLabel(estimatedCost(selectedUpcomingJob)) }}</strong>
                </div>
                <div>
                  <span>Final Cost</span>
                  <strong>{{ finalCostLabel(selectedUpcomingJob) }}</strong>
                </div>
                <div class="wide">
                  <span>Cost Confirmation</span>
                  <strong>{{ costConfirmationLabel(selectedUpcomingJob) }}</strong>
                </div>
              </div>

              <form
                v-if="selectedUpcomingJob.status === 'completed'"
                class="dashboard-final-cost-form"
                @submit.prevent="submitTicketFinalCost"
              >
                <label class="dashboard-form-field">
                  <span>Final Cost (RM)</span>
                  <input v-model="finalCostAmount" class="form-control" min="0" step="0.01" type="number" />
                </label>
                <label class="dashboard-form-field wide">
                  <span>Add note for customer</span>
                  <textarea v-model="finalCostNote" class="form-control" rows="2" placeholder="Optional note for completed service"></textarea>
                </label>
                <p v-if="finalCostError" class="dashboard-form-error">{{ finalCostError }}</p>
                <button class="btn btn-primary btn-sm" type="submit">
                  Submit Final Cost
                </button>
              </form>

              <div
                v-else-if="['cost_pending', 'closed', 'reviewed'].includes(selectedUpcomingJob.status)"
                class="dashboard-ticket-status-note"
              >
                <span>{{ selectedUpcomingJob.status === 'cost_pending' ? 'Waiting for customer confirmation' : costConfirmationLabel(selectedUpcomingJob) }}</span>
                <strong>{{ finalCostLabel(selectedUpcomingJob) }}</strong>
                <small v-if="['closed', 'reviewed'].includes(selectedUpcomingJob.status)">
                  {{ reviewForJob(selectedUpcomingJob) ? `Review: ${reviewForJob(selectedUpcomingJob).rating} / 5` : 'Customer review not submitted yet' }}
                </small>
              </div>

              <div class="dashboard-provider-ticket-timeline">
                <div
                  v-for="(step, index) in providerTicketSteps"
                  :key="step.key"
                  class="dashboard-provider-ticket-step"
                  :class="providerTicketStepState(selectedUpcomingJob, index)"
                >
                  <i></i>
                  <span>{{ step.label }}</span>
                </div>
              </div>

              <div class="dashboard-ticket-actions">
                <template v-if="selectedUpcomingJob.status === 'requested'">
                  <button class="btn btn-primary btn-sm" type="button" @click="store.acceptRequest(selectedUpcomingJob.id)">
                    Accept Job
                  </button>
                  <button class="btn btn-outline btn-sm danger-soft" type="button" @click="store.rejectRequest(selectedUpcomingJob.id)">
                    Reject Job
                  </button>
                </template>

                <button
                  v-else-if="['accepted', 'en_route', 'scheduled'].includes(selectedUpcomingJob.status)"
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="startTicketJob(selectedUpcomingJob)"
                >
                  Start Job
                </button>

                <button
                  v-else-if="selectedUpcomingJob.status === 'in_progress'"
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="store.advanceJobStatus(selectedUpcomingJob.id, 'completed')"
                >
                  Mark Completed
                </button>

                <button
                  v-else-if="selectedUpcomingJob.status === 'completed'"
                  class="btn btn-outline btn-sm"
                  type="button"
                  disabled
                >
                  Enter final cost above
                </button>

                <button v-else-if="selectedUpcomingJob.status === 'cost_pending'" class="btn btn-outline btn-sm" type="button" disabled>
                  Waiting for customer confirmation
                </button>

                <button
                  v-else-if="['closed', 'reviewed'].includes(selectedUpcomingJob.status)"
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="openFullTicket(selectedUpcomingJob)"
                >
                  View Customer Review
                </button>
              </div>
            </template>

            <div v-else class="dashboard-empty-state compact dark">
              <strong>No selected job</strong>
              <span>Upcoming provider jobs will appear here.</span>
            </div>
          </article>

      </aside>
    </section>
  </div>
</template>

<style scoped>
.provider-dashboard-page {
  display: grid;
  gap: 12px;
}

.dashboard-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
  gap: 16px;
  align-items: end;
  overflow: hidden;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(20, 184, 166, 0.78)),
    var(--color-card);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.dashboard-hero-copy,
.dashboard-provider-head > div,
.dashboard-panel-head > div {
  display: grid;
  gap: 7px;
}

.dashboard-hero-card span,
.dashboard-kpi-card span,
.dashboard-panel-head span,
.dashboard-request-head span,
.dashboard-request-meta span,
.dashboard-signal-list span,
.dashboard-provider-grid span,
.dashboard-availability-summary span,
.dashboard-job-ticket-head span,
.dashboard-ticket-info-grid span,
.dashboard-ticket-note span,
.dashboard-ticket-cost-card span {
  font-size: 0.68rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dashboard-hero-copy h2 {
  font-size: 1.35rem;
  line-height: 1.15;
}

.dashboard-hero-copy p {
  max-width: 700px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.84rem;
  line-height: 1.55;
}

.dashboard-hero-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.dashboard-hero-pills span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.2);
  color: #fff;
  font-size: 0.72rem;
  text-transform: none;
}

.dashboard-provider-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-lg);
  background: rgba(15, 23, 42, 0.24);
}

.dashboard-provider-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 0.94rem;
  font-weight: 900;
}

.dashboard-provider-head strong {
  font-size: 1rem;
}

.dashboard-provider-head small,
.dashboard-provider-grid span {
  color: rgba(255, 255, 255, 0.74);
}

.dashboard-provider-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.dashboard-provider-grid > div {
  display: grid;
  gap: 5px;
  min-height: 54px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-md);
  background: rgba(15, 23, 42, 0.2);
}

.dashboard-provider-grid strong {
  overflow-wrap: anywhere;
  font-size: 0.9rem;
}

.dashboard-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.dashboard-action-card {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 58px;
  padding: 10px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  color: var(--color-text);
  text-align: left;
  box-shadow: var(--shadow-sm);
  transition: var(--ease);
}

.dashboard-action-card:hover {
  transform: translateY(-2px);
  border-color: rgba(37, 99, 235, 0.55);
  box-shadow: var(--shadow-md);
}

.dashboard-action-card.is-pending {
  border-color: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.08), var(--shadow-sm);
}

.dashboard-action-card > span,
.dashboard-kpi-code {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 900;
}

.dashboard-action-card.is-pending > span {
  background: rgba(245, 158, 11, 0.14);
  color: var(--color-warning);
}

.dashboard-action-dot {
  position: absolute;
  right: -1px;
  top: -1px;
  width: 9px;
  height: 9px;
  border: 2px solid var(--color-card);
  border-radius: 50%;
  background: var(--color-warning);
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
  animation: dashboard-pending-pulse 1.9s ease-in-out infinite;
}

@keyframes dashboard-pending-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12); }
  50% { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0.04); }
}

.dashboard-action-card div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.dashboard-action-card strong {
  font-size: 0.9rem;
}

.dashboard-action-card small,
.dashboard-action-card em,
.dashboard-kpi-card small,
.dashboard-panel-head p,
.dashboard-request-head p,
.dashboard-signal-list small,
.dashboard-empty-state span,
.dashboard-data-table small,
.dashboard-job-ticket-head p,
.dashboard-ticket-note p {
  color: var(--color-muted);
  font-size: 0.76rem;
  line-height: 1.45;
}

.dashboard-action-card em {
  color: var(--color-warning);
  font-style: normal;
  font-weight: 800;
}

.dashboard-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.dashboard-kpi-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 11px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.dashboard-kpi-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--metric-accent, var(--color-primary));
  content: "";
}

.dashboard-kpi-card.blue { --metric-accent: var(--color-primary); --metric-soft: rgba(37, 99, 235, 0.13); }
.dashboard-kpi-card.teal { --metric-accent: var(--color-secondary); --metric-soft: rgba(20, 184, 166, 0.13); }
.dashboard-kpi-card.orange { --metric-accent: var(--color-warning); --metric-soft: rgba(245, 158, 11, 0.14); }
.dashboard-kpi-card.green { --metric-accent: var(--color-success); --metric-soft: rgba(34, 197, 94, 0.13); }

.dashboard-kpi-code {
  background: var(--metric-soft);
  color: var(--metric-accent);
}

.dashboard-kpi-card > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.dashboard-kpi-card span,
.dashboard-panel-head span,
.dashboard-request-head span,
.dashboard-request-meta span,
.dashboard-signal-list span {
  color: var(--color-muted);
}

.dashboard-kpi-card strong {
  overflow-wrap: anywhere;
  font-size: 1.12rem;
  line-height: 1.08;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 0.72fr);
  gap: 16px;
  align-items: start;
}

.dashboard-main-stack,
.dashboard-side-stack,
.dashboard-request-list {
  display: grid;
  gap: 16px;
}

.dashboard-main-stack {
  min-width: 0;
}

.dashboard-panel {
  margin: 0;
}

.dashboard-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.dashboard-panel-head h3 {
  font-size: 1.12rem;
  line-height: 1.2;
}

.dashboard-panel-head > strong {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.76rem;
}

.dashboard-request-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.dashboard-request-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.dashboard-request-head > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.dashboard-request-head h4 {
  font-size: 1.05rem;
}

.dashboard-request-meta {
  display: grid;
  grid-template-columns: 1.2fr 0.7fr 0.7fr;
  gap: 10px;
}

.dashboard-request-meta > div,
.dashboard-signal-list > div,
.dashboard-empty-state {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}

.dashboard-request-meta strong,
.dashboard-signal-list strong {
  overflow-wrap: anywhere;
  font-size: 0.86rem;
}

.dashboard-request-note {
  padding: 13px;
  border-left: 3px solid var(--color-primary);
  border-radius: 10px;
  background: var(--color-card);
  color: var(--color-text);
  font-size: 0.84rem;
  line-height: 1.5;
}

.dashboard-request-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.dashboard-table-frame {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}

.dashboard-data-table tr {
  cursor: pointer;
}

.dashboard-data-table tr.selected {
  background: rgba(37, 99, 235, 0.14);
  box-shadow: inset 4px 0 0 var(--color-primary);
}

.dashboard-data-table td:first-child {
  display: grid;
  gap: 4px;
}

.dashboard-job-ticket-card {
  margin: 0;
}

.dashboard-job-ticket-card {
  display: grid;
  align-content: start;
  gap: 7px;
  overflow: hidden;
  padding: 12px;
  border-color: rgba(96, 165, 250, 0.28);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(8, 15, 28, 0.98)),
    var(--color-card);
  color: #fff;
}

.dashboard-job-ticket-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.dashboard-job-ticket-head > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.dashboard-job-ticket-head span,
.dashboard-ticket-info-grid span,
.dashboard-ticket-note span,
.dashboard-ticket-cost-card span,
.dashboard-form-field span,
.dashboard-ticket-status-note span {
  color: #93c5fd;
}

.dashboard-job-ticket-head h3 {
  overflow-wrap: anywhere;
  font-size: 0.98rem;
  line-height: 1.2;
}

.dashboard-job-ticket-head p,
.dashboard-ticket-note p {
  color: #b9c7dc;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dashboard-job-ticket-head p {
  -webkit-line-clamp: 1;
}

.dashboard-ticket-info-grid,
.dashboard-ticket-cost-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.dashboard-ticket-info-grid > div,
.dashboard-ticket-cost-card > div,
.dashboard-ticket-note,
.dashboard-ticket-status-note {
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: var(--radius-md);
  background: rgba(15, 23, 42, 0.74);
}

.dashboard-ticket-info-grid strong,
.dashboard-ticket-cost-card strong,
.dashboard-ticket-status-note strong {
  overflow-wrap: anywhere;
  color: #fff;
  font-size: 0.76rem;
  line-height: 1.25;
}

.dashboard-final-cost-form {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) auto;
  gap: 8px;
  align-items: end;
  padding: 9px;
  border: 1px solid rgba(37, 99, 235, 0.26);
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, 0.08);
}

.dashboard-form-field {
  display: grid;
  gap: 5px;
  margin: 0;
}

.dashboard-form-field.wide,
.dashboard-form-error {
  grid-column: 1 / -1;
}

.dashboard-form-error {
  color: #fecaca;
  font-size: 0.76rem;
}

.dashboard-final-cost-form .form-control {
  min-height: 36px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
}

.dashboard-final-cost-form textarea.form-control {
  min-height: 52px;
}

.dashboard-ticket-status-note small {
  color: #b9c7dc;
  font-size: 0.75rem;
}

.dashboard-provider-ticket-timeline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: var(--radius-md);
  background: rgba(2, 6, 23, 0.28);
}

.dashboard-provider-ticket-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  color: #9fb0c7;
  font-size: 0.72rem;
  line-height: 1.25;
}

.dashboard-provider-ticket-step span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-provider-ticket-step i {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(148, 163, 184, 0.44);
  border-radius: 50%;
}

.dashboard-provider-ticket-step.done {
  color: #86efac;
}

.dashboard-provider-ticket-step.done i {
  border-color: var(--color-success);
  background: var(--color-success);
}

.dashboard-provider-ticket-step.current {
  color: #93c5fd;
  font-weight: 850;
}

.dashboard-provider-ticket-step.current i {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
}

.dashboard-ticket-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.dashboard-ticket-actions .btn {
  min-height: 34px;
}

.dashboard-ticket-actions .danger-soft {
  border-color: rgba(239, 68, 68, 0.42);
  color: #fecaca;
}

.dashboard-empty-state.dark {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
}

.dashboard-availability-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.dashboard-availability-summary > div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.dashboard-availability-summary strong {
  overflow-wrap: anywhere;
  font-size: 0.86rem;
}

.dashboard-signal-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.dashboard-empty-state {
  min-height: 118px;
  place-items: center;
  text-align: center;
}

.dashboard-empty-state.compact {
  min-height: 118px;
}

@media (max-width: 1180px) {
  .dashboard-hero-card,
  .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .dashboard-action-grid,
  .dashboard-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-hero-card {
    padding: 18px;
  }

  .dashboard-provider-grid,
  .dashboard-action-grid,
  .dashboard-kpi-grid,
  .dashboard-request-meta,
  .dashboard-availability-summary,
  .dashboard-ticket-info-grid,
  .dashboard-ticket-cost-card {
    grid-template-columns: 1fr;
  }

  .dashboard-panel-head,
  .dashboard-request-head,
  .dashboard-job-ticket-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-ticket-info-grid > div:first-child,
  .dashboard-ticket-cost-card .wide {
    grid-column: auto;
  }

  .dashboard-request-actions .btn,
  .dashboard-ticket-actions .btn {
    flex: 1 1 120px;
  }
}
</style>
