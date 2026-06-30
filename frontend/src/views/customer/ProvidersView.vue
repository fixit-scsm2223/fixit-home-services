<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import ProviderCard from '@/components/ProviderCard.vue'
import FilterSidebar from '@/components/FilterSidebar.vue'

const store = useCatalogStore()
const router = useRouter()
const filtersOpen = ref(false)
const filtersAnchor = ref(null)

function onDocClick(e) {
  if (filtersOpen.value && filtersAnchor.value && !filtersAnchor.value.contains(e.target)) {
    filtersOpen.value = false
  }
}

onMounted(() => {
  if (!store.categories.length) store.loadCategories()
  store.loadProviders()
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// Debounce backend refetch so dragging a slider doesn't spam the API.
// The visibleProviders getter gives instant client-side feedback meanwhile.
let timer = null
function onFilterChange() {
  clearTimeout(timer)
  timer = setTimeout(() => store.loadProviders(), 350)
}

function openProvider(p) {
  router.push({ name: 'provider-details', params: { id: p.id } })
}

function bookProvider(p) {
  router.push({ name: 'create-booking', query: { provider: p.id } })
}

function selectCategory(categoryId) {
  store.setFilter({ categoryId })
  onFilterChange()
}

function onSearchInput(e) {
  store.setFilter({ search: e.target.value })
}
function clearSearch() {
  store.setFilter({ search: '' })
}

function onSortChange(e) {
  store.setFilter({ sort: e.target.value })
}

const activeCategoryName = computed(() => {
  const id = store.filters.categoryId
  if (!id) return null
  return store.categories.find((c) => c.id === id)?.name || null
})

const avgRating = computed(() => {
  const list = store.visibleProviders
  if (!list.length) return null
  const sum = list.reduce((acc, p) => acc + Number(p.rating || 0), 0)
  return (sum / list.length).toFixed(1)
})

const verifiedCount = computed(() => store.visibleProviders.filter((p) => p.verification_status === 'verified').length)

const hasActiveFilters = computed(() => {
  const f = store.filters
  return !!(f.categoryId || f.search || f.minRating > 0 || f.minPrice > 0 || f.maxPrice < 200 || f.maxDistance < 25)
})

function clearAllFilters() {
  store.resetFilters()
  onFilterChange()
}
</script>

<template>
  <div class="providers-page">
    <!-- Hero header -->
    <header class="page-head">
      <div class="page-head-text">
        <h1>Find a provider</h1>
        <p class="page-head-sub">
          <span class="page-head-pill">
            <span class="pulse-dot"></span>
            {{ store.visibleProviders.length }} available
          </span>
          <span class="muted">near {{ store.customerLocation.label }}</span>
        </p>
      </div>

      <div class="page-head-stats" v-if="store.visibleProviders.length && !store.loading">
        <div class="stat-pod">
          <span class="stat-pod-icon">⭐</span>
          <div>
            <span class="stat-pod-value">{{ avgRating }}</span>
            <span class="stat-pod-label">Avg rating</span>
          </div>
        </div>
        <div class="stat-pod">
          <span class="stat-pod-icon">✓</span>
          <div>
            <span class="stat-pod-value">{{ verifiedCount }}</span>
            <span class="stat-pod-label">Verified</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Search + sort bar -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="search-input"
          :value="store.filters.search"
          placeholder="Search by name, service or tag..."
          @input="onSearchInput"
        />
        <button v-if="store.filters.search" class="search-clear" @click="clearSearch" aria-label="Clear search">✕</button>
      </div>
      <div class="sort-wrap">
        <label class="sort-label">Sort</label>
        <select class="sort-select" :value="store.filters.sort" @change="onSortChange">
          <option value="rating">⭐ Top rated</option>
          <option value="distance">📍 Nearest first</option>
          <option value="price_asc">💰 Price: low to high</option>
          <option value="price_desc">💰 Price: high to low</option>
        </select>
      </div>
    </div>

    <!-- Category bar + filters toggle -->
    <div class="category-filter-bar">
      <span class="cfb-label">Category</span>
      <div class="chip-row">
        <button
          class="btn-chip"
          :class="{ active: !store.filters.categoryId }"
          @click="selectCategory(null)"
        >All</button>
        <button
          v-for="c in store.categories" :key="c.id"
          class="btn-chip"
          :class="{ active: store.filters.categoryId === c.id }"
          @click="selectCategory(c.id)"
        >{{ c.icon }} {{ c.name }}</button>
      </div>
      <div class="cfb-actions">
        <button class="btn-ui btn-ui-outline btn-ui-sm" @click="router.push('/customer/map')">🗺️ Map</button>
        <div class="filters-anchor" ref="filtersAnchor">
          <button
            class="btn-ui btn-ui-outline btn-ui-sm filters-btn"
            :class="{ 'has-active': hasActiveFilters }"
            @click="filtersOpen = !filtersOpen"
          >
            {{ filtersOpen ? '▲ Hide filters' : '⚙️ Filters' }}
            <span v-if="hasActiveFilters" class="filters-dot" aria-hidden="true"></span>
          </button>
          <div v-if="filtersOpen" class="filters-popover">
            <FilterSidebar @change="onFilterChange" @reset="onFilterChange" @close="filtersOpen = false" />
          </div>
        </div>
      </div>
    </div>

    <!-- Active filters strip -->
    <div v-if="hasActiveFilters" class="active-filters">
      <span class="af-label">Active:</span>
      <span v-if="activeCategoryName" class="af-chip">
        {{ activeCategoryName }}
        <button class="af-chip-x" @click="selectCategory(null)" aria-label="Clear category">✕</button>
      </span>
      <span v-if="store.filters.search" class="af-chip">
        "{{ store.filters.search }}"
        <button class="af-chip-x" @click="clearSearch" aria-label="Clear search">✕</button>
      </span>
      <span v-if="store.filters.minRating > 0" class="af-chip">
        ⭐ {{ store.filters.minRating }}+
      </span>
      <span v-if="store.filters.maxDistance < 25" class="af-chip">
        ≤ {{ store.filters.maxDistance }} km
      </span>
      <button class="af-clear-all" @click="clearAllFilters">Clear all</button>
    </div>

    <!-- Results -->
    <div class="results-col">
      <div v-if="store.loading" class="prov-grid">
        <div v-for="i in 6" :key="i" class="skeleton-card">
          <div class="skeleton-banner"></div>
          <div class="skeleton-body">
            <div class="skeleton-line skeleton-line-lg"></div>
            <div class="skeleton-line skeleton-line-sm"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line-md"></div>
          </div>
        </div>
      </div>
      <div v-else-if="store.error" class="state error">
        <div class="state-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p class="muted">{{ store.error }}</p>
      </div>
      <div v-else-if="!store.visibleProviders.length" class="state empty">
        <div class="state-icon">🔍</div>
        <h3>No providers match these filters</h3>
        <p class="muted">Try widening the distance or price range, or clearing the category.</p>
        <button class="btn-ui btn-ui-primary" @click="clearAllFilters">Clear all filters</button>
      </div>
      <div v-else class="prov-grid">
        <ProviderCard
          v-for="p in store.visibleProviders"
          :key="p.id"
          :provider="p"
          @view="openProvider"
          @book="bookProvider"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.providers-page { display: flex; flex-direction: column; gap: var(--spacing-md); }

/* ----- Hero header ----- */
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.page-head-text { min-width: 0; }
.page-head h1 {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, var(--color-text), var(--color-primary));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.page-head-sub {
  margin-top: 8px;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.page-head-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(34, 197, 94, 0.12);
  color: #16A34A;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 4px 12px;
  border-radius: 999px;
}
body.night-mode-active .page-head-pill { background: rgba(34, 197, 94, 0.2); color: #4ADE80; }
.pulse-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.page-head-stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.stat-pod {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  min-width: 110px;
}
.stat-pod-icon { font-size: 1.4rem; }
.stat-pod > div { display: flex; flex-direction: column; line-height: 1.1; }
.stat-pod-value { font-size: 1.05rem; font-weight: 800; color: var(--color-text); }
.stat-pod-label {
  font-size: 0.66rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

/* ----- Search bar ----- */
.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 260px;
}
.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  font-size: 0.95rem;
  opacity: 0.6;
  pointer-events: none;
}
.search-input {
  width: 100%;
  font-family: var(--font-main);
  font-size: 0.9rem;
  padding: 12px 40px 12px 40px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  transition: var(--transition-smooth);
}
.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.search-clear {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 24px; height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;
}
.search-clear:hover { background: var(--color-muted); color: var(--color-card); }

.sort-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px 12px;
}
.sort-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.sort-select {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-main);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px 4px;
  cursor: pointer;
  outline: none;
}
/* The native option popup defaults to a white background; give the options
   explicit theme colors so they stay readable in night mode. */
.sort-select option {
  background: var(--color-card);
  color: var(--color-text);
  font-weight: 600;
}

/* ----- Category bar ----- */
.category-filter-bar {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cfb-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.cfb-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
.filters-anchor { position: relative; flex-shrink: 0; }
.filters-btn { position: relative; }
.filters-btn.has-active { border-color: var(--color-primary); color: var(--color-primary); }
.filters-dot {
  position: absolute;
  top: 4px; right: 6px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-card);
}

.filters-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: 70vh;
  overflow-y: auto;
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  animation: fp-pop-in 0.15s ease;
}

@keyframes fp-pop-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .filters-popover { right: auto; left: 0; width: 100%; }
  .page-head h1 { font-size: 1.45rem; }
  .page-head-stats { width: 100%; }
  .stat-pod { flex: 1; min-width: 0; }
}

/* ----- Active filters ----- */
.active-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 2px;
  animation: af-fade-in 0.2s ease;
}
@keyframes af-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.af-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.af-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
  border: 1px solid rgba(37, 99, 235, 0.3);
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
body.night-mode-active .af-chip { background: rgba(37, 99, 235, 0.22); color: #93C5FD; }
.af-chip-x {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(37, 99, 235, 0.2);
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s;
}
.af-chip-x:hover { background: var(--color-primary); color: #fff; }
.af-clear-all {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--color-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
}
.af-clear-all:hover { color: var(--color-danger); }

/* ----- Grid / states ----- */
.prov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: var(--spacing-md);
}
.state {
  padding: 64px 24px;
  text-align: center;
  background: var(--color-card);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.state-icon { font-size: 3rem; opacity: 0.7; }
.state.error { color: var(--color-danger); }
.state.empty h3 { font-size: 1.15rem; font-weight: 800; }
.state.empty p { max-width: 360px; }
.state.empty .btn-ui { margin-top: 8px; }

/* ----- Skeleton loader ----- */
.skeleton-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.skeleton-banner {
  height: 110px;
  background: linear-gradient(90deg, var(--color-border) 0%, var(--color-background) 50%, var(--color-border) 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s infinite;
}
.skeleton-body { padding: 44px var(--spacing-lg) var(--spacing-lg); display: flex; flex-direction: column; gap: 10px; }
.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-border) 0%, var(--color-background) 50%, var(--color-border) 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.4s infinite;
}
.skeleton-line-lg { height: 18px; width: 60%; }
.skeleton-line-md { width: 75%; height: 16px; }
.skeleton-line-sm { width: 40%; height: 10px; }
@keyframes skel-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
