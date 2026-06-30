<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import ChatWidget from '@/components/ChatWidget.vue'
import NotificationDropdown from '@/components/NotificationDropdown.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route  = useRoute()
const auth = useAuthStore()
const { user } = storeToRefs(auth)
const sidebarCollapsed = ref(false)
const nightMode = ref(localStorage.getItem('fixit-night-mode') === '1')
const profileMenuOpen = ref(false)
const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)
document.body.classList.toggle('night-mode-active', nightMode.value)

let sidebarManuallySet = false

function applyResponsiveSidebar() {
  if (!sidebarManuallySet) sidebarCollapsed.value = window.innerWidth < 1024
}

onMounted(() => {
  applyResponsiveSidebar()
  window.addEventListener('resize', applyResponsiveSidebar)
  window.addEventListener('fixit-theme-change', syncThemeFromSettings)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', applyResponsiveSidebar)
  window.removeEventListener('fixit-theme-change', syncThemeFromSettings)
})

function toggleSidebar() {
  sidebarManuallySet = true
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function syncThemeFromSettings(event) {
  nightMode.value = Boolean(event.detail?.dark)
  document.body.classList.toggle('night-mode-active', nightMode.value)
}

const navGroups = [
  {
    label: 'Main',
    items: [
      { path: '/customer', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Services',
    items: [
      { path: '/customer/providers', label: 'Providers', icon: '🧑‍🔧' },
      { path: '/customer/bookings',  label: 'My Bookings', icon: '📅' },
      { path: '/customer/recurring', label: 'Recurring Bookings', icon: '🔄' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/customer/reviews',  label: 'My Reviews', icon: '⭐' },
      { path: '/customer/profile',  label: 'My Profile', icon: '👤' },
      { path: '/customer/settings', label: 'Account Settings', icon: '⚙️' },
    ],
  },
]

const navItems = navGroups.flatMap((g) => g.items)

const pageTitle = computed(() => {
  const m = navItems.find(n => n.path === route.path)
  return m ? m.label : 'Dashboard'
})

function toggleNight() {
  nightMode.value = !nightMode.value
  document.body.classList.toggle('night-mode-active', nightMode.value)
  localStorage.setItem('fixit-night-mode', nightMode.value ? '1' : '0')
}

const userName     = computed(() => user.value?.full_name || user.value?.email || 'Account')
const userInitials = computed(() =>
  userName.value
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)

function openProfileRoute(path) {
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
  <div class="shell" :class="{ night: nightMode }">

    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sb-brand">
        <span class="logo" v-if="!sidebarCollapsed"><b style="color:#2563EB">Fix</b>It</span>
        <button class="sb-toggle" @click="toggleSidebar">
          {{ sidebarCollapsed ? '→' : '←' }}
        </button>
      </div>

      <nav class="sb-nav">
        <div v-for="(group, gi) in navGroups" :key="group.label" class="nav-group" :class="{ first: gi === 0 }">
          <p class="nav-group-label" v-show="!sidebarCollapsed">{{ group.label.toUpperCase() }}</p>
          <a
            v-for="item in group.items" :key="item.path"
            class="nav-item"
            :class="{ active: route.path === item.path }"
            :title="sidebarCollapsed ? item.label : ''"
            @click="router.push(item.path)"
          >
            <span class="ni">{{ item.icon }}</span>
            <span class="nl" v-show="!sidebarCollapsed">{{ item.label }}</span>
          </a>
        </div>
      </nav>

      <div class="sb-user" role="button" tabindex="0" @click="router.push('/customer/settings')" @keyup.enter="router.push('/customer/settings')">
        <div class="avatar">{{ userInitials }}</div>
        <div class="user-info" v-show="!sidebarCollapsed">
          <strong>{{ userName }}</strong>
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <div class="main">
      <!-- HEADER -->
      <header class="topbar">
        <div class="tb-left">
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="tb-right">
          <div class="loc-chip">📍 <span>Skudai, Johor</span></div>
          <NotificationDropdown />
          <ChatWidget />
          <div class="profile-menu-wrap">
            <button class="nav-avatar-btn" aria-label="Open account menu" @click.stop="profileMenuOpen = !profileMenuOpen">
              <span class="nav-avatar">{{ userInitials }}</span>
            </button>
            <div v-if="profileMenuOpen" class="profile-menu">
              <button type="button" @click="openProfileRoute('/customer/profile')">My Profile</button>
              <button type="button" @click="openProfileRoute('/customer/settings')">Settings</button>
              <button class="danger" type="button" @click="logoutConfirmOpen = true; profileMenuOpen = false">Logout</button>
            </div>
          </div>
          <button class="icon-btn" @click="toggleNight">{{ nightMode ? '☀️' : '🌙' }}</button>
        </div>
      </header>

      <!-- PAGE CONTENT -->
      <main class="content">
        <RouterView />
      </main>
    </div>

    <div v-if="logoutConfirmOpen" class="logout-backdrop" @click.self="logoutConfirmOpen = false">
      <section class="logout-modal" role="dialog" aria-modal="true" aria-label="Log out of FixIt">
        <h3>Log out of FixIt?</h3>
        <p>You will need to sign in again to access your account.</p>
        <div>
          <button class="btn-ui btn-ui-outline" type="button" :disabled="loggingOut" @click="logoutConfirmOpen = false">Cancel</button>
          <button class="btn-ui btn-ui-danger" type="button" :disabled="loggingOut" @click="confirmLogout">
            {{ loggingOut ? 'Logging out...' : 'Log Out' }}
          </button>
        </div>
      </section>
    </div>

  </div>
</template>

<style scoped>
/* ─── base ─── */
.shell {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, Arial, sans-serif;
  --sb-bg: #0F172A;
  --sb-w:  240px;
  --topbar-control-bg: rgba(255, 255, 255, .58);
  --topbar-control-border: color-mix(in srgb, var(--color-border) 76%, var(--color-primary));
  --topbar-control-hover: color-mix(in srgb, var(--color-card) 72%, var(--color-primary) 8%);
}

/* sidebar stays dark in both themes; only deepen it slightly at night */
.shell.night {
  --sb-bg: #080E1A;
  --topbar-control-bg: rgba(15, 23, 42, .32);
  --topbar-control-border: rgba(148, 163, 184, .18);
  --topbar-control-hover: rgba(148, 163, 184, .16);
}

/* ─── sidebar ─── */
.sidebar {
  width: var(--sb-w);
  min-width: var(--sb-w);
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.11), transparent 28%),
    linear-gradient(180deg, var(--sb-bg), #07111f);
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width .22s ease, min-width .22s ease;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 64px; min-width: 64px; }

.sb-brand {
  height: 64px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid rgba(255,255,255,.06);
  flex-shrink: 0;
}
.logo { font-size: 1.35rem; font-weight: 900; color: #fff; white-space: nowrap; }

.sb-toggle {
  background: rgba(255,255,255,.08);
  border: none; cursor: pointer;
  color: #94A3B8;
  width: 28px; height: 28px;
  border-radius: 6px;
  font-weight: 700; font-size: .85rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .18s;
}
.sb-toggle:hover { background: rgba(255,255,255,.18); color: #fff; }

.sb-nav {
  flex: 1;
  padding: 10px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.nav-group { display: flex; flex-direction: column; gap: 2px; margin-top: var(--spacing-md); }
.nav-group.first { margin-top: 0; }
.nav-group-label {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  padding: var(--spacing-sm) var(--spacing-md) 4px;
}
.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #94A3B8;
  font-size: .88rem; font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all .18s;
  text-decoration: none;
}
.nav-item:hover { background: rgba(255,255,255,.07); color: #fff; }
.nav-item.active { background: var(--color-primary); color: #fff; box-shadow: 0 4px 14px rgba(37,99,235,.35); }
.ni {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  line-height: 1;
  flex-shrink: 0;
}

.sb-user {
  padding: 14px;
  display: flex; align-items: center; gap: 10px;
  background: var(--sb-bg);
  flex-shrink: 0;
  cursor: pointer;
  transition: background .18s;
}
.sb-user:hover { background: var(--color-border); }
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .82rem; font-weight: 700; line-height: 1; flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; min-width: 0; }
.user-info strong { font-size: .84rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ─── main ─── */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 0%, rgba(20, 184, 166, 0.11), transparent 24%),
    radial-gradient(circle at 10% 0%, rgba(37, 99, 235, 0.10), transparent 26%),
    var(--color-background);
  color: var(--color-text);
}

/* ─── topbar ─── */
.topbar {
  height: 64px;
  background: color-mix(in srgb, var(--color-background) 74%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 72%, transparent);
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  color: var(--color-text);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  backdrop-filter: blur(14px) saturate(130%);
}
.tb-left h2 { font-size: 1.25rem; font-weight: 800; letter-spacing: -.02em; color: var(--color-text); }

.tb-right { display: flex; align-items: center; gap: 10px; }
.loc-chip {
  background: var(--topbar-control-bg);
  border: 1px solid var(--topbar-control-border);
  color: var(--color-text);
  padding: 7px 14px;
  border-radius: 10px;
  font-size: .83rem; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}
.icon-btn {
  background: var(--topbar-control-bg);
  border: 1px solid var(--topbar-control-border);
  padding: 7px 11px;
  border-radius: 10px;
  cursor: pointer; font-size: .95rem;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
  transition: background .18s, border-color .18s, transform .18s;
}
.icon-btn:hover {
  background: var(--topbar-control-hover);
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--topbar-control-border));
}
.nav-avatar-btn {
  width: 42px; height: 42px;
  background: var(--topbar-control-bg);
  border: 1px solid var(--topbar-control-border);
  border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .18s, border-color .18s;
  overflow: visible;
  padding: 0;
}
.nav-avatar-btn:hover {
  background: var(--topbar-control-hover);
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--topbar-control-border));
}
.nav-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: .82rem; font-weight: 800; line-height: 1;
  overflow: hidden;
  flex-shrink: 0;
}

/* ─── page content ─── */
.profile-menu-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 80;
  display: grid;
  min-width: 178px;
  padding: 8px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}
.profile-menu button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 38px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  padding: 0 10px;
  font-weight: 800;
  cursor: pointer;
}
.profile-menu button:hover { background: var(--color-background); }
.profile-menu button.danger { color: var(--color-danger); }
.logout-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, .68);
}
.logout-modal {
  width: min(420px, 100%);
  padding: 22px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}
.logout-modal h3 { margin: 0; color: var(--color-text); font-size: 1.2rem; }
.logout-modal p { margin: 8px 0 20px; color: var(--color-muted); line-height: 1.55; }
.logout-modal div {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 2px;
}
.logout-modal .btn-ui {
  min-width: 104px;
  justify-content: center;
}

.content {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 92% 0%, rgba(20, 184, 166, 0.11), transparent 24%),
    radial-gradient(circle at 10% 0%, rgba(37, 99, 235, 0.10), transparent 26%),
    var(--color-background);
  color: var(--color-text);
}

.content :deep(.booking-card),
.content :deep(.category-card),
.content :deep(.provider-card),
.content :deep(.filter-panel),
.content :deep(.ticket-card),
.content :deep(.ticket-header-card),
.content :deep(.stepper-card),
.content :deep(.settings-profile-card),
.content :deep(.settings-card),
.content :deep(.profile-identity-card),
.content :deep(.profile-details-card),
.content :deep(.profile-insights-card),
.content :deep(.map-toolbar),
.content :deep(.map-container),
.content :deep(.booking-form),
.content :deep(.dashboard-payment-box),
.content :deep(.table-responsive-frame) {
  border: 1px solid color-mix(in srgb, var(--color-border) 84%, var(--color-primary));
  border-radius: 18px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--color-card) 94%, #ffffff 6%), color-mix(in srgb, var(--color-card) 88%, rgba(37, 99, 235, 0.08))),
    var(--color-card);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

/* ─── responsive ─── */
@media (max-width: 640px) {
  .topbar {
    height: auto;
    min-height: 64px;
    padding: 12px 16px;
    gap: 12px;
  }
  .tb-right {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .tb-left h2 {
    font-size: 1rem;
  }
  .loc-chip span { display: none; }
  .content { padding: 16px; }
}
</style>
