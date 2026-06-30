<script setup>
// Filter controls for the provider listing. Emits 'change' (debounced
// by the parent into a backend refetch) and 'reset'.
import { computed } from 'vue'
import { useCatalogStore } from '@/stores/catalog'

const store = useCatalogStore()
const emit = defineEmits(['change', 'reset', 'close'])

const f = computed(() => store.filters)

function update(patch) {
  store.setFilter(patch)
  emit('change')
}
function reset() {
  store.resetFilters()
  emit('reset')
}
</script>

<template>
  <aside class="filter-panel">
    <div class="fp-head">
      <h3>Filters</h3>
      <div class="fp-head-actions">
        <button class="btn-ui btn-ui-sm btn-ui-outline" @click="reset">Clear all</button>
        <button class="fp-close" type="button" aria-label="Close filters" @click="$emit('close')">✕</button>
      </div>
    </div>

    <div class="fp-row">
      <!-- Distance -->
      <div class="fp-group">
        <label class="fp-label">Max distance <span class="fp-val">{{ f.maxDistance }} km</span></label>
        <input
          type="range" min="1" max="50" step="1" class="fp-range"
          :value="f.maxDistance"
          @input="update({ maxDistance: Number($event.target.value) })"
        />
      </div>

      <!-- Price -->
      <div class="fp-group">
        <label class="fp-label">
          Hourly rate
          <span class="fp-val">RM {{ f.minPrice }} – RM {{ f.maxPrice }}</span>
        </label>
        <div class="fp-dual">
          <input
            type="range" min="0" max="200" step="5" class="fp-range"
            :value="f.minPrice"
            @input="update({ minPrice: Math.min(Number($event.target.value), f.maxPrice) })"
          />
          <input
            type="range" min="0" max="200" step="5" class="fp-range"
            :value="f.maxPrice"
            @input="update({ maxPrice: Math.max(Number($event.target.value), f.minPrice) })"
          />
        </div>
      </div>

      <!-- Rating -->
      <div class="fp-group">
        <label class="fp-label">Minimum rating</label>
        <div class="chip-row">
          <button
            v-for="r in [0, 3, 3.5, 4, 4.5]"
            :key="r"
            class="btn-chip"
            :class="{ active: f.minRating === r }"
            @click="update({ minRating: r })"
          >{{ r === 0 ? 'Any' : `${r}★+` }}</button>
        </div>
      </div>

      <!-- Sort -->
      <div class="fp-group">
        <label class="fp-label">Sort by</label>
        <select
          class="form-select-control"
          :value="f.sort"
          @change="update({ sort: $event.target.value })"
        >
          <option value="rating">Highest rated</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="distance">Nearest first</option>
        </select>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.filter-panel {
  background: var(--color-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.fp-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.fp-head h3 { font-size: 1rem; font-weight: 800; }
.fp-head-actions { display: flex; align-items: center; gap: 10px; }
.fp-close {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem;
  transition: var(--transition-smooth);
}
.fp-close:hover { border-color: var(--color-primary); color: var(--color-primary); }
.fp-row { display: flex; flex-direction: column; gap: var(--spacing-md); }
.fp-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.fp-label {
  font-size: 0.78rem; font-weight: 700; color: var(--color-text);
  display: flex; justify-content: space-between; align-items: center;
}
.fp-val { font-weight: 600; color: var(--color-primary); font-size: 0.76rem; }
.fp-range { width: 100%; accent-color: var(--color-primary); cursor: pointer; margin: 4px 0; }
.fp-dual { display: flex; flex-direction: column; gap: 2px; }
</style>
