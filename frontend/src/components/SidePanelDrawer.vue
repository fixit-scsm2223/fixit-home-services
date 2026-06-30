<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  initialWidth: { type: Number, default: 440 },
  minWidth: { type: Number, default: 360 },
  maxWidth: { type: Number, default: 760 },
  panelClass: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const panelWidth = ref(props.initialWidth)
const resizing = ref(false)

function startResize(e) {
  resizing.value = true
  e.preventDefault()
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', stopResize)
}

function onResizeMove(e) {
  const next = window.innerWidth - e.clientX
  panelWidth.value = Math.min(props.maxWidth, Math.max(props.minWidth, next))
}

function stopResize() {
  resizing.value = false
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="panel-backdrop" @click="emit('close')"></div>
    </Transition>
    <Transition name="slide">
      <aside
        v-if="open"
        class="side-drawer"
        :class="[panelClass, { resizing }]"
        :style="{ width: panelWidth + 'px' }"
      >
        <div class="drawer-resize-handle" @mousedown="startResize"></div>
        <slot />
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 1200;
}

.side-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  background: color-mix(in srgb, var(--color-card) 98%, #fff 2%);
  color: var(--color-text);
  border-left: 2px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  z-index: 1201;
  display: flex;
  min-width: 360px;
  max-width: 760px;
  overflow: hidden;
}
.side-drawer.ticket-drawer {
  width: min(1180px, 95vw) !important;
  min-width: min(760px, 95vw);
  max-width: min(1280px, 95vw);
  top: 5vh;
  right: 2.5vw;
  bottom: 5vh;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.side-drawer.resizing { user-select: none; }

.drawer-resize-handle {
  flex-shrink: 0;
  width: 6px;
  cursor: ew-resize;
  background: transparent;
  position: relative;
}
.drawer-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 3px; height: 36px;
  border-radius: 999px;
  background: var(--color-border);
}
.drawer-resize-handle:hover::after,
.side-drawer.resizing .drawer-resize-handle::after {
  background: var(--color-primary);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.22s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

@media (max-width: 720px) {
  .side-drawer,
  .side-drawer.ticket-drawer {
    width: 100% !important;
    min-width: 0;
    max-width: none;
    top: 0;
    right: 0;
    bottom: 0;
    border-radius: 0;
  }
  .side-drawer.ticket-drawer .drawer-resize-handle { display: none; }
}
</style>
