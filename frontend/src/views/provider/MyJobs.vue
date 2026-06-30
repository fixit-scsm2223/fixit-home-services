<script setup>
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()
const route = useRoute()

function refresh() {
  store.fetchJobs()
}

onMounted(refresh)
onActivated(refresh)   // fires when navigating back to this page via <KeepAlive>

const activeTab = ref('incoming')
const search = ref('')
const serviceFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const selectedUpcomingId = ref(null)

const detailsJob = ref(null)
const acceptJobTarget = ref(null)
const rejectJobTarget = ref(null)
const costJobTarget = ref(null)
const acceptNote = ref('')
const rejectReason = ref('')
const rejectCustomReason = ref('')
const labourCost = ref(null)
const materialsCost = ref(null)
const costNote = ref('')

const rejectReasons = [
  'Not available at selected time',
  'Outside service coverage area',
  'Service not supported',
  'Temporary workload full',
  'Other',
]

const tabs = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'inProgress', label: 'In Progress' },
  { id: 'past', label: 'Past' },
]

const validTabs = new Set(tabs.map((tab) => tab.id))

const now = computed(() => new Date())

const requestJobs = computed(() =>
  store.jobRequests.map((job) => ({
    ...job,
    source: 'request',
    ticketRef: job.ticketRef || `FX-${String(job.id).padStart(4, '0')}`,
    status: 'requested',
    finalCost: null,
    initialEstimate: Number(job.offeredRate || 0),
    costNote: job.note || '',
    timestamps: {},
  })),
)

const providerJobs = computed(() =>
  store.jobs.map((job) => ({
    ...job,
    source: 'job',
    ticketRef: job.ticketRef || `FX-${String(job.id).padStart(4, '0')}`,
    initialEstimate: Number(job.initialEstimate || 0),
    finalCost: job.finalCost != null ? Number(job.finalCost) : null,
    timestamps: job.timestamps || {},
  })),
)

const allProviderJobs = computed(() => [...requestJobs.value, ...providerJobs.value])

const incomingJobs = computed(() => requestJobs.value.filter((job) => job.status === 'requested'))
const upcomingJobs = computed(() =>
  providerJobs.value.filter((job) => job.status === 'accepted' && new Date(job.scheduledAt) >= now.value),
)
const inProgressJobs = computed(() =>
  providerJobs.value.filter((job) => ['accepted', 'in_progress', 'completed', 'cost_pending'].includes(job.status)),
)
const pastJobs = computed(() =>
  providerJobs.value.filter((job) => ['closed', 'reviewed'].includes(job.status)),
)

const summaryCards = computed(() => [
  {
    label: 'Incoming Requests',
    code: 'REQ',
    value: incomingJobs.value.length,
    tone: 'orange',
  },
  {
    label: 'Upcoming Jobs',
    code: 'UP',
    value: upcomingJobs.value.length,
    tone: 'blue',
  },
  {
    label: 'In Progress',
    code: 'LIVE',
    value: inProgressJobs.value.filter((job) => ['accepted', 'in_progress'].includes(job.status)).length,
    tone: 'teal',
  },
  {
    label: 'Completed Jobs',
    code: 'DONE',
    value: providerJobs.value.filter((job) => ['completed', 'closed', 'reviewed'].includes(job.status)).length,
    tone: 'green',
  },
  {
    label: 'Cost Pending Confirmation',
    code: 'COST',
    value: providerJobs.value.filter((job) => job.status === 'cost_pending').length,
    tone: 'violet',
  },
])

const tabBaseJobs = computed(() => ({
  incoming: incomingJobs.value,
  upcoming: upcomingJobs.value,
  inProgress: inProgressJobs.value,
  past: pastJobs.value,
}))

const tabCounts = computed(() => ({
  incoming: incomingJobs.value.length,
  upcoming: upcomingJobs.value.length,
  inProgress: inProgressJobs.value.length,
  past: pastJobs.value.length,
}))

const serviceOptions = computed(() => {
  const services = new Set()
  allProviderJobs.value.forEach((job) => {
    if (job.service) services.add(job.service)
  })
  return ['all', ...Array.from(services).sort()]
})

const filteredJobs = computed(() => applyFilters(tabBaseJobs.value[activeTab.value] || []))
const filteredUpcomingJobs = computed(() => applyFilters(upcomingJobs.value))
const selectedUpcomingJob = computed(() =>
  filteredUpcomingJobs.value.find((job) => String(job.id) === String(selectedUpcomingId.value)) ||
  filteredUpcomingJobs.value[0] ||
  null,
)

watch(
  filteredUpcomingJobs,
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
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && validTabs.has(tab)) {
      activeTab.value = tab
    }
  },
  { immediate: true },
)

function applyFilters(jobs) {
  const query = search.value.trim().toLowerCase()
  let result = [...jobs]

  if (query) {
    result = result.filter((job) => {
      const haystack = [
        job.ticketRef,
        job.id,
        job.customerName,
        job.service,
        job.address,
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }

  if (serviceFilter.value !== 'all') {
    result = result.filter((job) => job.service === serviceFilter.value)
  }

  if (dateFrom.value) {
    const from = new Date(`${dateFrom.value}T00:00:00`)
    result = result.filter((job) => new Date(job.scheduledAt) >= from)
  }

  if (dateTo.value) {
    const to = new Date(`${dateTo.value}T23:59:59`)
    result = result.filter((job) => new Date(job.scheduledAt) <= to)
  }

  result.sort((a, b) => dateValue(b) - dateValue(a))

  return result
}

function dateValue(job) {
  return new Date(job.scheduledAt || 0).getTime()
}

function amountValue(job) {
  return Number(job.finalCost ?? job.initialEstimate ?? job.offeredRate ?? 0)
}

function statusLabel(status) {
  const labels = {
    requested: 'Requested',
    accepted: 'Accepted',
    in_progress: 'In Progress',
    completed: 'Completed',
    cost_pending: 'Cost Pending',
    closed: 'Closed',
    reviewed: 'Reviewed',
  }
  return labels[status] || String(status || 'Unknown')
}

function statusClass(status) {
  if (['requested', 'cost_pending', 'completed'].includes(status)) return 'status-pill-amber'
  if (['accepted', 'in_progress'].includes(status)) return 'status-pill-blue'
  if (['closed', 'reviewed'].includes(status)) return 'status-pill-green'
  if (status === 'rejected') return 'status-pill-red'
  return 'status-pill-amber'
}

function formatDateTime(iso) {
  if (!iso) return 'Not scheduled'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function formatShortDate(iso) {
  if (!iso) return 'Not recorded'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortAddress(address) {
  return String(address || 'Service area not provided').split(',')[0]
}

function costLabel(job) {
  const amount = amountValue(job)
  return amount ? `RM ${amount.toLocaleString()}` : 'Not entered'
}

function finalCostLabel(job) {
  return job.finalCost != null ? `RM ${Number(job.finalCost).toLocaleString()}` : 'Not entered'
}

function confirmationLabel(job) {
  if (job.status === 'cost_pending') return 'Waiting for customer confirmation'
  if (['closed', 'reviewed'].includes(job.status)) return 'Confirmed'
  if (job.status === 'completed') return 'Ready for final cost'
  return 'Not ready'
}

function getReview(job) {
  return store.reviews.find((review) =>
    review.customerName === job.customerName &&
    (!review.service || review.service === job.service),
  )
}

function completionDate(job) {
  return job.timestamps?.closed || job.timestamps?.reviewed || job.timestamps?.completed || job.scheduledAt
}

const providerWorkflow = [
  { key: 'requested', label: 'Request received', statuses: ['requested'] },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { key: 'in_progress', label: 'Work in progress', statuses: ['in_progress'] },
  { key: 'completed', label: 'Job completed', statuses: ['completed'] },
  { key: 'cost_pending', label: 'Waiting for customer cost confirmation', statuses: ['cost_pending'] },
  { key: 'closed', label: 'Closed', statuses: ['closed'] },
  { key: 'reviewed', label: 'Customer review submitted', statuses: ['reviewed'] },
]

const modalWorkflow = [
  { key: 'requested', label: 'Requested', statuses: ['requested'] },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cost_pending', label: 'Cost Pending', statuses: ['cost_pending'] },
  { key: 'closed', label: 'Closed', statuses: ['closed'] },
  { key: 'reviewed', label: 'Reviewed', statuses: ['reviewed'] },
]

function workflowIndex(job, steps = providerWorkflow) {
  return steps.findIndex((step) => step.statuses.includes(job?.status))
}

function stepState(job, index, steps = providerWorkflow) {
  const current = workflowIndex(job, steps)
  return {
    done: current > index,
    current: current === index,
  }
}

function openDetails(job) {
  detailsJob.value = job
}

function openAccept(job) {
  acceptJobTarget.value = job
  acceptNote.value = ''
}

function openReject(job) {
  rejectJobTarget.value = job
  rejectReason.value = ''
  rejectCustomReason.value = ''
}

function openCost(job) {
  costJobTarget.value = job
  labourCost.value = job.labourCost || null
  materialsCost.value = job.materialsCost || 0
  costNote.value = job.costNote || ''
  nextTick(() => {
    const input = document.querySelector('#provider-final-labour-cost')
    if (input) input.focus()
  })
}

async function confirmAccept() {
  if (!acceptJobTarget.value) return
  await store.acceptRequest(acceptJobTarget.value.id)
  acceptJobTarget.value = null
}

async function confirmReject() {
  if (!canReject.value || !rejectJobTarget.value) return
  await store.rejectRequest(rejectJobTarget.value.id)
  rejectJobTarget.value = null
}

const canReject = computed(() =>
  Boolean(rejectReason.value && (rejectReason.value !== 'Other' || rejectCustomReason.value.trim())),
)

async function startJob(job) {
  if (job.status === 'accepted') {
    await store.advanceJobStatus(job.id, 'in_progress')
  }
}

async function markCompleted(job) {
  await store.advanceJobStatus(job.id, 'completed')
}

async function submitFinalCost() {
  if (!costJobTarget.value || !labourCost.value) return
  await store.submitFinalCost(
    costJobTarget.value.id,
    Number(labourCost.value),
    Number(materialsCost.value) || 0,
    costNote.value,
  )
  costJobTarget.value = null
}

function clearFilters() {
  search.value = ''
  serviceFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
}

function switchTab(tabId) {
  activeTab.value = tabId
}
</script>

<template>
  <div class="provider-jobs-page">
    <section class="jobs-page-heading">
      <span>JOB MANAGEMENT</span>
      <h2>My Jobs</h2>
      <p>Manage incoming requests, upcoming appointments, active work, and completed services.</p>
    </section>

    <section class="jobs-summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="jobs-summary-card"
        :class="card.tone"
      >
        <span class="jobs-summary-code">{{ card.code }}</span>
        <div>
          <strong>{{ card.value }}</strong>
          <small>{{ card.label }}</small>
        </div>
      </article>
    </section>

    <section class="card jobs-filter-card">
      <div class="jobs-filter-head">
        <div>
          <span>FILTERS</span>
          <h3>Find provider jobs</h3>
          <p>Search and refine records inside the active tab.</p>
        </div>
        <div class="jobs-filter-result">
          <strong>{{ filteredJobs.length }}</strong>
          <span>results</span>
        </div>
      </div>

      <div class="jobs-filter-grid">
        <label class="form-group jobs-filter-search">
          <span>Search</span>
          <input v-model.trim="search" class="form-control" placeholder="Search by customer, service, or job ID" />
        </label>

        <label class="form-group">
          <span>Service Category</span>
          <select v-model="serviceFilter" class="form-control">
            <option v-for="service in serviceOptions" :key="service" :value="service">
              {{ service === 'all' ? 'All Categories' : service }}
            </option>
          </select>
        </label>

        <label class="form-group">
          <span>From</span>
          <input v-model="dateFrom" class="form-control" type="date" />
        </label>

        <label class="form-group">
          <span>To</span>
          <input v-model="dateTo" class="form-control" type="date" />
        </label>

      </div>

      <button class="btn btn-outline btn-sm jobs-clear-button" type="button" @click="clearFilters">
        Clear Filters
      </button>
    </section>

    <section class="jobs-tabs" role="tablist" aria-label="Provider job stages">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="jobs-tab"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
        <span>{{ tabCounts[tab.id] }}</span>
      </button>
    </section>

    <section v-if="activeTab === 'incoming'" class="card jobs-content-card">
      <div class="jobs-content-head">
        <div>
          <span>INCOMING REQUESTS</span>
          <h3>Requested Jobs</h3>
        </div>
        <strong>{{ filteredJobs.length }} shown</strong>
      </div>

      <div v-if="!filteredJobs.length" class="jobs-empty-state">
        <strong>No incoming requests</strong>
        <span>Requested provider jobs matching these filters will appear here.</span>
      </div>

      <div v-else class="jobs-card-list">
        <article v-for="job in filteredJobs" :key="job.id" class="incoming-job-card">
          <div class="job-card-main">
            <span>REQUEST #{{ job.id }}</span>
            <h4>{{ job.customerName }}</h4>
            <p>{{ job.service }} · {{ shortAddress(job.address) }}</p>
          </div>

          <div class="incoming-job-meta">
            <div>
              <span>Scheduled</span>
              <strong>{{ formatDateTime(job.scheduledAt) }}</strong>
            </div>
            <div>
              <span>Estimate</span>
              <strong>{{ costLabel(job) }}</strong>
            </div>
            <span class="status-pill" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span>
          </div>

          <div class="job-row-actions">
            <button class="btn btn-outline btn-sm" type="button" @click="openDetails(job)">View Details</button>
            <button class="btn btn-success btn-sm" type="button" @click="openAccept(job)">Accept Job</button>
            <button class="btn btn-danger btn-sm" type="button" @click="openReject(job)">Reject Job</button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'upcoming'" class="upcoming-ticket-layout">
      <article class="card jobs-content-card upcoming-table-card">
        <div class="jobs-content-head">
          <div>
            <span>UPCOMING WORK</span>
            <h3>Upcoming Jobs</h3>
          </div>
          <strong>{{ filteredUpcomingJobs.length }} shown</strong>
        </div>

        <div v-if="!filteredUpcomingJobs.length" class="jobs-empty-state">
          <strong>No upcoming jobs</strong>
          <span>Accepted future appointments matching these filters will appear here.</span>
        </div>

        <div v-else class="provider-jobs-table-frame">
          <table class="data-table provider-jobs-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Scheduled date and time</th>
                <th>Address / service area</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="job in filteredUpcomingJobs"
                :key="job.id"
                :class="{ selected: selectedUpcomingJob && String(selectedUpcomingJob.id) === String(job.id) }"
                @click="selectedUpcomingId = job.id"
              >
                <td><strong>#{{ job.ticketRef }}</strong></td>
                <td>{{ job.customerName }}</td>
                <td>{{ job.service }}</td>
                <td>{{ formatDateTime(job.scheduledAt) }}</td>
                <td>{{ shortAddress(job.address) }}</td>
                <td><span class="status-pill" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" type="button" @click.stop="openDetails(job)">View Details</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="card provider-ticket-card">
        <template v-if="selectedUpcomingJob">
          <div class="ticket-panel-head">
            <div>
              <span>PROVIDER JOB TICKET</span>
              <h3>Job Ticket · #{{ selectedUpcomingJob.ticketRef }}</h3>
              <p>{{ selectedUpcomingJob.service }} · {{ selectedUpcomingJob.customerName }}</p>
            </div>
            <span class="status-pill" :class="statusClass(selectedUpcomingJob.status)">
              {{ statusLabel(selectedUpcomingJob.status) }}
            </span>
          </div>

          <div class="ticket-info-grid">
            <div>
              <span>Scheduled</span>
              <strong>{{ formatDateTime(selectedUpcomingJob.scheduledAt) }}</strong>
            </div>
            <div>
              <span>Service area</span>
              <strong>{{ shortAddress(selectedUpcomingJob.address) }}</strong>
            </div>
            <div>
              <span>Customer Contact</span>
              <strong>Not available</strong>
            </div>
            <div>
              <span>Estimated Cost</span>
              <strong>{{ costLabel(selectedUpcomingJob) }}</strong>
            </div>
            <div>
              <span>Final Cost</span>
              <strong>{{ finalCostLabel(selectedUpcomingJob) }}</strong>
            </div>
            <div>
              <span>Cost Confirmation</span>
              <strong>{{ confirmationLabel(selectedUpcomingJob) }}</strong>
            </div>
          </div>

          <div class="ticket-note">
            <span>Customer request / service note</span>
            <p>{{ selectedUpcomingJob.costNote || 'No customer note supplied.' }}</p>
          </div>

          <div class="provider-ticket-timeline">
            <div
              v-for="(step, index) in providerWorkflow"
              :key="step.key"
              class="provider-ticket-step"
              :class="stepState(selectedUpcomingJob, index)"
            >
              <i></i>
              <span>{{ step.label }}</span>
            </div>
          </div>

          <div class="ticket-actions-row">
            <button class="btn btn-outline btn-sm" type="button" @click="openDetails(selectedUpcomingJob)">
              View Details
            </button>
            <button
              v-if="selectedUpcomingJob.status === 'accepted'"
              class="btn btn-primary btn-sm"
              type="button"
              @click="startJob(selectedUpcomingJob)"
            >
              Start Job
            </button>
            <button
              v-else-if="selectedUpcomingJob.status === 'in_progress'"
              class="btn btn-primary btn-sm"
              type="button"
              @click="markCompleted(selectedUpcomingJob)"
            >
              Mark Completed
            </button>
            <button
              v-else-if="selectedUpcomingJob.status === 'completed'"
              class="btn btn-primary btn-sm"
              type="button"
              @click="openCost(selectedUpcomingJob)"
            >
              Enter Final Cost
            </button>
            <button v-else-if="selectedUpcomingJob.status === 'cost_pending'" class="btn btn-outline btn-sm" type="button" disabled>
              Waiting for customer confirmation
            </button>
            <button v-else-if="selectedUpcomingJob.status === 'closed'" class="btn btn-outline btn-sm" type="button" disabled>
              Awaiting Customer Payment
            </button>
            <button v-else-if="selectedUpcomingJob.status === 'reviewed'" class="btn btn-outline btn-sm" type="button" @click="openDetails(selectedUpcomingJob)">
              View Customer Review
            </button>
          </div>
        </template>

        <div v-else class="jobs-empty-state compact">
          <strong>No selected job</strong>
          <span>Select an upcoming job to preview its provider ticket.</span>
        </div>
      </aside>
    </section>

    <section v-else class="card jobs-content-card">
      <div class="jobs-content-head">
        <div>
          <span>{{ activeTab === 'inProgress' ? 'ACTIVE WORK' : 'PAST SERVICES' }}</span>
          <h3>{{ activeTab === 'inProgress' ? 'In Progress Jobs' : 'Past Jobs' }}</h3>
        </div>
        <strong>{{ filteredJobs.length }} shown</strong>
      </div>

      <div v-if="!filteredJobs.length" class="jobs-empty-state">
        <strong>No jobs found</strong>
        <span>Try adjusting the search or filters.</span>
      </div>

      <div v-else class="provider-jobs-table-frame">
        <table class="data-table provider-jobs-table">
          <thead>
            <tr v-if="activeTab === 'inProgress'">
              <th>Job ID</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Scheduled date and time</th>
              <th>Address / service area</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
            <tr v-else>
              <th>Job ID</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Final amount</th>
              <th>Completion date</th>
              <th>Customer review / rating</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in filteredJobs" :key="job.id">
              <template v-if="activeTab === 'inProgress'">
                <td><strong>#{{ job.ticketRef }}</strong></td>
                <td>{{ job.customerName }}</td>
                <td>{{ job.service }}</td>
                <td>{{ formatDateTime(job.scheduledAt) }}</td>
                <td>{{ shortAddress(job.address) }}</td>
                <td><span class="status-pill" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span></td>
                <td>
                  <div class="table-action-stack">
                    <button class="btn btn-outline btn-sm" type="button" @click="openDetails(job)">View Details</button>
                    <button
                      v-if="job.status === 'accepted'"
                      class="btn btn-primary btn-sm"
                      type="button"
                      @click="startJob(job)"
                    >
                      Start Job
                    </button>
                    <button
                      v-else-if="job.status === 'in_progress'"
                      class="btn btn-primary btn-sm"
                      type="button"
                      @click="markCompleted(job)"
                    >
                      Mark Completed
                    </button>
                    <button
                      v-else-if="job.status === 'completed'"
                      class="btn btn-primary btn-sm"
                      type="button"
                      @click="openCost(job)"
                    >
                      Enter Final Cost
                    </button>
                    <button v-else-if="job.status === 'cost_pending'" class="btn btn-outline btn-sm" type="button" disabled>
                      Waiting for Customer Confirmation
                    </button>
                    <button v-else-if="job.status === 'closed'" class="btn btn-outline btn-sm" type="button" disabled>
                      Awaiting Customer Payment
                    </button>
                  </div>
                </td>
              </template>

              <template v-else>
                <td><strong>#{{ job.ticketRef }}</strong></td>
                <td>{{ job.customerName }}</td>
                <td>{{ job.service }}</td>
                <td>{{ finalCostLabel(job) }}</td>
                <td>{{ formatShortDate(completionDate(job)) }}</td>
                <td>
                  <span v-if="getReview(job)" class="review-inline">
                    {{ getReview(job).rating }} / 5 · {{ getReview(job).comment || 'Review submitted' }}
                  </span>
                  <span v-else class="muted">No review yet</span>
                </td>
                <td><button class="btn btn-outline btn-sm" type="button" @click="openDetails(job)">View Details</button></td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="detailsJob" class="provider-modal-backdrop" @click.self="detailsJob = null">
      <article class="provider-job-modal">
        <header class="provider-modal-head">
          <div>
            <span>JOB DETAILS</span>
            <h3>Job #{{ detailsJob.ticketRef }}</h3>
            <p>{{ detailsJob.service }} · {{ detailsJob.customerName }}</p>
          </div>
          <button class="provider-modal-close" type="button" @click="detailsJob = null">×</button>
        </header>

        <div class="provider-modal-body">
          <section class="modal-section">
            <div class="modal-section-head">
              <span>JOB SUMMARY</span>
              <span class="status-pill" :class="statusClass(detailsJob.status)">{{ statusLabel(detailsJob.status) }}</span>
            </div>
            <div class="modal-info-grid">
              <div><span>Job ID</span><strong>#{{ detailsJob.ticketRef }}</strong></div>
              <div><span>Service Category</span><strong>{{ detailsJob.service }}</strong></div>
              <div><span>Created Date</span><strong>{{ formatShortDate(detailsJob.timestamps?.requested || detailsJob.scheduledAt) }}</strong></div>
              <div><span>Scheduled</span><strong>{{ formatDateTime(detailsJob.scheduledAt) }}</strong></div>
            </div>
          </section>

          <section class="modal-section">
            <div class="modal-section-head"><span>CUSTOMER INFORMATION</span></div>
            <div class="modal-info-grid">
              <div><span>Customer</span><strong>{{ detailsJob.customerName }}</strong></div>
              <div><span>Phone / Email</span><strong>Not available</strong></div>
              <div class="wide"><span>Service Address</span><strong>{{ detailsJob.address || 'Not provided' }}</strong></div>
              <div class="wide"><span>Customer Request</span><strong>{{ detailsJob.costNote || 'No customer request note supplied.' }}</strong></div>
            </div>
          </section>

          <section class="modal-section">
            <div class="modal-section-head"><span>COST DETAILS</span></div>
            <div class="modal-info-grid">
              <div><span>Estimated / Base Amount</span><strong>{{ costLabel(detailsJob) }}</strong></div>
              <div><span>Final Job Amount</span><strong>{{ finalCostLabel(detailsJob) }}</strong></div>
              <div class="wide"><span>Cost Confirmation Status</span><strong>{{ confirmationLabel(detailsJob) }}</strong></div>
            </div>
          </section>

          <section class="modal-section">
            <div class="modal-section-head"><span>JOB TIMELINE</span></div>
            <div class="modal-timeline">
              <div
                v-for="(step, index) in modalWorkflow"
                :key="step.key"
                class="modal-timeline-step"
                :class="stepState(detailsJob, index, modalWorkflow)"
              >
                <i></i>
                <span>{{ step.label }}</span>
              </div>
            </div>
          </section>

          <section class="modal-section">
            <div class="modal-section-head"><span>NOTES</span></div>
            <div class="modal-info-grid">
              <div class="wide"><span>Customer Note</span><strong>{{ detailsJob.notes || 'No customer note supplied.' }}</strong></div>
              <div class="wide"><span>Provider Note</span><strong>{{ detailsJob.costNote || 'No provider note supplied.' }}</strong></div>
              <div class="wide"><span>Internal Service Notes</span><strong>{{ detailsJob.note || 'No internal service notes.' }}</strong></div>
            </div>
          </section>
        </div>
      </article>
    </div>

    <div v-if="acceptJobTarget" class="provider-modal-backdrop" @click.self="acceptJobTarget = null">
      <article class="provider-confirm-modal">
        <header class="provider-modal-head">
          <div>
            <span>ACCEPT JOB</span>
            <h3>Confirm Accept</h3>
            <p>{{ acceptJobTarget.customerName }} · {{ acceptJobTarget.service }}</p>
          </div>
          <button class="provider-modal-close" type="button" @click="acceptJobTarget = null">×</button>
        </header>
        <div class="provider-modal-body">
          <div class="modal-info-grid">
            <div><span>Customer</span><strong>{{ acceptJobTarget.customerName }}</strong></div>
            <div><span>Service</span><strong>{{ acceptJobTarget.service }}</strong></div>
            <div><span>Scheduled</span><strong>{{ formatDateTime(acceptJobTarget.scheduledAt) }}</strong></div>
            <div><span>Address</span><strong>{{ acceptJobTarget.address }}</strong></div>
          </div>
          <label class="form-group modal-form-field">
            <span>Optional provider note</span>
            <textarea v-model="acceptNote" class="form-control" rows="3" placeholder="Add a note for your own reference"></textarea>
          </label>
        </div>
        <footer class="provider-modal-actions">
          <button class="btn btn-outline" type="button" @click="acceptJobTarget = null">Cancel</button>
          <button class="btn btn-success" type="button" @click="confirmAccept">Confirm Accept</button>
        </footer>
      </article>
    </div>

    <div v-if="rejectJobTarget" class="provider-modal-backdrop" @click.self="rejectJobTarget = null">
      <article class="provider-confirm-modal">
        <header class="provider-modal-head">
          <div>
            <span>REJECT JOB</span>
            <h3>Confirm Rejection</h3>
            <p>{{ rejectJobTarget.customerName }} · {{ rejectJobTarget.service }}</p>
          </div>
          <button class="provider-modal-close" type="button" @click="rejectJobTarget = null">×</button>
        </header>
        <div class="provider-modal-body">
          <label class="form-group modal-form-field">
            <span>Rejection reason</span>
            <select v-model="rejectReason" class="form-control" required>
              <option value="" disabled>Select a reason</option>
              <option v-for="reason in rejectReasons" :key="reason">{{ reason }}</option>
            </select>
          </label>
          <label v-if="rejectReason === 'Other'" class="form-group modal-form-field">
            <span>Custom reason</span>
            <textarea v-model.trim="rejectCustomReason" class="form-control" rows="3" required placeholder="Enter the reason"></textarea>
          </label>
        </div>
        <footer class="provider-modal-actions">
          <button class="btn btn-outline" type="button" @click="rejectJobTarget = null">Cancel</button>
          <button class="btn btn-danger" type="button" :disabled="!canReject" @click="confirmReject">Confirm Rejection</button>
        </footer>
      </article>
    </div>

    <div v-if="costJobTarget" class="provider-modal-backdrop" @click.self="costJobTarget = null">
      <article class="provider-confirm-modal">
        <header class="provider-modal-head">
          <div>
            <span>FINAL COST</span>
            <h3>Enter Final Cost</h3>
            <p>#{{ costJobTarget.ticketRef }} · {{ costJobTarget.customerName }}</p>
          </div>
          <button class="provider-modal-close" type="button" @click="costJobTarget = null">×</button>
        </header>
        <div class="provider-modal-body">
          <div class="modal-cost-grid">
            <label class="form-group">
              <span>Labour Cost (RM)</span>
              <input id="provider-final-labour-cost" v-model.number="labourCost" class="form-control" min="0" type="number" />
            </label>
            <label class="form-group">
              <span>Materials (RM)</span>
              <input v-model.number="materialsCost" class="form-control" min="0" type="number" />
            </label>
          </div>
          <label class="form-group modal-form-field">
            <span>Notes to customer</span>
            <textarea v-model="costNote" class="form-control" rows="3" placeholder="Describe work completed or materials used"></textarea>
          </label>
        </div>
        <footer class="provider-modal-actions">
          <button class="btn btn-outline" type="button" @click="costJobTarget = null">Cancel</button>
          <button class="btn btn-primary" type="button" :disabled="!labourCost" @click="submitFinalCost">Submit Final Cost</button>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.provider-jobs-page {
  display: grid;
  gap: 20px;
}

.jobs-page-heading {
  display: grid;
  gap: 5px;
}

.jobs-page-heading span,
.jobs-filter-head span,
.jobs-content-head span,
.ticket-panel-head span,
.ticket-info-grid span,
.ticket-note span,
.modal-section-head span,
.modal-info-grid span,
.modal-form-field span,
.modal-cost-grid span {
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.jobs-page-heading h2 {
  font-size: 1.7rem;
  line-height: 1.15;
}

.jobs-page-heading p,
.jobs-filter-head p,
.ticket-panel-head p,
.ticket-note p {
  color: var(--color-muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

.jobs-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.jobs-summary-card {
  --summary-accent: var(--color-primary);
  --summary-soft: rgba(37, 99, 235, 0.12);
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 92px;
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.jobs-summary-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--summary-accent);
  content: "";
}

.jobs-summary-card.orange { --summary-accent: var(--color-warning); --summary-soft: rgba(245, 158, 11, 0.14); }
.jobs-summary-card.blue { --summary-accent: var(--color-primary); --summary-soft: rgba(37, 99, 235, 0.13); }
.jobs-summary-card.teal { --summary-accent: var(--color-secondary); --summary-soft: rgba(20, 184, 166, 0.13); }
.jobs-summary-card.green { --summary-accent: var(--color-success); --summary-soft: rgba(34, 197, 94, 0.13); }
.jobs-summary-card.violet { --summary-accent: #8b5cf6; --summary-soft: rgba(139, 92, 246, 0.13); }

.jobs-summary-code {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  background: var(--summary-soft);
  color: var(--summary-accent);
  font-size: 0.66rem;
  font-weight: 900;
}

.jobs-summary-card > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.jobs-summary-card strong {
  font-size: 1.42rem;
  line-height: 1.05;
}

.jobs-summary-card small {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 750;
}

.jobs-filter-card {
  margin: 0;
}

.jobs-filter-head,
.jobs-content-head,
.ticket-panel-head,
.modal-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.jobs-filter-head h3,
.jobs-content-head h3,
.ticket-panel-head h3 {
  margin-top: 5px;
  font-size: 1.1rem;
}

.jobs-filter-result,
.jobs-content-head > strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.76rem;
}

.jobs-filter-result strong {
  font-size: 0.9rem;
}

.jobs-filter-result span {
  color: var(--color-muted);
  letter-spacing: 0;
  text-transform: none;
}

.jobs-filter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) repeat(3, minmax(150px, 1fr));
  gap: 14px;
}

.jobs-filter-grid .form-group {
  margin: 0;
}

.jobs-filter-grid .form-group > span {
  display: block;
  margin-bottom: 5px;
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 850;
  text-transform: uppercase;
}

.jobs-clear-button {
  margin-top: 14px;
}

.jobs-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
}

.jobs-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin-bottom: -1px;
  padding: 0 15px;
  cursor: pointer;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 850;
}

.jobs-tab span {
  display: inline-grid;
  min-width: 26px;
  min-height: 22px;
  place-items: center;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.11);
  color: var(--color-primary);
  font-size: 0.7rem;
}

.jobs-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.jobs-content-card,
.provider-ticket-card {
  margin: 0;
}

.jobs-card-list {
  display: grid;
  gap: 12px;
}

.incoming-job-card {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr) auto;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.job-card-main {
  display: grid;
  gap: 5px;
}

.job-card-main span,
.incoming-job-meta span:not(.status-pill) {
  color: var(--color-muted);
  font-size: 0.66rem;
  font-weight: 850;
  text-transform: uppercase;
}

.job-card-main h4 {
  font-size: 1.05rem;
}

.job-card-main p {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.incoming-job-meta {
  display: grid;
  grid-template-columns: 1fr 0.7fr auto;
  gap: 10px;
  align-items: center;
}

.incoming-job-meta > div,
.ticket-info-grid > div,
.modal-info-grid > div {
  display: grid;
  min-width: 0;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}

.incoming-job-meta strong,
.ticket-info-grid strong,
.modal-info-grid strong {
  overflow-wrap: anywhere;
  font-size: 0.84rem;
}

.job-row-actions,
.table-action-stack,
.ticket-actions-row,
.provider-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upcoming-ticket-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
  gap: 20px;
  align-items: start;
}

.provider-jobs-table-frame {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
}

.provider-jobs-table {
  min-width: 960px;
}

.provider-jobs-table tr {
  cursor: pointer;
}

.provider-jobs-table tbody tr.selected td {
  background: rgba(37, 99, 235, 0.12);
}

.provider-ticket-card {
  position: sticky;
  top: 0;
}

.ticket-info-grid,
.modal-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.modal-info-grid .wide {
  grid-column: 1 / -1;
}

.ticket-note {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  padding: 13px;
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.provider-ticket-timeline,
.modal-timeline {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.provider-ticket-step,
.modal-timeline-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  color: var(--color-muted);
  font-size: 0.78rem;
  font-weight: 750;
}

.provider-ticket-step i,
.modal-timeline-step i {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-card);
}

.provider-ticket-step.done,
.modal-timeline-step.done {
  color: var(--color-success);
}

.provider-ticket-step.done i,
.modal-timeline-step.done i {
  border-color: var(--color-success);
  background: var(--color-success);
}

.provider-ticket-step.current,
.modal-timeline-step.current {
  color: var(--color-primary);
}

.provider-ticket-step.current i,
.modal-timeline-step.current i {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
}

.ticket-actions-row {
  margin-top: 16px;
}

.jobs-empty-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 6px;
  padding: 24px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  text-align: center;
}

.jobs-empty-state.compact {
  min-height: 140px;
}

.jobs-empty-state span,
.review-inline {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.provider-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
}

.provider-job-modal,
.provider-confirm-modal {
  display: flex;
  width: min(920px, 100%);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}

.provider-confirm-modal {
  width: min(620px, 100%);
}

.provider-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex: 0 0 auto;
  padding: 20px 22px;
  border-bottom: 1px solid var(--color-border);
}

.provider-modal-head span {
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.provider-modal-head h3 {
  margin-top: 5px;
  font-size: 1.18rem;
}

.provider-modal-head p {
  margin-top: 4px;
  color: var(--color-muted);
  font-size: 0.82rem;
}

.provider-modal-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  cursor: pointer;
  border: 0;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-muted);
  font-size: 1.2rem;
}

.provider-modal-body {
  display: grid;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px;
}

.modal-section {
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.modal-section-head {
  margin-bottom: 0;
}

.modal-timeline {
  margin-top: 0;
}

.modal-form-field {
  margin: 0;
}

.modal-cost-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.provider-modal-actions {
  justify-content: flex-end;
  flex: 0 0 auto;
  padding: 16px 22px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 1280px) {
  .jobs-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .jobs-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .jobs-filter-search {
    grid-column: 1 / -1;
  }
}

@media (max-width: 980px) {
  .upcoming-ticket-layout,
  .incoming-job-card {
    grid-template-columns: 1fr;
  }

  .provider-ticket-card {
    position: static;
  }
}

@media (max-width: 720px) {
  .jobs-summary-grid,
  .jobs-filter-grid,
  .incoming-job-meta,
  .ticket-info-grid,
  .modal-info-grid,
  .modal-cost-grid {
    grid-template-columns: 1fr;
  }

  .jobs-filter-head,
  .jobs-content-head,
  .ticket-panel-head,
  .modal-section-head,
  .provider-modal-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .job-row-actions .btn,
  .table-action-stack .btn,
  .ticket-actions-row .btn,
  .provider-modal-actions .btn {
    flex: 1 1 150px;
  }
}
</style>
