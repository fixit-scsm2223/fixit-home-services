<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderStore } from '@/stores/provider'

const route = useRoute()
const router = useRouter()
const store = useProviderStore()

const job = computed(() => store.jobs.find(j => j.id === route.params.id))

const labourCost = ref(null)
const materialsCost = ref(null)
const costNote = ref('')

function submitCost() {
  if (!job.value || !labourCost.value) return
  store.submitFinalCost(job.value.id, Number(labourCost.value), Number(materialsCost.value) || 0, costNote.value)
}

function formatStepTime(iso, isCurrent) {
  if (!iso) return null
  const d = new Date(iso)
  const formatted = d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return isCurrent ? `${formatted} — Now` : formatted
}

const timelineSteps = computed(() => {
  if (!job.value) return []
  const statusOrder = ['accepted', 'en_route', 'in_progress', 'cost_pending', 'closed']
  const currentIdx = statusOrder.indexOf(job.value.status)

  return store.TICKET_STEPS.map((step, idx) => {
    const reached = idx <= currentIdx
    const isCurrent = idx === currentIdx
    const fallback = step.key === 'cost_pending' ? 'Awaiting completion' : 'Pending'
    return {
      ...step,
      done: reached && !isCurrent,
      current: isCurrent,
      display: reached ? formatStepTime(job.value.timestamps[step.key], isCurrent) : fallback
    }
  })
})

const statusBadgeLabel = computed(() => job.value ? job.value.status.replace('_', ' ').toUpperCase() : '')

function advance(status) {
  if (!job.value) return
  store.advanceJobStatus(job.value.id, status)
}
</script>

<template>
  <div v-if="!job" style="text-align:center; padding:60px;">
    <p>Job not found.</p>
    <button class="btn btn-outline" style="margin-top:12px;" @click="router.push('/provider/my-jobs')">Back to My Jobs</button>
  </div>

  <div v-else>
    <button class="btn btn-outline btn-sm" style="margin-bottom:20px;" @click="router.push('/provider/my-jobs')">← Back to My Jobs</button>

    <div class="split-row">
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Job Ticket #{{ job.ticketRef }}</h3>
            <p class="muted" style="font-size:0.85rem; margin-top:2px;">
              {{ job.service }} • {{ store.profile.name }}
            </p>
          </div>
          <span class="status-pill status-pill-blue">{{ statusBadgeLabel }}</span>
        </div>

        <div class="ticket-steps">
          <div
            v-for="step in timelineSteps"
            :key="step.key"
            class="ticket-step"
          >
            <span
              class="ticket-step-dot"
              :class="{ done: step.done, current: step.current }"
            ></span>
            <div class="ticket-step-body">
              <div class="ticket-step-label">{{ step.label }}</div>
              <div class="ticket-step-time" :class="{ 'is-current': step.current }">{{ step.display }}</div>
            </div>
          </div>
        </div>

        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
          <button v-if="job.status === 'accepted'" class="btn btn-primary btn-sm" @click="advance('en_route')">
            Mark En Route
          </button>
          <button v-if="job.status === 'en_route'" class="btn btn-primary btn-sm" @click="advance('in_progress')">
            Start Work
          </button>
        </div>
      </div>

      <div class="card cost-proposal-card">
        <div class="card-header"><h3>💰 Submit Final Cost</h3></div>

        <template v-if="job.status === 'in_progress'">
          <div class="form-group">
            <label class="label-upper">Job Reference</label>
            <input class="form-control" disabled :value="`${job.customerName} — ${job.service} #${job.ticketRef}`" />
          </div>

          <div class="form-group">
            <label class="label-upper">Labour Cost (RM)</label>
            <input class="form-control" type="number" min="0" v-model.number="labourCost" placeholder="e.g. 200" />
          </div>

          <div class="form-group">
            <label class="label-upper">Materials (RM)</label>
            <input class="form-control" type="number" min="0" v-model.number="materialsCost" placeholder="e.g. 55" />
          </div>

          <div class="form-group">
            <label class="label-upper">Notes to Customer</label>
            <input class="form-control" v-model="costNote" placeholder="Replaced 2 pipe joints, all tested OK" />
          </div>

          <button class="btn btn-primary btn-w-full btn-pill" :disabled="!labourCost" @click="submitCost">
            Submit Cost Proposal
          </button>
        </template>

        <template v-else-if="job.status === 'cost_pending'">
          <div style="background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.15); padding:20px; border-radius:var(--radius-md); text-align:center;">
            <span style="font-size:2rem;">⏳</span>
            <h4 style="margin-top:8px;">Awaiting Customer Confirmation</h4>
            <p class="muted" style="font-size:0.82rem; margin-top:4px;">
              Labour RM {{ job.labourCost?.toFixed(2) }} + Materials RM {{ job.materialsCost?.toFixed(2) }}
              = <strong class="text-primary">RM {{ job.finalCost?.toFixed(2) }}</strong>
            </p>
            <p class="muted" style="font-size:0.78rem; margin-top:2px;" v-if="job.costNote">Note: {{ job.costNote }}</p>
          </div>
        </template>

        <template v-else-if="job.status === 'closed'">
          <div style="padding:20px; text-align:center;">
            <span style="font-size:2rem;">✅</span>
            <h4 style="margin-top:8px;">Job Closed</h4>
            <p class="muted" style="font-size:0.82rem; margin-top:4px;">Final cost of RM {{ job.finalCost?.toFixed(2) }} was confirmed.</p>
          </div>
        </template>

        <template v-else>
          <div style="padding:24px; text-align:center;">
            <span style="font-size:2rem;">🛠️</span>
            <p class="muted" style="font-size:0.82rem; margin-top:8px;">
              The cost proposal form unlocks once work is marked in progress.
            </p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
