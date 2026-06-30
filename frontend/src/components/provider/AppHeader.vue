<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderStore } from '@/stores/provider'
import { useAuthStore } from '@/stores/auth'

defineProps({ nightMode: Boolean })
defineEmits(['toggleTheme', 'openMessages'])

const route = useRoute()
const router = useRouter()
const store = useProviderStore()
const auth = useAuthStore()
const profileMenuOpen = ref(false)
const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)

const activeChatCount = computed(() =>
  store.jobs.filter((job) => !['closed', 'rejected', 'requested'].includes(job.status)).length,
)
const accountInitials = computed(() =>
  (store.profile.name || 'Provider')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)

function openRoute(path) {
  profileMenuOpen.value = false
  if (route.path !== path) router.push(path)
}

async function confirmLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    sessionStorage.setItem('fixit_logout_toast', 'You have been logged out successfully.')
    await router.replace('/')
  } finally {
    loggingOut.value = false
    logoutConfirmOpen.value = false
    profileMenuOpen.value = false
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-title">
      <h2>{{ route.meta?.label || route.name }}</h2>
      <p>FixIt Provider Portal • {{ route.meta?.label }}</p>
    </div>

    <div class="header-actions">
      <button class="header-btn" title="Location">
        <span>📍</span>
        <span>{{ store.profile.location || 'Location not set' }}</span>
      </button>
      <button class="header-btn header-icon-btn" type="button" title="Messages" @click="$emit('openMessages')">
        <span>💬</span>
        <i v-if="activeChatCount"></i>
      </button>
      <button class="header-btn header-theme-btn" @click="$emit('toggleTheme')" title="Toggle theme">
        {{ nightMode ? '☀️' : '🌙' }}
      </button>
      <div class="provider-account-wrap">
        <button class="header-btn provider-account-button" type="button" title="Account menu" @click.stop="profileMenuOpen = !profileMenuOpen">
          <span>{{ accountInitials }}</span>
        </button>
        <div v-if="profileMenuOpen" class="provider-account-menu">
          <button type="button" @click="openRoute('/provider/profile')">My Profile</button>
          <button type="button" @click="openRoute('/provider/settings')">Settings</button>
          <button class="danger" type="button" @click="logoutConfirmOpen = true; profileMenuOpen = false">Logout</button>
        </div>
      </div>
    </div>

    <div v-if="logoutConfirmOpen" class="provider-logout-backdrop" @click.self="logoutConfirmOpen = false">
      <section class="provider-logout-modal" role="dialog" aria-modal="true" aria-label="Log out of FixIt">
        <h3>Log out of FixIt?</h3>
        <p>You will need to sign in again to access your account.</p>
        <div>
          <button class="btn btn-outline" type="button" :disabled="loggingOut" @click="logoutConfirmOpen = false">Cancel</button>
          <button class="btn btn-danger" type="button" :disabled="loggingOut" @click="confirmLogout">
            {{ loggingOut ? 'Logging out...' : 'Log Out' }}
          </button>
        </div>
      </section>
    </div>
  </header>
</template>

<style scoped>
.header-icon-btn {
  position: relative;
  width: 46px;
  padding-left: 0;
  padding-right: 0;
}

.header-icon-btn span,
.header-theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.header-icon-btn i {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-card);
}

.provider-account-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.provider-account-button {
  width: 46px;
  height: 46px;
  padding: 0;
  overflow: visible;
}
.provider-account-button span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: .78rem;
  font-weight: 900;
  line-height: 1;
  overflow: hidden;
  flex-shrink: 0;
}
.provider-account-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 80;
  display: grid;
  min-width: 178px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}
.provider-account-menu button {
  display: flex;
  align-items: center;
  min-height: 38px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  padding: 0 10px;
  font-weight: 800;
  cursor: pointer;
}
.provider-account-menu button:hover { background: var(--color-background); }
.provider-account-menu button.danger { color: var(--color-danger); }
.provider-logout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, .68);
}
.provider-logout-modal {
  width: min(420px, 100%);
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}
.provider-logout-modal h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}
.provider-logout-modal p {
  margin: 8px 0 20px;
  color: var(--color-muted);
  line-height: 1.55;
}
.provider-logout-modal div {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
}
.provider-logout-modal .btn {
  min-width: 104px;
  justify-content: center;
}
</style>
