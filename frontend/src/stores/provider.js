// ============================================================
// FixIt — Provider Store
// Holds the provider's profile, job requests/jobs, availability,
// earnings, reviews, analytics, settings, and the active job chat.
// Mutations are local-first (instant UI feedback) with best-effort
// sync against the live backend via services/providerApi.js.
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import providerApi from '@/services/providerApi'

export const useProviderStore = defineStore('provider', () => {

  /* ── State ── */
  const profile = ref({
    name: '',
    phone: '',
    email: '',
    location: '',
    baseRate: 0,
    photoUrl: '',
    bio: '',
  })

  const allCategories = ref([
    { id: 1, title: 'Plumbing',    icon: '🚰' },
    { id: 2, title: 'Electrical',  icon: '⚡' },
    { id: 3, title: 'Cleaning',    icon: '🧹' },
    { id: 4, title: 'Gardening',   icon: '🏡' },
    { id: 5, title: 'AC Service',  icon: '❄️' },
  ])
  const selectedCategoryIds = ref([])

  const kyc = ref({ status: 'pending', fileName: '', submittedAt: null })

  const jobRequests = ref([])
  const jobs = ref([])

  const TICKET_STEPS = [
    { key: 'accepted',     label: 'Booking Confirmed' },
    { key: 'en_route',     label: 'Provider En Route' },
    { key: 'in_progress',  label: 'Work In Progress' },
    { key: 'cost_pending', label: 'Final Cost Confirmation' },
    { key: 'closed',       label: 'Job Closed' },
  ]

  const availability        = ref({ mode: 'manual', reservedDates: [] })
  const availabilityEntries = ref([]) // [{ id, blocked_date }]

  const earnings = ref({ withdrawable: 0, escrow: 0, lifetime: 0 })
  const reviews  = ref([])
  const monthlyStats = ref([])
  const settings = ref({ maxRadius: 25, notifications: 'In-App Push' })

  const chatMessages    = ref([])
  const activeChatJobId = ref(null)
  const activeChat      = computed(() => {
    if (!activeChatJobId.value) return null
    const j = jobs.value.find(j => j.id === String(activeChatJobId.value))
    return j?.customerName || null
  })

  const toasts = ref([])
  let toastCounter = 0

  /* ── Helpers ── */

  function showToast(message, variant = 'success') {
    const id = ++toastCounter
    toasts.value.push({ id, message, variant })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
  }

  function normalizeJob(j) {
    return {
      id:              String(j.id),
      ticketRef:       j.ticket_ref,
      customerName:    j.customer_name || 'Unknown',
      address:         j.address,
      service:         j.service_title,
      scheduledAt:     j.scheduled_at,
      status:          j.status,
      initialEstimate: j.initial_estimate != null ? parseFloat(j.initial_estimate) : null,
      labourCost:      j.labour_cost     != null ? parseFloat(j.labour_cost)      : null,
      materialsCost:   j.materials_cost  != null ? parseFloat(j.materials_cost)   : null,
      finalCost:       j.final_cost      != null ? parseFloat(j.final_cost)        : null,
      costNote:        j.cost_note || '',
      timestamps:      j.timestamps || {},
    }
  }

  function normalizeRequest(j) {
    const cat = allCategories.value.find(c => c.id === parseInt(j.category_id))
    return {
      id:          String(j.id),
      customerName:j.customer_name || 'Unknown',
      address:     j.address,
      service:     j.service_title,
      icon:        cat?.icon || '🔧',
      offeredRate: j.initial_estimate != null ? parseFloat(j.initial_estimate) : 0,
      distanceKm:  j.distance_km      != null ? parseFloat(j.distance_km)      : 0,
      note:        j.cost_note || '',
      scheduledAt: j.scheduled_at,
      status:      'requested',
    }
  }

  /* ── Fetch functions ── */

  async function fetchProfile() {
    try {
      const env = await providerApi.getProfile()
      const p   = env.data
      profile.value = {
        name:     p.business_name || '',
        bio:      p.bio           || '',
        location: p.address       || '',
        baseRate: parseFloat(p.base_rate) || 0,
        photoUrl: p.photo_path    || '',
        phone:    p.phone         || '',
        email:    p.email         || '',
      }
      selectedCategoryIds.value = (p.categories || []).map(c => parseInt(c.id))
      kyc.value = {
        status:      p.verification_status || 'pending',
        fileName:    p.kyc_file_path ? p.kyc_file_path.split('/').pop() : '',
        submittedAt: p.kyc_submitted_at || null,
      }
    } catch { /* 401 handled by the router guard */ }
  }

  async function fetchJobs() {
    try {
      const env = await providerApi.getJobs()
      const all = env.data || []
      jobRequests.value = all.filter(j => j.status === 'requested').map(normalizeRequest)
      jobs.value        = all.filter(j => j.status !== 'requested').map(normalizeJob)
    } catch {}
  }

  async function fetchAvailability() {
    try {
      const env = await providerApi.getAvailability()
      const d   = env.data
      availability.value = {
        mode:          d.mode || 'manual',
        reservedDates: (d.blocked_dates || []).map(b => b.blocked_date),
      }
      availabilityEntries.value = d.blocked_dates || []
    } catch {}
  }

  async function fetchMessages(jobId) {
    if (!jobId) return
    activeChatJobId.value = jobId
    try {
      const env = await providerApi.getMessages(jobId)
      chatMessages.value = (env.data || []).map(m => ({
        sender:     m.is_mine ? 'provider' : 'customer',
        text:       m.body,
        senderName: m.sender_name,
        time:       new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    } catch {}
  }

  async function fetchEarnings() {
    try {
      const env = await providerApi.getEarnings()
      const d = env.data
      earnings.value = {
        withdrawable: parseFloat(d.withdrawable) || 0,
        escrow:       parseFloat(d.escrow)       || 0,
        lifetime:     parseFloat(d.lifetime)     || 0,
      }
    } catch {}
  }

  async function fetchReviews() {
    try {
      const env = await providerApi.getReviews()
      reviews.value = (env.data || []).map(r => ({
        id:           String(r.id),
        customerName: r.customer_name || 'Anonymous',
        rating:       parseInt(r.rating),
        comment:      r.comment || '',
        date:         r.created_at ? r.created_at.split('T')[0] : '',
        service:      r.service_title || '',
      }))
    } catch {}
  }

  async function fetchAnalytics() {
    try {
      const env = await providerApi.getAnalytics()
      monthlyStats.value = (env.data || []).map(s => ({
        month:    s.month,
        jobs:     parseInt(s.jobs_count) || 0,
        earnings: parseFloat(s.earnings) || 0,
      }))
    } catch {}
  }

  async function fetchSettings() {
    try {
      const env = await providerApi.getSettings()
      const d = env.data
      settings.value = {
        maxRadius:     d.max_radius     || 25,
        notifications: d.notifications  || 'In-App Push',
      }
    } catch {}
  }

  async function saveSettings(updates) {
    Object.assign(settings.value, updates)
    showToast('Settings saved successfully.')
    try {
      await providerApi.updateSettings({
        max_radius:    updates.maxRadius,
        notifications: updates.notifications,
      })
    } catch {}
  }

  async function requestWithdrawal() {
    showToast('Withdrawal request submitted.')
    try {
      await providerApi.requestWithdrawal()
      await fetchEarnings()
    } catch {}
  }

  /* ── Bootstrap (called once after login / page refresh) ── */

  async function bootstrap() {
    await Promise.all([fetchProfile(), fetchJobs(), fetchAvailability(), fetchEarnings(), fetchReviews(), fetchAnalytics(), fetchSettings()])
    // Set default active chat to the first active job
    const active = jobs.value.find(j => !['closed', 'rejected'].includes(j.status))
    if (active) await fetchMessages(active.id)
  }

  /* ── Mutating actions (local-first; API sync is best-effort) ── */

  async function updateProfile(updates) {
    Object.assign(profile.value, updates)
    showToast('Profile updated successfully.')
    try {
      await providerApi.updateProfile({
        business_name: updates.name,
        bio:           updates.bio,
        address:       updates.location,
        base_rate:     updates.baseRate,
        phone:         updates.phone,
        email:         updates.email,
      })
    } catch {}
  }

  async function toggleCategory(catId) {
    const idx = selectedCategoryIds.value.indexOf(catId)
    if (idx === -1) selectedCategoryIds.value.push(catId)
    else            selectedCategoryIds.value.splice(idx, 1)
    try {
      await providerApi.updateCategories(selectedCategoryIds.value)
    } catch {
      // revert on API failure
      const revert = selectedCategoryIds.value.indexOf(catId)
      if (revert === -1) selectedCategoryIds.value.push(catId)
      else               selectedCategoryIds.value.splice(revert, 1)
    }
  }

  async function submitKyc(file) {
    kyc.value.status      = 'submitted'
    kyc.value.fileName    = file.name
    kyc.value.submittedAt = new Date().toISOString()
    showToast('Your new KYC document has been submitted for admin review.')
    try {
      const form = new FormData()
      form.append('document', file)
      await providerApi.uploadKyc(form)
    } catch {}
  }

  async function acceptRequest(requestId) {
    const req = jobRequests.value.find(r => r.id === String(requestId))
    if (!req) return
    // Optimistic: move from requests → jobs immediately
    jobRequests.value = jobRequests.value.filter(r => r.id !== req.id)
    const now = new Date().toISOString()
    jobs.value.unshift({
      id:              req.id,
      ticketRef:       `FX-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName:    req.customerName,
      address:         req.address,
      service:         req.service,
      scheduledAt:     req.scheduledAt,
      status:          'accepted',
      initialEstimate: req.offeredRate,
      labourCost:      null,
      materialsCost:   null,
      finalCost:       null,
      costNote:        '',
      timestamps:      { accepted: now },
    })
    showToast(`Job from ${req.customerName} accepted.`)
    try {
      await providerApi.acceptJob(requestId)
      await fetchJobs()
    } catch {}
  }

  async function rejectRequest(requestId) {
    const req = jobRequests.value.find(r => r.id === String(requestId))
    if (!req) return
    jobRequests.value = jobRequests.value.filter(r => r.id !== req.id)
    showToast(`Job from ${req.customerName} declined.`, 'danger')
    try {
      await providerApi.rejectJob(requestId)
    } catch {}
  }

  async function advanceJobStatus(jobId, newStatus) {
    const job = jobs.value.find(j => j.id === String(jobId))
    if (!job) return
    job.status = newStatus
    job.timestamps = { ...job.timestamps, [newStatus]: new Date().toISOString() }
    try {
      await providerApi.updateJobStatus(jobId, newStatus)
      await fetchJobs()
    } catch {}
  }

  async function submitFinalCost(jobId, labourCost, materialsCost, note) {
    const job = jobs.value.find(j => j.id === String(jobId))
    if (job) {
      job.labourCost    = labourCost
      job.materialsCost = materialsCost
      job.finalCost     = labourCost + materialsCost
      job.costNote      = note
      job.status        = 'cost_pending'
      job.timestamps    = { ...job.timestamps, cost_pending: new Date().toISOString() }
    }
    showToast('Final cost submitted for customer confirmation.')
    try {
      await providerApi.submitFinalCost(jobId, { labour_cost: labourCost, materials_cost: materialsCost, note })
      await fetchJobs()
    } catch {}
  }

  async function toggleReservedDate(dateKey) {
    const isReserved = availability.value.reservedDates.includes(dateKey)
    if (isReserved) {
      availability.value.reservedDates = availability.value.reservedDates.filter(d => d !== dateKey)
    } else {
      availability.value.reservedDates.push(dateKey)
    }
    try {
      const entry = availabilityEntries.value.find(e => e.blocked_date === dateKey)
      if (entry) {
        await providerApi.deleteAvailability(entry.id)
      } else {
        await providerApi.addAvailability(dateKey)
      }
      await fetchAvailability()
    } catch {}
  }

  async function setAvailabilityMode(mode) {
    availability.value.mode = mode
    showToast(`Availability mode set to: ${mode}`)
    try {
      await providerApi.updateProfile({ availability_mode: mode })
    } catch {}
  }

  async function sendMessage(text) {
    if (!activeChatJobId.value || !text.trim()) return
    const now = new Date()
    chatMessages.value.push({
      sender: 'provider',
      text,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
    try {
      await providerApi.sendMessage(activeChatJobId.value, text)
      await fetchMessages(activeChatJobId.value)
    } catch {}
  }

  /* ── Computed ── */

  const pendingRequestCount = computed(() => jobRequests.value.filter(r => r.status === 'requested').length)
  const activeJobCount      = computed(() => jobs.value.filter(j => !['closed', 'rejected'].includes(j.status)).length)
  const completedJobCount   = computed(() => jobs.value.filter(j => j.status === 'closed').length)
  const averageRating       = computed(() => {
    if (!reviews.value.length) return 0
    return reviews.value.reduce((s, r) => s + r.rating, 0) / reviews.value.length
  })
  const upcomingItems = computed(() => {
    const reqs = jobRequests.value
      .filter(r => r.status === 'requested')
      .map(r => ({ id: r.id, customerName: r.customerName, service: r.service, scheduledAt: r.scheduledAt, status: 'requested' }))
    const active = jobs.value
      .filter(j => j.status !== 'closed')
      .map(j => ({ id: j.id, customerName: j.customerName, service: j.service, scheduledAt: j.scheduledAt, status: j.status }))
    return [...reqs, ...active].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
  })

  return {
    profile, allCategories, selectedCategoryIds,
    kyc, jobRequests, jobs, TICKET_STEPS,
    availability, earnings, settings, chatMessages, activeChatJobId, activeChat,
    reviews, monthlyStats, toasts,
    pendingRequestCount, activeJobCount, completedJobCount, averageRating, upcomingItems,
    showToast, bootstrap,
    fetchProfile, fetchJobs, fetchAvailability, fetchMessages,
    fetchEarnings, fetchReviews, fetchAnalytics, fetchSettings,
    updateProfile, toggleCategory, submitKyc, saveSettings, requestWithdrawal,
    acceptRequest, rejectRequest, advanceJobStatus, submitFinalCost,
    toggleReservedDate, setAvailabilityMode, sendMessage,
  }
})
