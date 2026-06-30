<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useAuthStore } from '@/stores/auth'

const bookingStore = useBookingStore()
const authStore    = useAuthStore()
const { user }     = storeToRefs(authStore)

onMounted(async () => {
  if (!bookingStore.bookings.length) await bookingStore.loadBookings()
  if (!bookingStore.reviews.length) await bookingStore.loadReviews()
})

const activeTab = ref('about')
const editing = ref(false)
const toast = ref('')
let backup = null
let toastTimer = null

function profileFromUser(u) {
  return {
    fullName:     u?.full_name  || '',
    username:     u?.username   || '',
    email:        u?.email      || '',
    phone:        u?.phone      || '',
    bio:          u?.bio        || '',
    accountStatus:'Active',
    joinDate:     u?.created_at ? new Date(u.created_at).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }) : '',
    lastLogin:    '',
    address:      u?.address    || '',
    city:         u?.city       || '',
    state:        u?.state      || '',
    postcode:     u?.postcode   || '',
    addressNotes: u?.address_notes || '',
  }
}

const profile = reactive(profileFromUser(user.value))

// Keep profile in sync if auth.user is set after this component mounts
// (e.g. fetchMe resolves asynchronously on first page load)
watch(user, (u) => {
  if (!editing.value) Object.assign(profile, profileFromUser(u))
}, { immediate: false })

const tabs = [
  { key: 'about', label: 'About', code: 'ABT' },
  { key: 'address', label: 'Address', code: 'ADR' },
  { key: 'account', label: 'Account Details', code: 'ACC' },
]

const initials = computed(() =>
  profile.fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

const displayName = computed(() => profile.fullName || 'FixIt Customer')
const usernameLabel = computed(() => profile.username ? `@${profile.username}` : '@customer')
const addressSummary = computed(() => {
  const parts = [profile.address, profile.city, profile.state, profile.postcode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Address not recorded'
})

const profileCompleteness = computed(() => {
  const fields = [
    profile.fullName,
    profile.username,
    profile.email,
    profile.phone,
    profile.bio,
    profile.address,
    profile.city,
    profile.state,
    profile.postcode,
  ]
  const completed = fields.filter((field) => String(field || '').trim()).length
  return Math.round((completed / fields.length) * 100)
})

const completedBookings = computed(() =>
  bookingStore.bookings.filter((booking) => ['cost_pending', 'closed', 'reviewed'].includes(booking.status)).length,
)

const cancelledBookings = computed(() =>
  bookingStore.bookings.filter((booking) => booking.status === 'cancelled').length,
)

const trustLevel = computed(() => {
  if (completedBookings.value >= 6) return 'Trusted'
  if (completedBookings.value >= 3) return 'Established'
  return 'Standard'
})

const favoriteServices = computed(() => {
  const counts = new Map()
  bookingStore.bookings.forEach((booking) => {
    const service = booking.category_name || 'General Service'
    counts.set(service, (counts.get(service) || 0) + 1)
  })
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([service, count]) => ({ service, count }))
})

const favoriteServiceText = computed(() =>
  favoriteServices.value.length
    ? favoriteServices.value.map((item) => `${item.service} (${item.count})`).join(', ')
    : 'No favourites yet',
)

const aboutDetails = computed(() => [
  { code: 'NM', label: 'Full Name', key: 'fullName', value: displayValue(profile.fullName), editable: true },
  { code: 'UN', label: 'Username', value: usernameLabel.value },
  { code: 'EM', label: 'Email', value: displayValue(profile.email) },
  { code: 'PH', label: 'Phone Number', key: 'phone', value: displayValue(profile.phone), editable: true },
  { code: 'ST', label: 'Account Status', value: profile.accountStatus, badge: 'success' },
  { code: 'JD', label: 'Join Date', value: displayValue(profile.joinDate) },
  { code: 'LL', label: 'Last Login', value: displayValue(profile.lastLogin) },
])

const accountDetails = computed(() => [
  { code: 'ID', label: 'Customer ID', value: user.value?.id ? `CUS-${String(user.value.id).padStart(4, '0')}` : '—' },
  { code: 'ST', label: 'Account Status', value: profile.accountStatus, badge: 'success' },
  { code: 'TB', label: 'Total Bookings', value: bookingStore.bookings.length },
  { code: 'CB', label: 'Completed Bookings', value: completedBookings.value },
  { code: 'CN', label: 'Cancelled Bookings', value: cancelledBookings.value },
  { code: 'RV', label: 'Reviews Submitted', value: bookingStore.reviews.length },
  { code: 'TR', label: 'Trust Level', value: trustLevel.value, badge: 'info' },
])

const activityItems = computed(() => {
  const bookingActivity = bookingStore.bookings
    .slice()
    .sort((a, b) => new Date(b.created_at || b.scheduled_at) - new Date(a.created_at || a.scheduled_at))
    .slice(0, 4)
    .map((booking) => ({
      title: activityTitle(booking.status),
      description: `${booking.category_name || 'Service'} with ${booking.provider_name || 'provider'} - #FX-${String(booking.id).padStart(4, '0')}`,
      time: formatDate(booking.created_at || booking.scheduled_at),
    }))

  const reviewActivity = bookingStore.reviews.slice(0, 2).map((review) => ({
    title: 'Review submitted',
    description: `${review.rating} stars for ${review.provider_name || 'provider'}`,
    time: formatDate(review.created_at),
  }))

  return [...reviewActivity, ...bookingActivity].slice(0, 3)
})

function activityTitle(status) {
  const labels = {
    requested: 'Booking created',
    accepted: 'Booking accepted',
    in_progress: 'Booking in progress',
    cost_pending: 'Final cost confirmation pending',
    closed: 'Booking completed',
    reviewed: 'Review submitted',
    cancelled: 'Booking cancelled',
  }
  return labels[status] || 'Booking updated'
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const normalized = String(value).includes(' ') ? String(value).replace(' ', 'T') : value
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function displayValue(value, fallback = 'Not recorded') {
  const text = String(value || '').trim()
  return text || fallback
}

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}

function editProfile() {
  backup = { ...profile }
  editing.value = true
  toast.value = ''
}

function saveProfile() {
  editing.value = false
  backup = null
  showToast('Profile updated.')
}

function cancelProfile() {
  if (backup) Object.assign(profile, backup)
  editing.value = false
  backup = null
}
</script>

<template>
  <div class="profile-reference-page">
    <header class="profile-page-heading">
      <div>
        <h2>My Profile</h2>
        <p>FixIt Customer Portal | Manage your details, address, and activity.</p>
      </div>

      <div class="profile-page-actions">
        <span v-if="toast" class="profile-toast">{{ toast }}</span>
        <template v-if="editing">
          <button class="profile-secondary-button" type="button" @click="cancelProfile">Cancel</button>
          <button class="profile-primary-button" type="button" @click="saveProfile">Save Profile</button>
        </template>
        <button v-else class="profile-primary-button" type="button" @click="editProfile">
          Edit Profile
        </button>
      </div>
    </header>

    <section class="profile-reference-layout">
      <aside class="profile-identity-card">
        <div class="profile-identity-accent"></div>
        <div class="profile-identity-body">
          <div class="profile-picture-frame">
            <span class="profile-avatar">{{ initials || 'FC' }}</span>
          </div>

          <div class="profile-identity-copy">
            <span class="profile-eyebrow">Customer profile</span>
            <h3>{{ displayName }}</h3>
            <span>{{ usernameLabel }}</span>
          </div>

          <div class="profile-sidebar-meta">
            <span>Customer</span>
            <span class="is-success">Active</span>
            <span>{{ trustLevel }}</span>
          </div>

          <div class="profile-mini-stats">
            <div>
              <strong>{{ bookingStore.bookings.length }}</strong>
              <span>Total bookings</span>
            </div>
            <div>
              <strong>{{ completedBookings }}</strong>
              <span>Completed</span>
            </div>
          </div>

          <div class="profile-completion-card" :style="{ '--profile-progress': `${profileCompleteness}%` }">
            <div class="profile-completion-head">
              <span>Profile strength</span>
              <strong>{{ profileCompleteness }}%</strong>
            </div>
            <div class="profile-progress-track">
              <span class="profile-progress-fill"></span>
            </div>
            <p>Complete contact and address details so bookings move faster.</p>
          </div>

          <div class="profile-sidebar-list">
            <div class="profile-sidebar-item">
              <span>Email</span>
              <strong>{{ displayValue(profile.email) }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Phone</span>
              <strong>{{ displayValue(profile.phone) }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Primary Address</span>
              <strong>{{ addressSummary }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Favourite Services</span>
              <strong>{{ favoriteServiceText }}</strong>
            </div>
          </div>
        </div>
      </aside>

      <article class="profile-details-card">
        <nav class="profile-switcher" aria-label="Profile details">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="profile-switcher-tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <span>{{ tab.code }}</span>
            {{ tab.label }}
          </button>
        </nav>

        <div v-if="activeTab === 'about'" class="profile-info-table">
          <div
            v-for="item in aboutDetails"
            :key="item.label"
            class="profile-info-table-row"
          >
            <span class="profile-info-icon">{{ item.code }}</span>
            <div>
              <span>{{ item.label }}</span>
              <input
                v-if="editing && item.editable"
                v-model="profile[item.key]"
                class="profile-field-control"
              />
              <strong v-else-if="item.badge" class="profile-status-badge" :class="item.badge">
                {{ item.value }}
              </strong>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">BIO</span>
            <div>
              <span>Short Bio</span>
              <textarea
                v-if="editing"
                v-model="profile.bio"
                class="profile-field-control"
                rows="3"
              ></textarea>
              <strong v-else>{{ displayValue(profile.bio, 'No bio available') }}</strong>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'address'" class="profile-info-table">
          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">ADR</span>
            <div>
              <span>Main Service Address</span>
              <input v-if="editing" v-model="profile.address" class="profile-field-control" />
              <strong v-else>{{ displayValue(profile.address) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">CT</span>
            <div>
              <span>City</span>
              <input v-if="editing" v-model="profile.city" class="profile-field-control" />
              <strong v-else>{{ displayValue(profile.city) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">ST</span>
            <div>
              <span>State</span>
              <input v-if="editing" v-model="profile.state" class="profile-field-control" />
              <strong v-else>{{ displayValue(profile.state) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">PC</span>
            <div>
              <span>Postcode</span>
              <input v-if="editing" v-model="profile.postcode" class="profile-field-control" />
              <strong v-else>{{ displayValue(profile.postcode) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">NT</span>
            <div>
              <span>Address Notes</span>
              <textarea v-if="editing" v-model="profile.addressNotes" class="profile-field-control" rows="3"></textarea>
              <strong v-else>{{ displayValue(profile.addressNotes, 'No address notes available') }}</strong>
            </div>
          </div>
        </div>

        <div v-else class="profile-info-table">
          <div
            v-for="item in accountDetails"
            :key="item.label"
            class="profile-info-table-row"
          >
            <span class="profile-info-icon">{{ item.code }}</span>
            <div>
              <span>{{ item.label }}</span>
              <strong v-if="item.badge" class="profile-status-badge" :class="item.badge">
                {{ item.value }}
              </strong>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </article>

      <article class="profile-insights-card">
        <section class="profile-insights-panel">
          <div class="profile-section-head">
            <div>
              <span>ACTIVITY</span>
              <h3>Customer Activity</h3>
            </div>
          </div>

          <div v-if="activityItems.length" class="profile-activity-list">
            <div v-for="item in activityItems" :key="`${item.title}-${item.time}`" class="profile-activity-item">
              <span class="profile-activity-dot"></span>
              <div class="profile-activity-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
                <small>{{ item.time }}</small>
              </div>
            </div>
          </div>

          <div v-else class="profile-empty-state">No customer activity yet.</div>
        </section>

        <section class="profile-insights-panel">
          <div class="profile-section-head">
            <div>
              <span>SUMMARY</span>
              <h3>Customer Account Summary</h3>
            </div>
          </div>

          <div class="profile-scope-list">
            <div class="profile-scope-item">
              <span>Booking Summary</span>
              <strong>{{ completedBookings }} completed of {{ bookingStore.bookings.length }} total bookings</strong>
            </div>
            <div class="profile-scope-item">
              <span>Favourite Service Categories</span>
              <strong>{{ favoriteServiceText }}</strong>
            </div>
            <div class="profile-scope-item">
              <span>Account Status</span>
              <strong>{{ profile.accountStatus }}</strong>
            </div>
            <div class="profile-scope-item">
              <span>Trust Level</span>
              <strong>{{ trustLevel }}</strong>
            </div>
          </div>
        </section>
      </article>
    </section>
  </div>
</template>

<style scoped>
.profile-reference-page {
  display: grid;
  gap: 14px;
}

.profile-page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 0 2px 4px;
}

.profile-page-heading h2 {
  color: var(--color-text);
  font-size: clamp(1.4rem, 1.8vw, 1.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
}

.profile-page-heading p {
  margin-top: 4px;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.profile-page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.profile-primary-button,
.profile-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 999px;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.14);
  transition: var(--transition-smooth);
}

.profile-primary-button {
  border: 1px solid var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary), #1d4ed8);
  color: #fff;
}

.profile-primary-button:hover,
.profile-secondary-button:hover {
  transform: translateY(-1px);
}

.profile-secondary-button {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-card) 88%, transparent);
  color: var(--color-text);
  box-shadow: none;
}

.profile-toast {
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.profile-reference-layout {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
}

.profile-identity-card,
.profile-details-card,
.profile-insights-card {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 20px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--color-card) 94%, #ffffff 6%), color-mix(in srgb, var(--color-card) 88%, rgba(37, 99, 235, 0.08))),
    var(--color-card);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.profile-identity-card {
  position: relative;
  grid-column: 1;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  align-self: stretch;
}

.profile-details-card {
  grid-column: 2;
  grid-row: 1;
}

.profile-identity-accent {
  height: 82px;
  background:
    radial-gradient(circle at 24% 24%, rgba(34, 211, 238, 0.46), transparent 28%),
    radial-gradient(circle at 78% 10%, rgba(96, 165, 250, 0.6), transparent 34%),
    linear-gradient(135deg, #1d4ed8, #0f172a 72%);
}

.profile-identity-body {
  display: grid;
  align-content: start;
  gap: 10px;
  flex: 1;
  justify-items: center;
  margin-top: -34px;
  padding: 0 16px 16px;
  text-align: center;
}

.profile-picture-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  border: 5px solid var(--color-card);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.16));
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  color: #fff;
  font-size: 1.18rem;
  font-weight: 900;
}

.profile-identity-copy h3 {
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.profile-identity-copy span,
.profile-sidebar-item span,
.profile-info-table-row span,
.profile-section-head span,
.profile-activity-copy small,
.profile-scope-item span {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.profile-eyebrow {
  display: inline-flex;
  margin-bottom: 4px;
  color: var(--color-primary) !important;
}

.profile-sidebar-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
}

.profile-sidebar-meta span,
.profile-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 23px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--color-border) 78%, var(--color-primary));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-background) 82%, var(--color-card));
  color: var(--color-text);
  font-size: 0.7rem;
  font-weight: 850;
}

.profile-mini-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.profile-mini-stats div,
.profile-completion-card,
.profile-sidebar-item {
  border: 1px solid color-mix(in srgb, var(--color-border) 82%, var(--color-primary));
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-background) 76%, var(--color-card));
}

.profile-mini-stats div {
  display: grid;
  gap: 2px;
  padding: 9px;
  text-align: center;
}

.profile-mini-stats strong {
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 950;
}

.profile-mini-stats span,
.profile-completion-head span,
.profile-completion-card p {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.profile-completion-card {
  display: grid;
  gap: 7px;
  width: 100%;
  padding: 10px;
  text-align: left;
}

.profile-completion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-completion-head strong {
  color: var(--color-primary);
  font-size: 1rem;
  font-weight: 950;
}

.profile-progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-border) 72%, transparent);
}

.profile-progress-fill {
  display: block;
  width: var(--profile-progress);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), #14b8a6);
}

.profile-completion-card p {
  display: none;
}

.profile-sidebar-meta .is-success,
.profile-status-badge.success {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success, #16a34a);
}

.profile-status-badge.info {
  border-color: rgba(37, 99, 235, 0.3);
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
}

.profile-sidebar-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.profile-sidebar-item {
  display: grid;
  gap: 4px;
  padding: 9px;
  text-align: left;
}

.profile-sidebar-item strong,
.profile-info-table-row strong,
.profile-activity-copy strong,
.profile-scope-item strong {
  color: var(--color-text);
  font-size: 0.8rem;
  line-height: 1.32;
  overflow-wrap: anywhere;
}

.profile-switcher {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 12px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
  background: color-mix(in srgb, var(--color-background) 62%, transparent);
}

.profile-switcher-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 5px 10px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-card) 78%, transparent);
  color: var(--color-muted);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 850;
  white-space: nowrap;
}

.profile-switcher-tab span,
.profile-info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-primary);
  font-size: 0.58rem;
  font-weight: 900;
}

.profile-switcher-tab span {
  width: 28px;
  height: 22px;
}

.profile-switcher-tab.active {
  color: var(--color-primary);
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(37, 99, 235, 0.11);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.profile-info-table {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
}

.profile-info-table-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: flex-start;
  min-height: 70px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 14px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-card) 92%, transparent), color-mix(in srgb, var(--color-background) 74%, transparent));
  transition: var(--transition-smooth);
}

.profile-info-table-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--color-border));
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.profile-info-table-row.wide {
  grid-column: 1 / -1;
}

.profile-info-icon {
  width: 32px;
  height: 32px;
  margin-top: 1px;
}

.profile-info-table-row > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.profile-field-control {
  width: 100%;
  min-height: 36px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 12px;
  outline: none;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  font-size: 0.84rem;
}

textarea.profile-field-control {
  resize: vertical;
}

.profile-field-control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.profile-insights-card {
  display: grid;
  grid-column: 2;
  grid-row: 2;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
  align-items: start;
  gap: 12px;
  padding: 14px;
}

.profile-insights-panel {
  min-width: 0;
}

.profile-section-head {
  margin-bottom: 8px;
}

.profile-section-head h3 {
  margin-top: 5px;
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.profile-activity-list,
.profile-scope-list {
  display: grid;
  gap: 7px;
}

.profile-scope-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-activity-item,
.profile-scope-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-background) 80%, var(--color-card));
}

.profile-scope-item {
  grid-template-columns: 1fr;
  gap: 5px;
}

.profile-activity-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.profile-activity-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.profile-activity-copy span {
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}

.profile-empty-state {
  padding: 18px;
  border: 1px dashed color-mix(in srgb, var(--color-border) 80%, var(--color-primary));
  border-radius: var(--radius-md, 12px);
  color: var(--color-muted);
  text-align: center;
}

body.night-mode-active .profile-identity-card,
body.night-mode-active .profile-details-card,
body.night-mode-active .profile-insights-card {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--color-card) 88%, rgba(37, 99, 235, 0.16)), color-mix(in srgb, var(--color-card) 92%, #020617 8%)),
    var(--color-card);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
}

body.night-mode-active .profile-info-table-row,
body.night-mode-active .profile-mini-stats div,
body.night-mode-active .profile-completion-card,
body.night-mode-active .profile-sidebar-item,
body.night-mode-active .profile-activity-item,
body.night-mode-active .profile-scope-item {
  background: color-mix(in srgb, var(--color-card) 72%, #020617 28%);
}

@media (max-width: 1280px) {
  .profile-info-table {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .profile-reference-layout {
    grid-template-columns: 1fr;
  }

  .profile-identity-card,
  .profile-details-card,
  .profile-insights-card {
    grid-column: auto;
    grid-row: auto;
  }

  .profile-identity-card {
    max-width: none;
  }

  .profile-insights-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-page-heading,
  .profile-page-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-info-table {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .profile-info-table-row.wide {
    grid-column: auto;
  }

  .profile-switcher {
    padding: 12px;
  }

  .profile-mini-stats {
    grid-template-columns: 1fr;
  }

  .profile-sidebar-list {
    grid-template-columns: 1fr;
  }

  .profile-scope-list {
    grid-template-columns: 1fr;
  }
}
</style>
