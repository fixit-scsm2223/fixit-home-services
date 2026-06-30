<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const notifications = ref([])

const isOpen = ref(false)
const rootEl = ref(null)

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function markAllRead() {
  notifications.value.forEach((n) => (n.read = true))
}

function handleOutsideClick(e) {
  if (isOpen.value && rootEl.value && !rootEl.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))
</script>

<template>
  <div class="notif-root" ref="rootEl">
    <button
      class="notif-bell"
      :class="{ 'has-unread': unreadCount > 0 }"
      type="button"
      aria-label="Notifications"
      @click="toggleOpen"
    >
      <span class="notif-bell-icon">🔔</span>
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
    </button>

    <Transition name="notif-fade">
      <div v-if="isOpen" class="notif-panel">
        <div class="notif-head">
          <div class="notif-head-title">
            <strong>Notifications</strong>
            <span v-if="unreadCount > 0" class="muted notif-unread-count">{{ unreadCount }} new</span>
          </div>
          <button
            v-if="unreadCount > 0"
            class="notif-mark-read"
            type="button"
            @click="markAllRead"
          >Mark all read</button>
        </div>

        <div class="notif-list">
          <div v-if="!notifications.length" class="notif-empty muted">No notifications yet.</div>
          <div
            v-for="n in notifications"
            :key="n.id"
            class="notif-item"
            :class="{ unread: !n.read }"
          >
            <span class="notif-icon">{{ n.icon }}</span>
            <div class="notif-body">
              <div class="notif-title-row">
                <strong class="notif-title">{{ n.title }}</strong>
                <span class="notif-time">{{ n.time }}</span>
              </div>
              <p class="muted notif-desc">{{ n.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notif-root { position: relative; }

.notif-bell {
  position: relative;
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  background: var(--topbar-control-bg, var(--color-card));
  border: 1px solid var(--topbar-control-border, var(--color-border));
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: box-shadow .2s, background .18s, border-color .18s;
}
.notif-bell:hover {
  background: var(--topbar-control-hover, var(--color-border));
  border-color: color-mix(in srgb, var(--color-primary) 36%, var(--topbar-control-border, var(--color-border)));
}
.notif-bell-icon {
  font-size: 20px;
  line-height: 1;
  color: var(--color-text-muted, var(--color-muted));
  filter: grayscale(1);
  opacity: 0.65;
  transition: filter .2s, opacity .2s, color .2s;
}
.notif-bell.has-unread {
  box-shadow: 0 0 12px rgba(255, 180, 0, 0.6);
}
.notif-bell.has-unread .notif-bell-icon {
  color: #FFB400;
  filter: none;
  opacity: 1;
}
.notif-badge {
  position: absolute;
  top: -6px; right: -6px;
  min-width: 18px; height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--color-danger, #ef4444);
  color: #fff;
  font-size: 0.68rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  overflow-y: auto;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
}

.notif-head {
  position: sticky;
  top: 0;
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-card);
}
.notif-head-title { display: flex; align-items: center; gap: 8px; }
.notif-head-title strong { font-size: 0.95rem; color: var(--color-text); }
.notif-unread-count { font-size: 0.78rem; }
.notif-mark-read {
  background: none; border: none;
  color: var(--color-primary);
  font-size: 0.78rem; font-weight: 700;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.notif-mark-read:hover { text-decoration: underline; }

.notif-list { display: flex; flex-direction: column; }
.notif-empty { padding: var(--spacing-lg); text-align: center; font-size: 0.85rem; }

.notif-item {
  display: flex; gap: 10px;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  border-left: 3px solid transparent;
  transition: background .15s;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--color-background); }
.notif-item.unread { border-left-color: var(--color-primary); }

.notif-icon { font-size: 1.2rem; flex-shrink: 0; line-height: 1.4; }
.notif-body { flex: 1; min-width: 0; }
.notif-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.notif-title { font-size: 0.88rem; color: var(--color-text); }
.notif-time { font-size: 0.7rem; color: var(--color-muted); white-space: nowrap; flex-shrink: 0; }
.notif-desc { font-size: 0.8rem; margin-top: 2px; line-height: 1.4; }

.notif-fade-enter-active, .notif-fade-leave-active { transition: opacity 0.15s ease; }
.notif-fade-enter-from, .notif-fade-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .notif-panel {
    position: fixed;
    top: 64px;
    left: 0; right: 0;
    width: 100vw;
    border-radius: 0;
    max-height: calc(100vh - 64px);
  }
}
</style>
