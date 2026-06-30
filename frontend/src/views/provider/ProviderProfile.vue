<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useProviderStore } from '@/stores/provider'
import { useAuthStore } from '@/stores/auth'

const store = useProviderStore()
const auth = useAuthStore()

const activeTab = ref('about')
const editing = ref(false)
const toast = ref('')
let backup = null
let toastTimer = null

const form = reactive({
  businessName: '',
  phone: '',
  email: '',
  personalPhone: '',
  bio: '',
  location: '',
  coverageAreas: '',
  city: '',
  state: '',
  postcode: '',
  addressNotes: '',
  baseRate: 0,
  availabilityMode: 'manual',
})

const tabs = [
  { key: 'about', label: 'About', code: 'ABT' },
  { key: 'address', label: 'Address', code: 'ADR' },
  { key: 'account', label: 'Account Details', code: 'ACC' },
]

watch(
  [() => store.profile, () => store.availability.mode],
  () => {
    if (!editing.value) hydrateForm()
  },
  { immediate: true, deep: true },
)

function hydrateForm() {
  form.businessName    = store.profile.name          || ''
  form.phone           = store.profile.phone         || ''
  form.email           = store.profile.email         || ''
  form.personalPhone   = store.profile.personalPhone || ''
  form.bio             = store.profile.bio           || ''
  form.location        = store.profile.location      || ''
  form.coverageAreas   = store.profile.coverageAreas || store.profile.location || ''
  form.city            = store.profile.city          || ''
  form.state           = store.profile.state         || ''
  form.postcode        = store.profile.postcode      || ''
  form.addressNotes    = store.profile.addressNotes  || ''
  form.baseRate        = Number(store.profile.baseRate || 0)
  form.availabilityMode = store.availability.mode   || 'manual'
}

const selectedCategories = computed(() =>
  store.allCategories.filter((category) => store.selectedCategoryIds.includes(category.id)),
)

const serviceCategoryText = computed(() =>
  selectedCategories.value.length
    ? selectedCategories.value.map((category) => category.title).join(', ')
    : 'No service categories selected',
)

const displayName = computed(() => form.businessName || 'FixIt Provider')
const usernameLabel = computed(() => auth.user?.username ? `@${auth.user.username}` : '@provider')
const coverageSummary = computed(() => displayValue(form.coverageAreas || form.location, 'Coverage not recorded'))

const profileInitials = computed(() =>
  displayName.value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

const verificationStatus = computed(() => {
  const status = store.kyc.status || 'pending'
  if (status === 'verified' || status === 'approved') return 'Verified'
  if (status === 'submitted') return 'Pending'
  if (status === 'rejected') return 'Suspended'
  return 'Pending'
})

const verificationClass = computed(() => {
  if (verificationStatus.value === 'Verified') return 'success'
  if (verificationStatus.value === 'Suspended') return 'danger'
  return 'warning'
})

const marketplaceStatus = computed(() => {
  if (verificationStatus.value === 'Verified') return 'Live'
  if (verificationStatus.value === 'Suspended') return 'Suspended'
  return 'Pending Verification'
})

const profileCompleteness = computed(() => {
  const fields = [
    form.businessName,
    form.phone,
    form.email,
    form.bio,
    form.location,
    form.coverageAreas,
    Number(form.baseRate || 0) > 0 ? form.baseRate : '',
    selectedCategories.value.length ? 'service-categories' : '',
    store.kyc.fileName || verificationStatus.value === 'Verified' ? 'kyc' : '',
  ]
  const completed = fields.filter((field) => String(field || '').trim()).length
  return Math.round((completed / fields.length) * 100)
})

const accountStatus = computed(() =>
  verificationStatus.value === 'Suspended' ? 'Suspended' : 'Active',
)

const kycDocumentStatus = computed(() => {
  if (store.kyc.fileName && verificationStatus.value === 'Verified') return 'Approved'
  if (store.kyc.fileName) return 'Submitted'
  return 'Not submitted'
})

const completedJobs = computed(() =>
  store.jobs.filter((job) => ['completed', 'cost_pending', 'closed', 'reviewed'].includes(job.status)).length,
)

const averageRatingLabel = computed(() => {
  const rating = Number(store.averageRating || 0)
  return rating > 0 ? rating.toFixed(1) : '0.0'
})

const lifetimeEarnings = computed(() =>
  `RM ${Number(store.earnings.lifetime || 0).toLocaleString()}`,
)

const aboutDetails = computed(() => [
  { code: 'BN', label: 'Provider / Business Name', key: 'businessName', value: displayValue(form.businessName), editable: true },
  { code: 'UN', label: 'Username', value: usernameLabel.value },
  { code: 'EM', label: 'Work Email', value: displayValue(form.email) },
  { code: 'PH', label: 'Work Phone', key: 'phone', value: displayValue(form.phone), editable: true },
  { code: 'PP', label: 'Personal Phone', value: displayValue(form.personalPhone) },
  { code: 'BR', label: 'Base Rate', key: 'baseRate', value: `RM ${Number(form.baseRate || 0).toLocaleString()}`, editable: true, type: 'number' },
  { code: 'ST', label: 'Account Status', value: accountStatus.value, badge: accountStatus.value === 'Suspended' ? 'danger' : 'success' },
  { code: 'KY', label: 'Verification Status', value: verificationStatus.value, badge: verificationClass.value },
  { code: 'JD', label: 'Join Date', value: auth.user?.created_at ? formatDate(auth.user.created_at) : 'Not recorded' },
  { code: 'LL', label: 'Last Login', value: 'Not recorded' },
])

const accountDetails = computed(() => [
  { code: 'ID', label: 'Provider ID', value: auth.user?.id ? `PRO-${String(auth.user.id).padStart(4, '0')}` : 'Not recorded' },
  { code: 'VF', label: 'Verification Status', value: verificationStatus.value, badge: verificationClass.value },
  { code: 'KY', label: 'KYC Document Status', value: kycDocumentStatus.value },
  { code: 'BR', label: 'Base Rate', value: `RM ${Number(form.baseRate || 0).toLocaleString()}` },
  { code: 'AV', label: 'Availability Mode', value: availabilityModeLabel(form.availabilityMode), badge: 'info' },
  { code: 'CJ', label: 'Completed Jobs', value: completedJobs.value },
  { code: 'RT', label: 'Average Rating', value: `${averageRatingLabel.value} / 5` },
  { code: 'RV', label: 'Total Reviews', value: store.reviews.length },
  { code: 'RM', label: 'Lifetime Earnings', value: lifetimeEarnings.value },
])

const providerActivity = computed(() => {
  const jobEvents = store.jobs
    .slice()
    .sort((a, b) => new Date(b.timestamps?.cost_pending || b.timestamps?.completed || b.scheduledAt) - new Date(a.timestamps?.cost_pending || a.timestamps?.completed || a.scheduledAt))
    .slice(0, 4)
    .map((job) => ({
      title: providerActivityTitle(job.status),
      description: `${job.service || 'Service'} for ${job.customerName || 'customer'} - #${job.ticketRef || `FX-${String(job.id).padStart(4, '0')}`}`,
      time: formatDate(job.timestamps?.cost_pending || job.timestamps?.completed || job.scheduledAt),
    }))

  const reviewEvents = store.reviews.slice(0, 2).map((review) => ({
    title: 'Review received',
    description: `${review.rating} stars from ${review.customerName || 'customer'}`,
    time: formatDate(review.date),
  }))

  const verificationEvent = {
    title: 'Verification status updated',
    description: `Marketplace status is ${marketplaceStatus.value}`,
    time: store.kyc.submittedAt ? formatDate(store.kyc.submittedAt) : 'Not submitted yet',
  }

  return [verificationEvent, ...reviewEvents, ...jobEvents].slice(0, 3)
})

function providerActivityTitle(status) {
  const labels = {
    accepted: 'Job accepted',
    en_route: 'Job scheduled',
    in_progress: 'Work in progress',
    completed: 'Job completed',
    cost_pending: 'Final cost submitted',
    closed: 'Job closed',
    reviewed: 'Review received',
  }
  return labels[status] || 'Provider activity updated'
}

function availabilityModeLabel(mode) {
  const labels = {
    auto: 'Auto-confirm',
    manual: 'Manual',
    offline: 'Offline',
  }
  return labels[mode] || 'Manual'
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
  backup = { ...form }
  editing.value = true
  toast.value = ''
}

function cancelProfile() {
  if (backup) Object.assign(form, backup)
  editing.value = false
  backup = null
}

async function saveProfile() {
  await store.updateProfile({
    ...store.profile,
    name: form.businessName,
    phone: form.phone,
    bio: form.bio,
    location: form.location,
    baseRate: Number(form.baseRate || 0),
    coverageAreas: form.coverageAreas,
    city: form.city,
    state: form.state,
    postcode: form.postcode,
    addressNotes: form.addressNotes,
  })

  if (store.availability.mode !== form.availabilityMode) {
    await store.setAvailabilityMode(form.availabilityMode)
  }

  editing.value = false
  backup = null
  showToast('Profile updated.')
}
</script>

<template>
  <div class="provider-profile-reference-page">
    <header class="profile-page-heading">
      <div>
        <h2>My Profile</h2>
        <p>FixIt Provider Portal | Manage business details, coverage, and marketplace status.</p>
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
            <img v-if="store.profile.photoUrl" :src="store.profile.photoUrl" alt="Provider profile" />
            <span v-else class="profile-avatar">{{ profileInitials || 'FP' }}</span>
          </div>

          <div class="profile-identity-copy">
            <span class="profile-eyebrow">Provider profile</span>
            <h3>{{ displayName }}</h3>
            <span>{{ usernameLabel }}</span>
          </div>

          <div class="profile-sidebar-meta">
            <span>Service Provider</span>
            <span :class="`is-${verificationClass}`">{{ verificationStatus }}</span>
            <span>{{ marketplaceStatus }}</span>
          </div>

          <div class="profile-mini-stats">
            <div>
              <strong>{{ completedJobs }}</strong>
              <span>Completed jobs</span>
            </div>
            <div>
              <strong>{{ averageRatingLabel }}</strong>
              <span>Average rating</span>
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
            <p>Complete business, coverage, and verification details to improve marketplace trust.</p>
          </div>

          <div class="profile-sidebar-list">
            <div class="profile-sidebar-item">
              <span>Work Email</span>
              <strong>{{ displayValue(form.email) }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Work Phone</span>
              <strong>{{ displayValue(form.phone) }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Coverage</span>
              <strong>{{ coverageSummary }}</strong>
            </div>
            <div class="profile-sidebar-item">
              <span>Services</span>
              <strong>{{ serviceCategoryText }}</strong>
            </div>
          </div>
        </div>
      </aside>

      <article class="profile-details-card">
        <nav class="profile-switcher" aria-label="Provider profile details">
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
          <div v-for="item in aboutDetails" :key="item.label" class="profile-info-table-row">
            <span class="profile-info-icon">{{ item.code }}</span>
            <div>
              <span>{{ item.label }}</span>
              <input
                v-if="editing && item.editable"
                v-model="form[item.key]"
                :type="item.type || 'text'"
                min="0"
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
              <span>Professional Bio</span>
              <textarea v-if="editing" v-model="form.bio" class="profile-field-control" rows="3"></textarea>
              <strong v-else>{{ form.bio || 'No professional bio available' }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">SRV</span>
            <div>
              <span>Service Categories</span>
              <div class="service-category-list" :class="{ editable: editing }">
                <button
                  v-for="category in store.allCategories"
                  :key="category.id"
                  type="button"
                  :class="{ selected: store.selectedCategoryIds.includes(category.id) }"
                  :disabled="!editing"
                  @click="store.toggleCategory(category.id)"
                >
                  {{ category.title }}
                </button>
              </div>
              <strong class="service-category-summary">{{ serviceCategoryText }}</strong>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'address'" class="profile-info-table">
          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">LOC</span>
            <div>
              <span>Main Service Location</span>
              <input v-if="editing" v-model="form.location" class="profile-field-control" />
              <strong v-else>{{ displayValue(form.location) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">COV</span>
            <div>
              <span>Coverage Areas</span>
              <input v-if="editing" v-model="form.coverageAreas" class="profile-field-control" />
              <strong v-else>{{ coverageSummary }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">CT</span>
            <div>
              <span>City</span>
              <input v-if="editing" v-model="form.city" class="profile-field-control" />
              <strong v-else>{{ displayValue(form.city) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">ST</span>
            <div>
              <span>State</span>
              <input v-if="editing" v-model="form.state" class="profile-field-control" />
              <strong v-else>{{ displayValue(form.state) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row">
            <span class="profile-info-icon">PC</span>
            <div>
              <span>Postcode</span>
              <input v-if="editing" v-model="form.postcode" class="profile-field-control" />
              <strong v-else>{{ displayValue(form.postcode) }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">NT</span>
            <div>
              <span>Availability Area Notes</span>
              <textarea v-if="editing" v-model="form.addressNotes" class="profile-field-control" rows="3"></textarea>
              <strong v-else>{{ displayValue(form.addressNotes, 'No availability area notes available') }}</strong>
            </div>
          </div>
        </div>

        <div v-else class="profile-info-table">
          <div v-for="item in accountDetails" :key="item.label" class="profile-info-table-row">
            <span class="profile-info-icon">{{ item.code }}</span>
            <div>
              <span>{{ item.label }}</span>
              <strong v-if="item.badge" class="profile-status-badge" :class="item.badge">
                {{ item.value }}
              </strong>
              <strong v-else>{{ item.value }}</strong>
            </div>
          </div>

          <div class="profile-info-table-row wide">
            <span class="profile-info-icon">MOD</span>
            <div>
              <span>Availability Mode</span>
              <select v-if="editing" v-model="form.availabilityMode" class="profile-field-control">
                <option value="auto">Auto-confirm</option>
                <option value="manual">Manual</option>
                <option value="offline">Offline</option>
              </select>
              <strong v-else>{{ availabilityModeLabel(form.availabilityMode) }}</strong>
            </div>
          </div>
        </div>
      </article>

      <article class="profile-insights-card">
        <section class="profile-insights-panel">
          <div class="profile-section-head">
            <div>
              <span>ACTIVITY</span>
              <h3>Provider Activity</h3>
            </div>
          </div>

          <div class="profile-activity-list">
            <div v-for="item in providerActivity" :key="`${item.title}-${item.time}`" class="profile-activity-item">
              <span class="profile-activity-dot"></span>
              <div class="profile-activity-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
                <small>{{ item.time }}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="profile-insights-panel">
          <div class="profile-section-head">
            <div>
              <span>SUMMARY</span>
              <h3>Provider Business Summary</h3>
            </div>
          </div>

          <div class="profile-scope-list">
            <div class="profile-scope-item">
              <span>Services Offered</span>
              <strong>{{ serviceCategoryText }}</strong>
            </div>
            <div class="profile-scope-item">
              <span>Coverage Areas</span>
              <strong>{{ coverageSummary }}</strong>
            </div>
            <div class="profile-scope-item">
              <span>Availability Mode</span>
              <strong>{{ availabilityModeLabel(form.availabilityMode) }}</strong>
            </div>
            <div class="profile-scope-item">
              <span>Verification Status</span>
              <strong>{{ verificationStatus }}</strong>
            </div>
          </div>
        </section>
      </article>
    </section>
  </div>
</template>

<style scoped>
.provider-profile-reference-page {
  display: grid;
  gap: 18px;
}

.profile-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.profile-page-heading h2 {
  color: var(--color-text);
  font-size: 1.55rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.profile-page-heading p {
  margin-top: 4px;
  color: var(--color-muted);
  font-size: 0.86rem;
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
  padding: 9px 14px;
  cursor: pointer;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  transition: var(--ease);
}

.profile-primary-button {
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.profile-secondary-button {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
}

.profile-toast {
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.profile-reference-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.profile-identity-card,
.profile-details-card,
.profile-bottom-card {
  background: var(--color-card);
}

.profile-identity-card {
  border-right: 1px solid var(--color-border);
}

.profile-identity-accent {
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.profile-identity-body {
  display: grid;
  gap: 16px;
  justify-items: center;
  padding: 24px 18px;
  text-align: center;
}

.profile-picture-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
}

.profile-picture-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: #fff;
  font-size: 1.45rem;
  font-weight: 900;
}

.profile-identity-copy h3 {
  color: var(--color-text);
  font-size: 1.18rem;
  font-weight: 900;
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
  min-height: 26px;
  padding: 5px 9px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.7rem;
  font-weight: 850;
}

.profile-sidebar-meta .is-success,
.profile-status-badge.success {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success);
}

.profile-sidebar-meta .is-warning,
.profile-status-badge.warning {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.14);
  color: var(--color-warning);
}

.profile-sidebar-meta .is-danger,
.profile-status-badge.danger {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger);
}

.profile-status-badge.info {
  border-color: rgba(37, 99, 235, 0.3);
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
}

.profile-sidebar-list {
  display: grid;
  gap: 10px;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.profile-sidebar-item {
  display: grid;
  gap: 5px;
  text-align: left;
}

.profile-sidebar-item strong,
.profile-info-table-row strong,
.profile-activity-copy strong,
.profile-scope-item strong,
.service-category-summary {
  color: var(--color-text);
  font-size: 0.86rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.profile-switcher {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 18px 22px 0;
  border-bottom: 1px solid var(--color-border);
}

.profile-switcher-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-bottom: -1px;
  padding: 0 2px 12px;
  cursor: pointer;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 850;
  white-space: nowrap;
}

.profile-switcher-tab span,
.profile-info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 9px;
  background: rgba(37, 99, 235, 0.09);
  color: var(--color-primary);
  font-size: 0.58rem;
  font-weight: 900;
}

.profile-switcher-tab span {
  width: 32px;
  height: 26px;
}

.profile-switcher-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.profile-info-table {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-left: 1px solid var(--color-border);
  border-top: 1px solid var(--color-border);
}

.profile-info-table-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-height: 106px;
  padding: 14px 16px;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.profile-info-table-row.wide {
  grid-column: 1 / -1;
}

.profile-info-icon {
  width: 34px;
  height: 34px;
}

.profile-info-table-row > div {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.profile-field-control {
  width: 100%;
  min-height: 38px;
  padding: 9px 11px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  outline: none;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  font-size: 0.84rem;
}

textarea.profile-field-control {
  resize: vertical;
}

.service-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-category-list button {
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
}

.service-category-list button.selected {
  border-color: rgba(37, 99, 235, 0.42);
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
}

.service-category-list.editable button {
  cursor: pointer;
}

.service-category-list button:disabled {
  cursor: default;
}

.profile-reference-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 18px;
}

.profile-bottom-card {
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.profile-section-head {
  margin-bottom: 16px;
}

.profile-section-head h3 {
  margin-top: 5px;
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 900;
}

.profile-activity-list,
.profile-scope-list {
  display: grid;
  gap: 12px;
}

.profile-activity-item,
.profile-scope-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.profile-scope-item {
  grid-template-columns: 1fr;
  gap: 5px;
}

.profile-activity-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.profile-activity-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.profile-activity-copy span {
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

@media (max-width: 980px) {
  .profile-reference-layout,
  .profile-reference-bottom {
    grid-template-columns: 1fr;
  }

  .profile-identity-card {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
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
  }

  .profile-info-table-row.wide {
    grid-column: auto;
  }
}

/* Customer profile parity overrides */
.provider-profile-reference-page {
  gap: 14px;
}

.profile-page-heading {
  align-items: center;
  padding: 0 2px 4px;
}

.profile-page-heading h2 {
  font-size: clamp(1.4rem, 1.8vw, 1.75rem);
}

.profile-page-actions {
  align-items: center;
}

.profile-primary-button,
.profile-secondary-button {
  min-height: 38px;
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.14);
  transition: var(--ease, all 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.profile-primary-button {
  background: linear-gradient(135deg, var(--color-primary), #1d4ed8);
}

.profile-primary-button:hover,
.profile-secondary-button:hover {
  transform: translateY(-1px);
}

.profile-secondary-button {
  background: color-mix(in srgb, var(--color-card) 88%, transparent);
  box-shadow: none;
}

.profile-reference-layout {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
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
  border-right: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
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
  width: 78px;
  height: 78px;
  overflow: visible;
  border: 5px solid var(--color-card);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.16));
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
}

.profile-picture-frame img,
.profile-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.profile-avatar {
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  font-size: 1.18rem;
}

.profile-identity-copy h3 {
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

.profile-eyebrow {
  display: inline-flex;
  margin-bottom: 4px;
  color: var(--color-primary) !important;
}

.profile-sidebar-meta span,
.profile-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 23px;
  padding: 4px 8px;
  border-color: color-mix(in srgb, var(--color-border) 78%, var(--color-primary));
  background: color-mix(in srgb, var(--color-background) 82%, var(--color-card));
  white-space: nowrap;
  text-align: center;
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
  align-content: center;
  min-width: 0;
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
  line-height: 1.3;
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

.profile-sidebar-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 0;
  border-top: 0;
}

.profile-sidebar-item {
  gap: 4px;
  padding: 9px;
}

.profile-switcher {
  gap: 7px;
  padding: 12px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
  background: color-mix(in srgb, var(--color-background) 62%, transparent);
}

.profile-switcher-tab {
  min-height: 34px;
  margin-bottom: 0;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-card) 78%, transparent);
}

.profile-switcher-tab span {
  width: 28px;
  height: 22px;
}

.profile-switcher-tab.active {
  border-color: rgba(37, 99, 235, 0.28);
  border-bottom-color: rgba(37, 99, 235, 0.28);
  background: rgba(37, 99, 235, 0.11);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.1);
}

.profile-info-table {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border: 0;
}

.profile-info-table-row {
  align-items: flex-start;
  min-height: 70px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 14px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-card) 92%, transparent), color-mix(in srgb, var(--color-background) 74%, transparent));
  transition: var(--ease, all 0.25s cubic-bezier(0.4, 0, 0.2, 1));
}

.profile-info-table-row:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--color-border));
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.profile-info-icon {
  width: 32px;
  height: 32px;
  margin-top: 1px;
  border-radius: 10px;
}

.profile-field-control {
  border-color: color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 12px;
}

.profile-field-control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.service-category-list {
  gap: 7px;
}

.service-category-list button {
  min-height: 28px;
  padding: 5px 9px;
  border-color: color-mix(in srgb, var(--color-border) 82%, var(--color-primary));
  background: color-mix(in srgb, var(--color-background) 78%, var(--color-card));
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
  font-size: 0.95rem;
}

.profile-activity-list,
.profile-scope-list {
  gap: 7px;
}

.profile-scope-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-activity-item,
.profile-scope-item {
  gap: 8px;
  padding: 8px;
  border-color: color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-background) 80%, var(--color-card));
}

.profile-activity-dot {
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.profile-activity-copy span {
  font-size: 0.72rem;
  line-height: 1.35;
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
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  }

  .profile-insights-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-info-table {
    grid-template-columns: 1fr;
  }

  .profile-mini-stats,
  .profile-sidebar-list,
  .profile-scope-list {
    grid-template-columns: 1fr;
  }
}
</style>
