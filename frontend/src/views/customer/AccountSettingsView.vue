<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'
import PasswordField from '@/components/PasswordField.vue'

const auth = useAuthStore()
const bookingStore = useBookingStore()
const router = useRouter()
const { user } = storeToRefs(auth)

const activeTab = ref('preferences')
const saving = ref(false)
const message = ref('')
const messageType = ref('success')
const passwordMessage = ref('')
const passwordMessageType = ref('error')
const logoutBusy = ref(false)

const preferenceKey = computed(() => `fixit-customer-settings-${user.value?.id || 'guest'}`)
const defaultSettings = {
  language: 'English',
  timezone: 'Asia/Kuala_Lumpur',
  theme: localStorage.getItem('fixit-theme-mode') || (localStorage.getItem('fixit-night-mode') === '1' ? 'dark' : 'light'),
  notifications: {
    bookings: true,
    providers: true,
    messages: true,
    reviews: true,
    payments: true,
  },
  privacy: {
    shareLocation: true,
    showProfileToProviders: true,
  },
}

const settings = reactive(structuredClone(defaultSettings))
const passwordForm = reactive({ current: '', next: '', confirm: '' })

const tabs = [
  { key: 'preferences', label: 'Account Preferences' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'security', label: 'Privacy & Security' },
  { key: 'danger', label: 'Danger Zone' },
]

const profile = computed(() => ({
  name: user.value?.full_name || 'Customer',
  username: user.value?.username || 'Not set',
  email: user.value?.email || 'Not set',
  phone: user.value?.phone || 'Not set',
  role: user.value?.role || 'customer',
  id: user.value?.id ? `CUS-${String(user.value.id).padStart(4, '0')}` : 'Not available',
  status: 'Active',
}))

const summary = computed(() => ({
  total: bookingStore.bookings.length,
  active: bookingStore.activeBookingsCount,
  completed: bookingStore.completedJobsCount,
  reviews: bookingStore.reviews.length,
}))

function showMessage(text, type = 'success') {
  message.value = text
  messageType.value = type
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 2600)
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey.value) || '{}')
    Object.assign(settings, structuredClone(defaultSettings), saved)
    settings.notifications = { ...defaultSettings.notifications, ...(saved.notifications || {}) }
    settings.privacy = { ...defaultSettings.privacy, ...(saved.privacy || {}) }
  } catch {
    Object.assign(settings, structuredClone(defaultSettings))
  }
}

function applyTheme() {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
  document.body.classList.toggle('night-mode-active', dark)
  localStorage.setItem('fixit-theme-mode', settings.theme)
  localStorage.setItem('fixit-night-mode', dark ? '1' : '0')
  window.dispatchEvent(new CustomEvent('fixit-theme-change', { detail: { theme: settings.theme, dark } }))
}

async function saveSettings() {
  saving.value = true
  try {
    localStorage.setItem(preferenceKey.value, JSON.stringify(settings))
    applyTheme()
    showMessage('Settings saved.')
  } catch (error) {
    showMessage(error.message || 'Unable to save settings.', 'error')
  } finally {
    saving.value = false
  }
}

function updatePassword() {
  passwordMessage.value = ''
  if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
    passwordMessageType.value = 'error'
    passwordMessage.value = 'Enter your current password and the new password twice.'
    return
  }
  if (passwordForm.next.length < 8) {
    passwordMessageType.value = 'error'
    passwordMessage.value = 'New password must contain at least 8 characters.'
    return
  }
  if (passwordForm.next !== passwordForm.confirm) {
    passwordMessageType.value = 'error'
    passwordMessage.value = 'New password and confirmation do not match.'
    return
  }
  passwordMessageType.value = 'error'
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

watch(preferenceKey, loadSettings, { immediate: true })
watch(() => settings.theme, applyTheme)

onMounted(async () => {
  if (!bookingStore.bookings.length) await bookingStore.loadBookings()
  if (!bookingStore.reviews.length) await bookingStore.loadReviews()
})
</script>

<template>
  <div class="settings-view">
    <header class="settings-hero">
      <div>
        <span>Account control center</span>
        <h2>Customer Settings</h2>
        <p>Manage your preferences, notifications, theme, and login security.</p>
      </div>
      <div class="settings-profile-card">
        <strong>{{ profile.name }}</strong>
        <small>@{{ profile.username }} · {{ profile.email }}</small>
        <span class="badge-ui badge-ui-success">{{ profile.status }}</span>
      </div>
    </header>

    <p v-if="message" class="settings-message" :class="messageType">{{ message }}</p>

    <nav class="settings-tabs" aria-label="Customer settings sections">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="settings-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'preferences'" class="settings-grid">
      <article class="settings-card">
        <h3>Personal Information</h3>
        <div class="info-grid">
          <div><span>Full name</span><strong>{{ profile.name }}</strong></div>
          <div><span>Username</span><strong>@{{ profile.username }}</strong></div>
          <div><span>Email</span><strong>{{ profile.email }}</strong></div>
          <div><span>Phone</span><strong>{{ profile.phone }}</strong></div>
          <div><span>Role</span><strong>{{ profile.role }}</strong></div>
          <div><span>Account ID</span><strong>{{ profile.id }}</strong></div>
        </div>
      </article>

      <article class="settings-card">
        <h3>Preferences</h3>
        <label class="settings-field">
          <span>Language</span>
          <select v-model="settings.language" class="form-select-control">
            <option>English</option>
            <option>Bahasa Melayu</option>
            <option>Arabic</option>
          </select>
        </label>
        <label class="settings-field">
          <span>Timezone</span>
          <select v-model="settings.timezone" class="form-select-control">
            <option value="Asia/Kuala_Lumpur">Malaysia Time (GMT+8)</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
      </article>

      <article class="settings-card area-full">
        <h3>Booking Summary</h3>
        <div class="summary-grid">
          <div><span>Total bookings</span><strong>{{ summary.total }}</strong></div>
          <div><span>Active bookings</span><strong>{{ summary.active }}</strong></div>
          <div><span>Completed jobs</span><strong>{{ summary.completed }}</strong></div>
          <div><span>Reviews given</span><strong>{{ summary.reviews }}</strong></div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'notifications'" class="settings-card">
      <h3>Notifications</h3>
      <label v-for="(_, key) in settings.notifications" :key="key" class="toggle-row">
        <span>{{ key.replace(/([A-Z])/g, ' $1') }}</span>
        <input v-model="settings.notifications[key]" type="checkbox" />
      </label>
    </section>

    <section v-else-if="activeTab === 'appearance'" class="settings-card">
      <h3>Appearance</h3>
      <div class="theme-options">
        <label v-for="option in ['light', 'dark', 'system']" :key="option" :class="{ selected: settings.theme === option }">
          <input v-model="settings.theme" type="radio" :value="option" />
          <span>{{ option }}</span>
        </label>
      </div>
    </section>

    <section v-else-if="activeTab === 'security'" class="settings-grid">
      <article class="settings-card">
        <h3>Privacy and Security</h3>
        <label class="toggle-row">
          <span>Share saved location with provider after booking</span>
          <input v-model="settings.privacy.shareLocation" type="checkbox" />
        </label>
        <label class="toggle-row">
          <span>Show profile contact details to assigned providers</span>
          <input v-model="settings.privacy.showProfileToProviders" type="checkbox" />
        </label>
      </article>

      <article class="settings-card">
        <h3>Password and Login Security</h3>
        <PasswordField v-model="passwordForm.current" label="Current password" input-class="form-input-element-control" />
        <PasswordField v-model="passwordForm.next" label="New password" autocomplete="new-password" input-class="form-input-element-control" />
        <PasswordField v-model="passwordForm.confirm" label="Confirm new password" autocomplete="new-password" input-class="form-input-element-control" />
        <p v-if="passwordMessage" class="settings-message inline" :class="passwordMessageType">{{ passwordMessage }}</p>
        <button class="btn-ui btn-ui-primary" type="button" @click="updatePassword">Update password</button>
      </article>
    </section>

    <section v-else class="settings-card danger-card">
      <h3>Danger Zone</h3>
      <p class="muted">Account deletion is not performed from this UI because it would affect bookings, payments, reviews, and support records.</p>
      <button class="btn-ui btn-ui-outline" type="button" :disabled="logoutBusy" @click="logout">
        {{ logoutBusy ? 'Logging out...' : 'Logout' }}
      </button>
    </section>

    <div class="settings-actions">
      <button class="btn-ui btn-ui-primary" type="button" :disabled="saving" @click="saveSettings">
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: grid;
  gap: 18px;
}
.settings-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 22px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
}
.settings-hero span,
.settings-card h3 + span,
.info-grid span,
.summary-grid span,
.settings-field span {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 850;
  text-transform: uppercase;
}
.settings-hero h2 {
  margin-top: 5px;
  color: var(--color-text);
  font-size: 1.55rem;
}
.settings-hero p {
  margin-top: 6px;
  color: var(--color-muted);
}
.settings-profile-card {
  display: grid;
  gap: 5px;
  min-width: 230px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
.settings-profile-card strong,
.info-grid strong,
.summary-grid strong {
  color: var(--color-text);
}
.settings-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.settings-tab {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-muted);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.settings-tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.settings-card {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
}
.settings-card h3 {
  color: var(--color-text);
  font-size: 1.05rem;
}
.area-full {
  grid-column: 1 / -1;
}
.info-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.info-grid div,
.summary-grid div {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}
.settings-field {
  display: grid;
  gap: 6px;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text);
  text-transform: capitalize;
}
.toggle-row input,
.theme-options input {
  accent-color: var(--color-primary);
}
.theme-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.theme-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
  color: var(--color-text);
  font-weight: 800;
  text-transform: capitalize;
}
.theme-options label.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.settings-message {
  margin: 0;
  padding: 11px 13px;
  border-radius: var(--radius-md);
  font-weight: 800;
}
.settings-message.success {
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}
.settings-message.error {
  border: 1px solid rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}
.settings-message.inline {
  padding: 9px 11px;
  font-size: 0.84rem;
}
.danger-card {
  border-color: rgba(239, 68, 68, 0.5);
}
.settings-actions {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 860px) {
  .settings-hero,
  .settings-grid,
  .info-grid,
  .summary-grid,
  .theme-options {
    grid-template-columns: 1fr;
  }
  .area-full {
    grid-column: auto;
  }
  .settings-actions {
    justify-content: stretch;
  }
  .settings-actions .btn-ui {
    width: 100%;
  }
}
</style>
