<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderStore } from '@/stores/provider'
import { useAuthStore } from '@/stores/auth'
import providerApi from '@/services/providerApi'
import PasswordField from '@/components/PasswordField.vue'

const store = useProviderStore()
const auth = useAuthStore()
const router = useRouter()

const preferencesKey = 'fixit-provider-preferences'

function loadSavedPreferences() {
  try {
    return JSON.parse(localStorage.getItem(preferencesKey) || '{}')
  } catch {
    return {}
  }
}

const savedPreferences = loadSavedPreferences()

const activeSection = ref('profile')
const maxRadius = ref(store.settings.maxRadius)
const notifications = ref(store.settings.notifications)
const phone = ref(store.profile.phone)
const email = ref(store.profile.email)
const kycFileInput = ref(null)
const selectedKycFile = ref(null)
const kycError = ref('')
const kycSuccess = ref('')
const kycUploading = ref(false)
const kycDragActive = ref(false)
const logoutBusy = ref(false)
const saving = ref(false)
const settingsMessage = ref('')
const passwordMessage = ref('')
const passwordForm = reactive({ current: '', next: '', confirm: '' })
const providerPreferences = reactive({
  theme: savedPreferences.theme || localStorage.getItem('fixit-provider-theme-mode') || (localStorage.getItem('fixit-provider-theme') || 'light'),
  bookingRequests: savedPreferences.bookingRequests ?? true,
  jobUpdates: savedPreferences.jobUpdates ?? true,
  customerMessages: savedPreferences.customerMessages ?? true,
  reviews: savedPreferences.reviews ?? true,
  paymentUpdates: savedPreferences.paymentUpdates ?? true,
})

const allowedKycTypes = ['application/pdf', 'image/jpeg', 'image/png']
const allowedKycExtensions = ['pdf', 'jpg', 'jpeg', 'png']
const maxKycSize = 5 * 1024 * 1024

const settingsSections = [
  { key: 'profile', label: 'Profile and reach', helper: 'Contact details, radius, and marketplace visibility' },
  { key: 'notifications', label: 'Notifications', helper: 'Delivery channel and provider alerts' },
  { key: 'workspace', label: 'Workspace', helper: 'Theme, schedule mode, and calendar shortcuts' },
  { key: 'security', label: 'Security and KYC', helper: 'Login safety and verification documents' },
]

const notificationOptions = [
  { key: 'bookingRequests', label: 'Booking requests', description: 'New customer requests and repeat booking activity.' },
  { key: 'jobUpdates', label: 'Job updates', description: 'Status changes, cost confirmation, and schedule movement.' },
  { key: 'customerMessages', label: 'Customer messages', description: 'Unread messages from active job tickets.' },
  { key: 'reviews', label: 'Reviews', description: 'New ratings, comments, and customer feedback.' },
  { key: 'paymentUpdates', label: 'Payment updates', description: 'Final-cost approval, Stripe payment, and payout signals.' },
]

const themeOptions = [
  { value: 'light', label: 'Light', description: 'Bright workspace for daytime jobs.' },
  { value: 'dark', label: 'Dark', description: 'Lower glare for late shifts.' },
  { value: 'system', label: 'System', description: 'Follow this device preference.' },
]

watch(
  () => store.settings,
  (settings) => {
    maxRadius.value = settings.maxRadius
    notifications.value = settings.notifications
  },
  { immediate: true, deep: true },
)

watch(
  () => store.profile,
  (profile) => {
    phone.value = profile.phone
    email.value = profile.email
  },
  { immediate: true, deep: true },
)

const selectedCategoryCount = computed(() => store.selectedCategoryIds.length)
const primaryCategory = computed(() => {
  const selected = store.allCategories.find((category) => store.selectedCategoryIds.includes(category.id))
  return selected?.title || 'No category selected'
})
const visibilityLabel = computed(() => (store.kyc.status === 'verified' || store.kyc.status === 'approved' ? 'Live' : 'Limited'))
const availabilityModeLabel = computed(() => {
  const mode = store.availability.mode || 'manual'
  if (mode === 'auto') return 'Auto matching'
  if (mode === 'offline') return 'Offline'
  return 'Manual control'
})
const kycStatusLabel = computed(() => {
  const status = String(store.kyc.status || 'pending').toLowerCase()
  if (status === 'verified' || status === 'approved') return 'Verified'
  if (status === 'rejected') return 'Rejected'
  if (status === 'suspended') return 'Suspended'
  if (status === 'submitted') return 'Submitted'
  return 'Pending Review'
})
const kycStatusClass = computed(() => {
  const status = String(store.kyc.status || 'pending').toLowerCase()
  if (status === 'verified' || status === 'approved') return 'success'
  if (status === 'rejected' || status === 'suspended') return 'danger'
  return 'warning'
})
const kycDocumentName = computed(() => store.kyc.fileName || 'No document uploaded')
const kycDocumentType = computed(() => {
  if (!store.kyc.fileName) return 'Not available'
  const extension = store.kyc.fileName.split('.').pop()?.toUpperCase()
  return extension ? `${extension} document` : 'Document'
})
const kycUploadDate = computed(() => {
  if (!store.kyc.submittedAt) return 'Not submitted yet'
  const date = new Date(store.kyc.submittedAt)
  if (Number.isNaN(date.getTime())) return store.kyc.submittedAt
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
})
const enabledNotificationCount = computed(() =>
  notificationOptions.filter((option) => providerPreferences[option.key]).length
)
const profileHealthItems = computed(() => [
  Boolean(store.profile.name),
  Boolean(store.profile.location),
  Boolean(phone.value),
  Boolean(email.value),
  selectedCategoryCount.value > 0,
  kycStatusClass.value === 'success',
])
const profileHealthScore = computed(() => {
  const complete = profileHealthItems.value.filter(Boolean).length
  return Math.round((complete / profileHealthItems.value.length) * 100)
})
const activeSectionMeta = computed(() =>
  settingsSections.find((section) => section.key === activeSection.value) || settingsSections[0]
)

function persistProviderPreferences() {
  localStorage.setItem(preferencesKey, JSON.stringify({
    theme: providerPreferences.theme,
    bookingRequests: providerPreferences.bookingRequests,
    jobUpdates: providerPreferences.jobUpdates,
    customerMessages: providerPreferences.customerMessages,
    reviews: providerPreferences.reviews,
    paymentUpdates: providerPreferences.paymentUpdates,
  }))
}

function applyProviderTheme() {
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const dark = providerPreferences.theme === 'dark' || (providerPreferences.theme === 'system' && systemDark)
  localStorage.setItem('fixit-provider-theme-mode', providerPreferences.theme)
  localStorage.setItem('fixit-provider-theme', dark ? 'dark' : 'light')
  window.dispatchEvent(new CustomEvent('fixit-provider-theme-change', { detail: { theme: providerPreferences.theme, dark } }))
}

async function saveSettings() {
  saving.value = true
  settingsMessage.value = ''
  try {
    await store.saveSettings({ maxRadius: maxRadius.value, notifications: notifications.value })
    if (phone.value !== store.profile.phone || email.value !== store.profile.email) {
      await store.updateProfile({ ...store.profile, phone: phone.value, email: email.value })
    }
    persistProviderPreferences()
    applyProviderTheme()
    settingsMessage.value = 'Settings saved. Your provider workspace is updated.'
  } finally {
    saving.value = false
  }
}

watch(() => providerPreferences.theme, applyProviderTheme, { immediate: true })

function updatePassword() {
  passwordMessage.value = ''
  if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
    passwordMessage.value = 'Enter your current password and the new password twice.'
    return
  }
  if (passwordForm.next.length < 8) {
    passwordMessage.value = 'New password must contain at least 8 characters.'
    return
  }
  if (passwordForm.next !== passwordForm.confirm) {
    passwordMessage.value = 'New password and confirmation do not match.'
    return
  }
  passwordMessage.value = 'Password change needs a backend endpoint before it can be completed safely.'
}

async function logout() {
  logoutBusy.value = true
  try {
    await auth.logout()
    sessionStorage.setItem('fixit_logout_toast', 'You have been logged out successfully.')
    await router.replace('/')
  } finally {
    logoutBusy.value = false
  }
}

function chooseKycFile() {
  kycFileInput.value?.click()
}

function validateKycFile(file) {
  kycError.value = ''
  kycSuccess.value = ''
  if (!file) return false
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!allowedKycTypes.includes(file.type) || !allowedKycExtensions.includes(extension)) {
    kycError.value = 'Only PDF, JPG, JPEG, or PNG files are allowed.'
    return false
  }
  if (file.size > maxKycSize) {
    kycError.value = 'The KYC document must be 5 MB or smaller.'
    return false
  }
  return true
}

function setKycFile(file) {
  if (validateKycFile(file)) selectedKycFile.value = file
  else selectedKycFile.value = null
}

function onKycFileChange(event) {
  setKycFile(event.target.files?.[0])
}

function onKycDrop(event) {
  kycDragActive.value = false
  setKycFile(event.dataTransfer.files?.[0])
}

function clearKycSelection() {
  selectedKycFile.value = null
  kycError.value = ''
  kycSuccess.value = ''
  if (kycFileInput.value) kycFileInput.value.value = ''
}

async function uploadKycDocument() {
  if (!selectedKycFile.value || !validateKycFile(selectedKycFile.value)) return
  kycUploading.value = true
  try {
    await store.submitKyc(selectedKycFile.value)
    kycSuccess.value = 'Your new KYC document has been submitted for admin review.'
    selectedKycFile.value = null
    if (kycFileInput.value) kycFileInput.value.value = ''
  } finally {
    kycUploading.value = false
  }
}

async function downloadKycDocument() {
  if (!store.kyc.fileName) return
  const blob = await providerApi.downloadKyc()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = store.kyc.fileName
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="provider-settings-page">
    <section class="settings-hero-card">
      <div class="hero-copy">
        <span class="settings-kicker">Provider controls</span>
        <h2>Settings that keep your marketplace profile sharp.</h2>
        <p>Manage reach, contact details, alerts, theme, security, and verification from one calmer workspace.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" :disabled="saving" @click="saveSettings">
            {{ saving ? 'Saving...' : 'Save all changes' }}
          </button>
          <button class="btn btn-outline hero-outline" type="button" @click="router.push('/provider/profile')">
            Edit public profile
          </button>
        </div>
      </div>

      <div class="hero-insights">
        <article>
          <span>Visibility</span>
          <strong>{{ visibilityLabel }}</strong>
          <small>{{ kycStatusLabel }}</small>
        </article>
        <article>
          <span>Radius</span>
          <strong>{{ maxRadius }} km</strong>
          <small>Customer matching area</small>
        </article>
        <article>
          <span>Profile health</span>
          <strong>{{ profileHealthScore }}%</strong>
          <small>{{ selectedCategoryCount }} categories selected</small>
        </article>
      </div>
    </section>

    <p v-if="settingsMessage" class="settings-message success">{{ settingsMessage }}</p>

    <div class="settings-workspace">
      <aside class="settings-sidebar">
        <div class="settings-sidebar-card">
          <span class="settings-kicker">Settings menu</span>
          <button
            v-for="section in settingsSections"
            :key="section.key"
            class="settings-nav-button"
            :class="{ active: activeSection === section.key }"
            type="button"
            @click="activeSection = section.key"
          >
            <strong>{{ section.label }}</strong>
            <small>{{ section.helper }}</small>
          </button>
        </div>

        <div class="settings-sidebar-card profile-score-card">
          <span class="settings-kicker">Readiness</span>
          <strong>{{ profileHealthScore }}% complete</strong>
          <div class="score-track">
            <span :style="{ width: `${profileHealthScore}%` }"></span>
          </div>
          <p class="muted">Complete contact, category, and KYC details for better customer trust.</p>
        </div>
      </aside>

      <main class="settings-content">
        <div class="section-title-row">
          <div>
            <span class="settings-kicker">{{ activeSectionMeta.label }}</span>
            <h3>{{ activeSectionMeta.helper }}</h3>
          </div>
          <button class="btn btn-primary btn-sm" type="button" :disabled="saving" @click="saveSettings">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <section v-if="activeSection === 'profile'" class="settings-panel">
          <div class="panel-grid two-columns">
            <article class="panel-card profile-summary">
              <div class="card-heading">
                <span class="settings-kicker">Marketplace snapshot</span>
                <h4>{{ store.profile.name || 'Provider profile' }}</h4>
                <p>These details shape what customers see before booking.</p>
              </div>

              <div class="summary-list">
                <div>
                  <span>Business name</span>
                  <strong>{{ store.profile.name || 'Not set' }}</strong>
                </div>
                <div>
                  <span>Service location</span>
                  <strong>{{ store.profile.location || 'Not set' }}</strong>
                </div>
                <div>
                  <span>Primary category</span>
                  <strong>{{ primaryCategory }}</strong>
                </div>
                <div>
                  <span>Verification</span>
                  <strong>{{ kycStatusLabel }}</strong>
                </div>
              </div>
            </article>

            <article class="panel-card">
              <div class="card-heading">
                <span class="settings-kicker">Editable settings</span>
                <h4>Reach and contact</h4>
                <p>Keep these simple and current so customers can trust the profile.</p>
              </div>

              <div class="settings-form-grid">
                <label class="form-field">
                  <span>Maximum service radius</span>
                  <input class="form-control" type="number" min="1" max="100" v-model.number="maxRadius" />
                  <small>Recommended: 10 to 30 km for reliable arrival times.</small>
                </label>

                <label class="form-field">
                  <span>Main notification channel</span>
                  <select class="form-control" v-model="notifications">
                    <option>In-App Push</option>
                    <option>Email Only</option>
                    <option>SMS + In-App</option>
                  </select>
                  <small>This is saved to the provider settings API.</small>
                </label>

                <label class="form-field">
                  <span>Contact phone</span>
                  <input class="form-control" v-model="phone" />
                </label>

                <label class="form-field">
                  <span>Contact email</span>
                  <input class="form-control" type="email" v-model="email" />
                </label>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeSection === 'notifications'" class="settings-panel">
          <article class="panel-card">
            <div class="card-heading split-heading">
              <div>
                <span class="settings-kicker">Alert center</span>
                <h4>Notification preferences</h4>
                <p>{{ enabledNotificationCount }} of {{ notificationOptions.length }} provider alerts are currently enabled.</p>
              </div>
              <span class="settings-pill">{{ notifications }}</span>
            </div>

            <div class="notification-grid">
              <label
                v-for="option in notificationOptions"
                :key="option.key"
                class="notification-card"
                :class="{ active: providerPreferences[option.key] }"
              >
                <span class="toggle-copy">
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </span>
                <input v-model="providerPreferences[option.key]" type="checkbox" />
              </label>
            </div>
          </article>
        </section>

        <section v-else-if="activeSection === 'workspace'" class="settings-panel">
          <div class="panel-grid two-columns">
            <article class="panel-card">
              <div class="card-heading">
                <span class="settings-kicker">Appearance</span>
                <h4>Workspace theme</h4>
                <p>Choose the look of the provider portal on this device.</p>
              </div>

              <div class="theme-choice-grid">
                <label
                  v-for="option in themeOptions"
                  :key="option.value"
                  class="theme-choice"
                  :class="{ active: providerPreferences.theme === option.value }"
                >
                  <input v-model="providerPreferences.theme" type="radio" :value="option.value" />
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </label>
              </div>
            </article>

            <article class="panel-card schedule-card">
              <div class="card-heading">
                <span class="settings-kicker">Availability</span>
                <h4>Schedule control</h4>
                <p>Availability changes continue through the existing calendar workflow.</p>
              </div>

              <div class="schedule-mode">
                <span class="settings-pill warning">{{ availabilityModeLabel }}</span>
                <div>
                  <strong>{{ store.availability.reservedDates.length }} reserved days</strong>
                  <small class="muted">Blocked dates are managed from My Schedule.</small>
                </div>
              </div>

              <button class="btn btn-outline btn-w-full" type="button" @click="router.push('/provider/availability')">
                Manage schedule
              </button>
            </article>
          </div>
        </section>

        <section v-else class="settings-panel">
          <div class="panel-grid two-columns">
            <article class="panel-card security-card">
              <div class="card-heading">
                <span class="settings-kicker">Security</span>
                <h4>Password and login</h4>
                <p>Password validation stays local until the backend endpoint is available.</p>
              </div>

              <div class="password-stack">
                <PasswordField v-model="passwordForm.current" label="Current password" input-class="form-control" />
                <PasswordField v-model="passwordForm.next" label="New password" autocomplete="new-password" input-class="form-control" />
                <PasswordField v-model="passwordForm.confirm" label="Confirm new password" autocomplete="new-password" input-class="form-control" />
              </div>

              <p v-if="passwordMessage" class="settings-message inline warning">{{ passwordMessage }}</p>

              <div class="security-actions">
                <button class="btn btn-primary" type="button" @click="updatePassword">Update password</button>
                <button class="btn btn-outline" type="button" :disabled="logoutBusy" @click="logout">
                  {{ logoutBusy ? 'Logging out...' : 'Logout' }}
                </button>
              </div>
            </article>

            <article class="panel-card kyc-card">
              <div class="card-heading split-heading">
                <div>
                  <span class="settings-kicker">Verification documents</span>
                  <h4>KYC status</h4>
                  <p>Documents are reviewed by FixIt administrators before full visibility is granted.</p>
                </div>
                <span class="kyc-status-pill" :class="`is-${kycStatusClass}`">{{ kycStatusLabel }}</span>
              </div>

              <div class="kyc-details-grid">
                <div>
                  <span>Current document</span>
                  <strong>{{ kycDocumentName }}</strong>
                </div>
                <div>
                  <span>Upload date</span>
                  <strong>{{ kycUploadDate }}</strong>
                </div>
                <div>
                  <span>Document type</span>
                  <strong>{{ kycDocumentType }}</strong>
                </div>
              </div>

              <button v-if="store.kyc.fileName" class="btn btn-outline btn-sm" type="button" @click="downloadKycDocument">
                Download current KYC
              </button>

              <div
                class="kyc-upload-dropzone"
                :class="{ active: kycDragActive, invalid: kycError }"
                @dragover.prevent="kycDragActive = true"
                @dragleave.prevent="kycDragActive = false"
                @drop.prevent="onKycDrop"
              >
                <input
                  ref="kycFileInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  @change="onKycFileChange"
                />
                <div>
                  <strong>Upload or replace KYC document</strong>
                  <span>PDF, JPG, JPEG, or PNG. Maximum size: 5 MB.</span>
                </div>
                <button class="btn btn-outline btn-sm" type="button" @click="chooseKycFile">Browse file</button>
              </div>

              <div v-if="selectedKycFile" class="kyc-selected-file">
                <span>Selected file</span>
                <strong>{{ selectedKycFile.name }}</strong>
              </div>
              <p v-if="kycError" class="settings-message inline danger">{{ kycError }}</p>
              <p v-if="kycSuccess" class="settings-message inline success">{{ kycSuccess }}</p>

              <div class="kyc-upload-actions">
                <button class="btn btn-outline" type="button" :disabled="!selectedKycFile || kycUploading" @click="clearKycSelection">Cancel</button>
                <button class="btn btn-primary" type="button" :disabled="!selectedKycFile || kycUploading" @click="uploadKycDocument">
                  {{ kycUploading ? 'Uploading...' : 'Upload document' }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.provider-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-kicker {
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-hero-card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
  gap: 26px;
  align-items: stretch;
  padding: 26px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
  border-radius: 24px;
  background:
    radial-gradient(circle at 12% 0%, rgba(20, 184, 166, 0.28), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--color-card) 88%, #ffffff 12%), color-mix(in srgb, var(--color-card) 82%, rgba(37, 99, 235, 0.12))),
    var(--color-card);
  box-shadow: 0 26px 70px -48px rgba(37, 99, 235, 0.65);
}

.settings-hero-card::after {
  content: '';
  position: absolute;
  right: -72px;
  top: -92px;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.16);
  filter: blur(10px);
  pointer-events: none;
}

.hero-copy,
.hero-insights {
  position: relative;
  z-index: 1;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.hero-copy h2 {
  max-width: 720px;
  color: var(--color-text);
  font-size: clamp(1.8rem, 3vw, 3.35rem);
  line-height: 0.98;
  letter-spacing: -0.055em;
  font-weight: 950;
}

.hero-copy p {
  max-width: 620px;
  color: var(--color-muted);
  font-size: 0.98rem;
  line-height: 1.65;
  font-weight: 650;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.hero-outline {
  background: color-mix(in srgb, var(--color-card) 82%, transparent);
}

.hero-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  align-content: end;
}

.hero-insights article {
  min-height: 128px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--color-card) 82%, rgba(37, 99, 235, 0.08));
}

.hero-insights span,
.summary-list span,
.kyc-details-grid span,
.kyc-selected-file span {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.075em;
  text-transform: uppercase;
}

.hero-insights strong {
  color: var(--color-text);
  font-size: 1.52rem;
  line-height: 1;
  letter-spacing: -0.035em;
}

.hero-insights small {
  color: var(--color-muted);
  font-weight: 700;
  line-height: 1.35;
}

.settings-message {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-weight: 800;
  line-height: 1.45;
}

.settings-message.inline {
  padding: 10px 12px;
  font-size: 0.84rem;
}

.settings-message.success {
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.settings-message.warning {
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.settings-message.danger {
  border: 1px solid rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.settings-workspace {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.settings-sidebar {
  position: sticky;
  top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-sidebar-card,
.settings-panel,
.panel-card {
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-card);
  box-shadow: 0 18px 48px -42px rgba(15, 23, 42, 0.5);
}

.settings-sidebar-card {
  padding: 14px;
}

.settings-nav-button {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 9px;
  padding: 13px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: var(--ease);
}

.settings-nav-button:hover,
.settings-nav-button.active {
  border-color: color-mix(in srgb, var(--color-primary) 34%, var(--color-border));
  background: rgba(37, 99, 235, 0.08);
}

.settings-nav-button strong {
  font-size: 0.9rem;
  font-weight: 900;
}

.settings-nav-button small,
.profile-score-card p,
.card-heading p,
.form-field small,
.toggle-copy small,
.theme-choice small,
.kyc-upload-dropzone span {
  color: var(--color-muted);
  line-height: 1.45;
}

.profile-score-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-score-card > strong {
  color: var(--color-text);
  font-size: 1.1rem;
}

.score-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.score-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-card);
}

.section-title-row h3 {
  margin-top: 4px;
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.35;
}

.settings-panel {
  padding: 18px;
}

.panel-grid {
  display: grid;
  gap: 16px;
}

.panel-grid.two-columns {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.panel-card {
  padding: 20px;
}

.card-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.split-heading {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.card-heading h4 {
  color: var(--color-text);
  font-size: 1.18rem;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.summary-list,
.settings-form-grid,
.kyc-details-grid {
  display: grid;
  gap: 12px;
}

.summary-list,
.settings-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-list > div,
.kyc-details-grid > div,
.kyc-selected-file {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background);
}

.summary-list strong,
.kyc-details-grid strong,
.kyc-selected-file strong {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.94rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.form-field > span {
  color: var(--color-text);
  font-size: 0.82rem;
  font-weight: 850;
}

.notification-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.notification-card,
.theme-choice {
  display: flex;
  gap: 12px;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-background);
  cursor: pointer;
  transition: var(--ease);
}

.notification-card {
  align-items: center;
  justify-content: space-between;
  padding: 14px;
}

.notification-card.active,
.theme-choice.active {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background: rgba(37, 99, 235, 0.08);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-copy strong,
.theme-choice strong {
  color: var(--color-text);
  font-size: 0.92rem;
}

.notification-card input,
.theme-choice input {
  flex: 0 0 auto;
  accent-color: var(--color-primary);
}

.theme-choice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
  gap: 10px;
}

.theme-choice {
  flex-direction: column;
  position: relative;
  align-items: flex-start;
  padding: 14px;
  min-height: 162px;
}

.theme-choice input {
  align-self: center;
  margin: 0 0 6px;
}

.settings-pill,
.kyc-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
  font-size: 0.74rem;
  font-weight: 900;
  white-space: nowrap;
}

.settings-pill.warning {
  background: rgba(245, 158, 11, 0.14);
  color: var(--color-warning);
}

.schedule-card {
  display: flex;
  flex-direction: column;
}

.schedule-mode {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: auto;
  padding: 14px;
  border-radius: 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.schedule-mode div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.schedule-mode strong {
  color: var(--color-text);
}

.schedule-card .btn {
  margin-top: 18px;
}

.password-stack {
  display: grid;
  gap: 12px;
}

:deep(.password-field-shell) {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

:deep(.password-field-shell > span:first-child) {
  color: var(--color-text);
  font-size: 0.82rem;
  font-weight: 850;
}

.security-actions,
.kyc-upload-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.kyc-status-pill.is-success { background: rgba(34, 197, 94, 0.14); color: var(--color-success); }
.kyc-status-pill.is-warning { background: rgba(245, 158, 11, 0.14); color: var(--color-warning); }
.kyc-status-pill.is-danger { background: rgba(239, 68, 68, 0.14); color: var(--color-danger); }

.kyc-details-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.kyc-upload-dropzone {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  padding: 16px;
  border: 1px dashed color-mix(in srgb, var(--color-primary) 48%, var(--color-border));
  border-radius: 18px;
  background: rgba(37, 99, 235, 0.06);
}

.kyc-upload-dropzone.active {
  border-color: var(--color-primary);
  background: rgba(37, 99, 235, 0.12);
}

.kyc-upload-dropzone.invalid {
  border-color: var(--color-danger);
  background: rgba(239, 68, 68, 0.08);
}

.kyc-upload-dropzone input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.kyc-upload-dropzone div {
  display: grid;
  gap: 5px;
}

.kyc-upload-dropzone strong {
  color: var(--color-text);
}

.kyc-selected-file {
  margin-top: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .settings-nav-button,
  .notification-card,
  .theme-choice {
    transition: none;
  }
}

@media (max-width: 1180px) {
  .settings-hero-card,
  .settings-workspace,
  .panel-grid.two-columns {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    position: static;
  }

  .settings-sidebar-card:first-child {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .settings-sidebar-card:first-child .settings-kicker {
    grid-column: 1 / -1;
  }

  .settings-nav-button {
    margin-top: 0;
  }
}

@media (max-width: 760px) {
  .settings-hero-card,
  .settings-panel,
  .panel-card {
    border-radius: 16px;
    padding: 16px;
  }

  .hero-insights,
  .settings-sidebar-card:first-child,
  .summary-list,
  .settings-form-grid,
  .notification-grid,
  .theme-choice-grid,
  .kyc-details-grid,
  .kyc-upload-dropzone {
    grid-template-columns: 1fr;
  }

  .section-title-row,
  .split-heading,
  .schedule-mode {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions .btn,
  .section-title-row .btn,
  .security-actions .btn,
  .kyc-upload-actions .btn {
    width: 100%;
  }
}
</style>

