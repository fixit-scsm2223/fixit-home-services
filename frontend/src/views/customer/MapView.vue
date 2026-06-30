<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCatalogStore } from '@/stores/catalog'

const router = useRouter()
const catalogStore = useCatalogStore()

const RADIUS_OPTIONS = [1, 5, 10, 25]
const radius = ref(10)

const mapEl = ref(null)
let map = null
let markersLayer = null
let youAreHereMarker = null
let resizeObserver = null

const geolocationSupported = ref('geolocation' in navigator)
const detecting = computed(() => catalogStore.locationStatus === 'detecting')
const detectMessage = computed(() => {
  if (catalogStore.locationStatus === 'granted') return null
  if (['denied', 'error', 'unavailable'].includes(catalogStore.locationStatus)) {
    return 'Location access was denied. Showing default location (Skudai, Johor). You can enable location in your browser settings.'
  }
  return null
})
const showUnavailableBanner = computed(() =>
  !geolocationSupported.value || ['denied', 'error', 'unavailable'].includes(catalogStore.locationStatus)
)

// Mock providers have no real lat/lng — anchor a plausible position to the
// page's starting location (captured once) using each provider's existing
// `distance` field + id as a spread angle, so pins don't jump around the
// map every time the customer's live location changes.
const anchor = { ...catalogStore.customerLocation }

function providerCoords(provider) {
  const dist = Number(provider.distance) || 1
  const angle = ((provider.id * 47) % 360) * (Math.PI / 180)
  const latOffset = (dist / 111) * Math.cos(angle)
  const lngOffset = (dist / (111 * Math.cos((anchor.lat * Math.PI) / 180))) * Math.sin(angle)
  return { lat: anchor.lat + latOffset, lng: anchor.lng + lngOffset }
}

function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
}

const providersWithDistance = computed(() =>
  catalogStore.providers
    .map((p) => {
      const coords = providerCoords(p)
      return { ...p, coords, liveDistance: haversineKm(catalogStore.customerLocation, coords) }
    })
    .sort((a, b) => a.liveDistance - b.liveDistance)
)

const visibleProviders = ref([])
const lastSearchedRadius = ref(null)

function searchNearby() {
  lastSearchedRadius.value = radius.value
  visibleProviders.value = providersWithDistance.value.filter((p) => p.liveDistance <= radius.value)
  renderMarkers()
  invalidateMapSize()
}

function invalidateMapSize() {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      if (map) map.invalidateSize()
    })
  })
}

const blueIcon = L.divIcon({
  className: 'map-pin-wrap',
  html: '<div class="map-pin map-pin-blue"></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
})
const redIcon = L.divIcon({
  className: 'map-pin-wrap',
  html: '<div class="map-pin map-pin-red"></div>',
  iconSize: [22, 30],
  iconAnchor: [11, 30],
  popupAnchor: [0, -28],
})

// ─── floating marker card (hover on desktop, tap on touch devices) ───
const supportsHover = window.matchMedia('(hover: hover)').matches
const hoveredProvider = ref(null)
const cardEl = ref(null)
const cardPosition = ref({ top: 0, left: 0, flipBelow: false })
let hideTimer = null

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function scheduleHide() {
  hideTimer = setTimeout(() => {
    hoveredProvider.value = null
  }, 150)
}

function positionCard(marker) {
  if (!map || !mapEl.value) return
  const point = map.latLngToContainerPoint(marker.getLatLng())
  const mapRect = mapEl.value.getBoundingClientRect()
  const CARD_WIDTH = 200
  const GAP = 10
  const PAD = 8
  const PIN_HEIGHT = 30

  const markerScreenX = mapRect.left + point.x
  const pinTopY = mapRect.top + point.y - PIN_HEIGHT
  const pinBottomY = mapRect.top + point.y

  const cardHeight = cardEl.value?.offsetHeight || 320

  // Keep the card inside the map's own box rather than the whole window,
  // so it never spills over the toolbar/header above or page content below.
  const minTop = mapRect.top + PAD
  const maxTop = Math.max(minTop, mapRect.bottom - cardHeight - PAD)
  const minLeft = mapRect.left + PAD
  const maxLeft = Math.max(minLeft, mapRect.right - CARD_WIDTH - PAD)

  let flipBelow = false
  let top = pinTopY - GAP - cardHeight
  if (top < minTop) {
    flipBelow = true
    top = pinBottomY + GAP
  }
  top = Math.min(Math.max(top, minTop), maxTop)

  let left = markerScreenX - CARD_WIDTH / 2
  left = Math.min(Math.max(left, minLeft), maxLeft)

  cardPosition.value = { top, left, flipBelow }
}

async function showCard(provider, marker) {
  cancelHide()
  hoveredProvider.value = provider
  await nextTick()
  positionCard(marker)
}

function toggleCard(provider, marker) {
  if (hoveredProvider.value && hoveredProvider.value.id === provider.id) {
    hoveredProvider.value = null
  } else {
    showCard(provider, marker)
  }
}

function closeCard() {
  hoveredProvider.value = null
}

function onDocClick(e) {
  if (!hoveredProvider.value) return
  if (cardEl.value && cardEl.value.contains(e.target)) return
  closeCard()
}

function viewProfile(provider) {
  router.push({ name: 'provider-details', params: { id: provider.id } })
}

function renderMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()
  visibleProviders.value.forEach((p) => {
    const marker = L.marker([p.coords.lat, p.coords.lng], { icon: blueIcon }).addTo(markersLayer)
    if (supportsHover) {
      marker.on('mouseover', () => showCard(p, marker))
      marker.on('mouseout', () => scheduleHide())
    } else {
      marker.on('click', () => toggleCard(p, marker))
    }
  })
}

function renderYouAreHereMarker() {
  if (youAreHereMarker) {
    youAreHereMarker.remove()
    youAreHereMarker = null
  }
  youAreHereMarker = L.marker([catalogStore.customerLocation.lat, catalogStore.customerLocation.lng], {
    icon: redIcon,
  })
    .bindPopup('You are here')
    .addTo(map)
}

async function detectLocation() {
  const ok = await catalogStore.detectLocation()
  if (ok) {
    map.setView([catalogStore.customerLocation.lat, catalogStore.customerLocation.lng], 14)
    renderYouAreHereMarker()
    searchNearby()
    invalidateMapSize()
  }
}

onMounted(() => {
  if (!catalogStore.providers.length) catalogStore.loadProviders()

  map = L.map(mapEl.value, {
    center: [catalogStore.customerLocation.lat, catalogStore.customerLocation.lng],
    zoom: 13,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)
  map.on('movestart zoomstart', closeCard)
  searchNearby()
  invalidateMapSize()
  window.setTimeout(invalidateMapSize, 180)
  if ('ResizeObserver' in window && mapEl.value) {
    resizeObserver = new ResizeObserver(invalidateMapSize)
    resizeObserver.observe(mapEl.value)
  }
  window.addEventListener('resize', invalidateMapSize)
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('resize', invalidateMapSize)
  if (resizeObserver) resizeObserver.disconnect()
  cancelHide()
  if (map) map.remove()
})
</script>

<template>
  <div class="map-view">
    <h2 class="page-title">Nearby Providers</h2>

    <div v-if="showUnavailableBanner" class="banner-ui warning-banner">
      ⚠️ Location access unavailable. Showing providers near Skudai, Johor. Enable location access in browser
      settings for accurate nearby results.
    </div>

    <div class="map-toolbar">
      <div class="toolbar-detect">
        <button class="btn-ui btn-ui-outline" :disabled="detecting" @click="detectLocation">
          {{ detecting ? 'Detecting…' : '📍 Detect my location' }}
        </button>
        <p v-if="detectMessage" class="muted detect-message">{{ detectMessage }}</p>
      </div>

      <div class="toolbar-search">
        <select v-model.number="radius" class="form-select-control radius-select">
          <option v-for="r in RADIUS_OPTIONS" :key="r" :value="r">{{ r }} km</option>
        </select>
        <button class="btn-ui btn-ui-primary" @click="searchNearby">Search nearby</button>
      </div>
    </div>

    <p v-if="lastSearchedRadius != null" class="muted result-count">
      Showing {{ visibleProviders.length }} provider{{ visibleProviders.length === 1 ? '' : 's' }} within
      {{ lastSearchedRadius }} km
    </p>

    <div class="map-container">
      <div ref="mapEl" class="map-el"></div>
    </div>

    <Transition name="card-fade">
      <div
        v-if="hoveredProvider"
        ref="cardEl"
        class="marker-card"
        :style="{ top: cardPosition.top + 'px', left: cardPosition.left + 'px' }"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <h4 class="mc-name">{{ hoveredProvider.name }}</h4>
        <button type="button" class="btn-ui btn-ui-primary mc-view-btn" @click="viewProfile(hoveredProvider)">
          View Profile
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.map-view { display: flex; flex-direction: column; gap: var(--spacing-md); min-height: 100%; }
.page-title { font-size: 1.4rem; font-weight: 800; color: var(--color-text); }

.banner-ui {
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
}
.warning-banner {
  background: rgba(245, 158, 11, 0.12);
  border: 2px solid var(--color-warning);
  color: var(--color-text);
}

.map-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
.toolbar-detect { display: flex; flex-direction: column; gap: 6px; }
.detect-message { font-size: 0.8rem; max-width: 360px; }
.toolbar-search { display: flex; align-items: center; gap: 10px; }
.radius-select { width: auto; min-width: 110px; }

.result-count { font-size: 0.85rem; }

.map-container {
  flex: 0 0 auto;
  width: 100%;
  height: clamp(430px, 62vh, 720px);
  min-height: 0;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-card);
}
.map-el { width: 100%; height: 100%; min-height: 0; }

@media (max-width: 768px) {
  .map-toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-search { justify-content: stretch; }
  .radius-select { flex: 1; }
  .map-container { height: 440px; }
}

@media (max-width: 520px) {
  .map-container { height: 380px; }
}

/* ─── floating provider marker card ─── */
.marker-card {
  position: fixed;
  width: 200px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}
.card-fade-enter-active, .card-fade-leave-active { transition: opacity 0.2s ease; }
.card-fade-enter-from, .card-fade-leave-to { opacity: 0; }

.mc-name { font-size: 0.9rem; font-weight: 800; color: var(--color-text); }

.mc-view-btn { width: 100%; padding: 6px 10px; font-size: 0.75rem; }
</style>

<style>
.map-pin-wrap { background: transparent; border: none; }
.map-pin {
  width: 22px;
  height: 22px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  position: relative;
}
.map-pin::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
}
.map-pin-blue { background: #2563eb; }
.map-pin-red { background: #ef4444; }
</style>
