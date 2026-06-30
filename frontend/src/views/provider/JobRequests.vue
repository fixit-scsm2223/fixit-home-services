<script setup>
import { ref } from 'vue'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()
const expandedId = ref(null)

function toggleDetails(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatSchedule(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
</script>

<template>
  <div>
    <div class="card-header" style="margin-bottom:18px;">
      <h3>🧰 Incoming Job Requests</h3>
    </div>

    <div v-if="store.jobRequests.length === 0" class="card">
      <div style="text-align:center; padding:40px;">
        <span style="font-size:2.5rem;">📭</span>
        <h3 style="margin-top:12px;">No requests yet</h3>
        <p class="muted" style="margin-top:4px; font-size:0.85rem;">New job requests from customers will appear here.</p>
      </div>
    </div>

    <div
      v-for="req in store.jobRequests"
      :key="req.id"
      class="request-card"
    >
      <div class="request-card-top">
        <div>
          <h4>{{ req.customerName }}</h4>
          <p class="muted request-service-line">{{ req.icon }} {{ req.service }} — {{ req.address.split(',')[0] }}</p>
        </div>
        <span
          class="status-pill"
          :class="{
            'status-pill-green': req.status === 'accepted',
            'status-pill-amber': req.status === 'requested',
            'status-pill-red': req.status === 'rejected'
          }"
        >
          {{ req.status === 'accepted' ? '✓ ACCEPTED' : req.status === 'rejected' ? '✕ REJECTED' : '⏳ PENDING' }}
        </span>
      </div>

      <p class="muted request-meta-line">
        📅 {{ formatSchedule(req.scheduledAt) }}
        &nbsp;&nbsp;📍 {{ req.distanceKm }}km away
        &nbsp;&nbsp;💰 ~RM {{ req.offeredRate }} est.
      </p>

      <div v-if="expandedId === req.id" class="request-details-box">
        "{{ req.note }}"
      </div>

      <div class="request-actions">
        <button
          class="btn btn-success btn-sm"
          :disabled="req.status !== 'requested'"
          @click="store.acceptRequest(req.id)"
        >✓ Accept</button>
        <button
          class="btn btn-danger btn-sm"
          :disabled="req.status !== 'requested'"
          @click="store.rejectRequest(req.id)"
        >✕ Reject</button>
        <button class="btn btn-outline btn-sm" @click="toggleDetails(req.id)">
          {{ expandedId === req.id ? 'Hide Details' : 'View Details' }}
        </button>
      </div>
    </div>
  </div>
</template>
