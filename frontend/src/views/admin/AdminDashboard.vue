<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import adminCssUrl from '@/admin/style.css?url'
import adminScriptUrl from '@/admin/script.js?url'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/services/apiBase'

let styleLink = null
let scriptElement = null
const router = useRouter()
const auth = useAuthStore()
const accountMenuOpen = ref(false)
const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)

onMounted(() => {
  window.FIXIT_API_BASE_URL = API_BASE_URL

  styleLink = document.createElement('link')
  styleLink.rel = 'stylesheet'
  styleLink.href = adminCssUrl
  document.head.appendChild(styleLink)

  scriptElement = document.createElement('script')
  scriptElement.type = 'module'
  scriptElement.src = `${adminScriptUrl}?v=${Date.now()}`
  document.body.appendChild(scriptElement)
})

onBeforeUnmount(() => {
  window.__fixitAdminCleanup?.()
  scriptElement?.remove()
  styleLink?.remove()
  document.body.classList.remove('dark-mode', 'modal-open', 'provider-filter-open')
})

function openAdminRoute(path) {
  accountMenuOpen.value = false
  router.push(path)
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
    accountMenuOpen.value = false
  }
}
</script>

<template>
  <div class="app-shell" id="app-shell">
    <aside class="app-sidebar" id="app-sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo"><span>Fix</span>It</div>

        <button
          class="icon-button sidebar-toggle"
          id="sidebar-toggle"
          type="button"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          &#8592;
        </button>
      </div>

      <nav class="sidebar-navigation" aria-label="Admin navigation">
        <div id="sidebar-menu"></div>
      </nav>

      <button
        class="sidebar-profile sidebar-profile-button"
        id="sidebar-profile-button"
        type="button"
        title="Open admin profile"
      >
        <div class="profile-avatar">AD</div>

        <div class="sidebar-profile-text">
          <strong>Admin Team</strong>
          <span>FixIt Admin Console</span>
        </div>
      </button>
    </aside>

    <div class="mobile-overlay" id="mobile-overlay"></div>

    <section class="app-workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button mobile-menu-button"
            id="mobile-menu-button"
            type="button"
            aria-label="Open menu"
          >
            &#9776;
          </button>

          <div class="topbar-heading">
            <span class="breadcrumb" id="breadcrumb">FixIt / Admin Console / Dashboard</span>
            <span class="topbar-caption">Operational oversight for providers, users, jobs, and safety.</span>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="topbar-location">
            <span class="topbar-location-icon">&#128205;</span>
            <span id="topbar-location-label">Johor Bahru, Malaysia</span>
          </div>

          <div class="notification-wrapper">
            <button
              class="icon-button notification-button"
              id="notifications-toggle"
              type="button"
              title="Notifications"
            >
              &#128276;
              <span class="notification-dot" id="notification-dot"></span>
            </button>

            <div class="notification-panel hidden" id="notification-panel">
              <div class="notification-panel-head">
                <div>
                  <strong>Notifications</strong>
                  <span id="notification-count">0 new</span>
                </div>

                <button class="text-button" id="mark-all-read-button" type="button">
                  Mark all read
                </button>
              </div>

              <div id="notification-list"></div>
            </div>
          </div>

          <button
            class="theme-button top-icon-button"
            id="theme-toggle"
            type="button"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            <span id="theme-icon">&#127769;</span>
            <span id="theme-label" class="visually-hidden">Dark</span>
          </button>

          <button
            class="admin-account-button"
            id="admin-account-button"
            type="button"
            title="Open admin profile"
            aria-label="Open admin profile"
          >
            <span class="mini-avatar" id="top-profile-avatar">AD</span>

            <span class="admin-account-text">
              <strong id="top-profile-name">Admin Team</strong>
              <small id="top-profile-role">Platform Control</small>
            </span>
          </button>

          <div class="admin-account-menu-wrap">
            <button class="admin-account-menu-toggle" type="button" aria-label="Open account menu" @click.stop="accountMenuOpen = !accountMenuOpen">
              ⋯
            </button>
            <div v-if="accountMenuOpen" class="admin-account-menu">
              <button type="button" @click="openAdminRoute('/admin/profile')">My Profile</button>
              <button type="button" @click="openAdminRoute('/admin/settings')">Settings</button>
              <button class="danger" type="button" @click="logoutConfirmOpen = true; accountMenuOpen = false">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main class="main-content" id="app-root"></main>
    </section>
  </div>

  <div class="modal-backdrop hidden" id="modal-backdrop">
    <section class="modal-card" id="modal-card"></section>
  </div>

  <div v-if="logoutConfirmOpen" class="admin-logout-backdrop" @click.self="logoutConfirmOpen = false">
    <section class="admin-logout-modal" role="dialog" aria-modal="true" aria-label="Log out of FixIt">
      <h3>Log out of FixIt?</h3>
      <p>You will need to sign in again to access your account.</p>
      <div>
        <button type="button" class="admin-logout-cancel" :disabled="loggingOut" @click="logoutConfirmOpen = false">Cancel</button>
        <button type="button" class="admin-logout-danger" :disabled="loggingOut" @click="confirmLogout">
          {{ loggingOut ? 'Logging out...' : 'Log Out' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-account-menu-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.admin-account-menu-toggle {
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--color-border, #e2e8f0) 76%, var(--color-primary, #2563eb));
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface, #fff) 78%, transparent);
  color: var(--color-text, #1e293b);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
}
.admin-account-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 3000;
  display: grid;
  min-width: 178px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--color-border, #e2e8f0) 84%, var(--color-primary, #2563eb));
  border-radius: 14px;
  background: var(--color-surface, #fff);
  box-shadow: 0 24px 60px rgba(15, 23, 42, .16);
}
.admin-account-menu button {
  display: flex;
  align-items: center;
  min-height: 38px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text, #1e293b);
  padding: 0 10px;
  font-weight: 800;
  cursor: pointer;
}
.admin-account-menu button:hover {
  background: color-mix(in srgb, var(--color-primary, #2563eb) 10%, transparent);
}
.admin-account-menu button.danger {
  color: var(--color-danger, #ef4444);
}
.admin-logout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, .72);
}
.admin-logout-modal {
  width: min(420px, 100%);
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--color-border, #e2e8f0) 84%, var(--color-primary, #2563eb));
  border-radius: 18px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #1e293b);
  box-shadow: 0 28px 70px rgba(15, 23, 42, .24);
}
.admin-logout-modal h3 {
  margin: 0;
  font-size: 1.2rem;
}
.admin-logout-modal p {
  margin: 8px 0 20px;
  color: var(--color-muted, #64748b);
  line-height: 1.55;
}
.admin-logout-modal div {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.admin-logout-cancel,
.admin-logout-danger {
  min-height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  font-weight: 900;
  cursor: pointer;
}
.admin-logout-cancel {
  border: 1px solid var(--color-border, #e2e8f0);
  background: color-mix(in srgb, var(--color-surface, #fff) 86%, transparent);
  color: var(--color-text, #1e293b);
}
.admin-logout-danger {
  border: 1px solid var(--color-primary, #2563eb);
  background: linear-gradient(135deg, var(--color-primary, #2563eb), #1d4ed8);
  color: #fff;
}
</style>
