<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/authApi'
import { catalogApi } from '@/services/api'
import { usePublicTheme } from '@/composables/usePublicTheme'
import PasswordField from '@/components/PasswordField.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = usePublicTheme()
const apiStatus = ref('checking')
const accessDeniedRole = computed(() => typeof route.query.access === 'string' ? route.query.access : '')
const serverUnavailable = computed(() => route.query.server === 'unavailable')
const form = reactive({ username: '', password: '', remember: false })
const topProviders = ref([])
let statusTimer = null

const apiStatusLabel = computed(() => {
  if (apiStatus.value === 'online') return 'API connected'
  if (apiStatus.value === 'offline') return 'API offline'
  return 'Checking API'
})

async function refreshApiStatus() {
  apiStatus.value = 'checking'
  apiStatus.value = await authApi.checkConnection() ? 'online' : 'offline'
}

async function loadTopProviders() {
  try {
    const res = await catalogApi.getProviders({ sort: 'rating' })
    topProviders.value = (res.data || []).slice(0, 3)
  } catch {
    topProviders.value = []
  }
}

function providerInitials(provider) {
  return (provider.name || 'FI')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function providerRatingLabel(provider) {
  const rating = Number(provider.rating || 0)
  return rating > 0 ? rating.toFixed(1) : 'New'
}

function providerMeta(provider) {
  const service = provider.categories?.[0]?.name || 'Home service'
  return `${service} / ${provider.location || 'Nearby'}`
}

async function submit() {
  try {
    const data = await auth.login(form)
    const role = data.user.role
    const redirectParam = typeof route.query.redirect === 'string' ? route.query.redirect : null
    const destination = redirectParam && redirectParam.startsWith(`/${role}`) ? redirectParam : auth.homeForRole(role)
    await router.push(destination)
  } catch { /* Store exposes the API error. */ }
  finally {
    refreshApiStatus()
  }
}

onMounted(() => {
  refreshApiStatus()
  loadTopProviders()
  statusTimer = window.setInterval(refreshApiStatus, 15000)
  window.addEventListener('focus', refreshApiStatus)
})

onBeforeUnmount(() => {
  if (statusTimer) window.clearInterval(statusTimer)
  window.removeEventListener('focus', refreshApiStatus)
})
</script>

<template>
  <section class="auth-page login-page">
    <button class="public-theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
    <div class="auth-layout container">
    <aside class="auth-aside login-aside">
      <span class="eyebrow light"><i></i> Welcome back</span>
      <h1>Everything starts with a secure sign in.</h1>
      <p>Use your FixIt username and password to continue to your account.</p>
      <div class="aside-note provider-preview-note">
        <div class="demo-note-heading">
          <strong>Featured providers</strong>
          <small>Verified nearby</small>
        </div>
        <div v-if="topProviders.length" class="provider-preview-list">
          <article
            v-for="provider in topProviders"
            :key="provider.id"
            class="provider-preview-item"
          >
            <span class="provider-preview-avatar">{{ providerInitials(provider) }}</span>
            <span class="provider-preview-copy">
              <strong>{{ provider.name }}</strong>
              <em class="provider-preview-meta">{{ providerMeta(provider) }}</em>
              <small>{{ provider.categories?.[0]?.name || 'Home service' }} · {{ Number(provider.rating || 0).toFixed(1) }} rating · {{ provider.location || 'Nearby' }}</small>
            </span>
            <span class="provider-preview-rating">{{ providerRatingLabel(provider) }}</span>
          </article>
        </div>
        <div v-else class="provider-preview-empty">Verified providers will appear here once available.</div>
        <RouterLink class="provider-preview-link" to="/customer/providers">Browse providers</RouterLink>
      </div>
    </aside>
    <div class="auth-card login-card">
      <div class="card-heading"><span class="brand-mark">F</span><div><h2>Sign in</h2><p>Enter your account details.</p></div></div>
      <div class="auth-status-row">
        <span class="auth-status" :class="`is-${apiStatus}`">
          <i></i>{{ apiStatusLabel }}
        </span>
        <button class="auth-status-refresh" type="button" @click="refreshApiStatus">Retry check</button>
      </div>
      <div v-if="accessDeniedRole" class="alert error" role="alert">This area requires a {{ accessDeniedRole }} account.</div>
      <div v-if="serverUnavailable" class="alert error" role="alert">The server is temporarily unavailable. Your session has been kept; please try again.</div>
      <div v-if="auth.error" class="alert error" role="alert">{{ auth.error }}</div>
      <form class="form-grid" @submit.prevent="submit">
        <label class="field"><span>Username</span><input v-model.trim="form.username" required autocomplete="username" placeholder="Enter username" /></label>
        <PasswordField v-model="form.password" label="Password" required autocomplete="current-password" placeholder="Enter password" />
        <div class="form-meta"><label class="check"><input v-model="form.remember" type="checkbox" /> Remember me</label><RouterLink to="/forgot-password">Forgot password?</RouterLink></div>
        <button class="button button-primary submit-button" :disabled="auth.loading">{{ auth.loading ? 'Signing in...' : 'Sign in' }}</button>
      </form>
      <p class="auth-switch">New to FixIt? <RouterLink to="/register">Create an account</RouterLink></p>
    </div>
  </div></section>
</template>
