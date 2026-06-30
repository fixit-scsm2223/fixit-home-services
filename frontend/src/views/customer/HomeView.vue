<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import CategoryCard from '@/components/CategoryCard.vue'
import ProviderCard from '@/components/ProviderCard.vue'

const store = useCatalogStore()
const router = useRouter()
const searchText = ref('')

onMounted(() => {
  if (!store.categories.length) store.loadCategories()
  if (!store.providers.length) store.loadProviders()
})

function runSearch() {
  store.setFilter({ search: searchText.value })
  router.push({ name: 'providers' })
}

function openCategory(category) {
  store.setFilter({ categoryId: category.id })
  router.push({ name: 'providers' })
}

function openProvider(provider) {
  router.push({ name: 'provider-details', params: { id: provider.id } })
}

function bookProvider(provider) {
  router.push({ name: 'create-booking', query: { provider: provider.id } })
}
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-copy">
        <h1>Plumbing, electrical, cleaning — verified locals, one tap away.</h1>
        <p class="muted">
          Find trusted home service professionals across Skudai, Johor. Transparent
          quotes, verified providers, and reviews from real customers.
        </p>
        <div class="hero-search">
          <div class="hs-field">
            <span>🔍</span>
            <input
              v-model="searchText"
              type="text"
              placeholder="What needs fixing? e.g. clogged pipe"
              @keydown.enter="runSearch"
            />
          </div>
          <div class="hs-field hs-loc">
            <span>📍</span>
            <input type="text" :value="store.customerLocation.label" readonly />
          </div>
          <button class="btn-ui btn-ui-primary" @click="runSearch">Search</button>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="block">
      <div class="block-head">
        <h2>Browse by service</h2>
        <button class="btn-ui btn-ui-sm btn-ui-outline" @click="router.push({ name: 'categories' })">
          See all
        </button>
      </div>
      <div class="cat-grid">
        <CategoryCard
          v-for="c in store.categories.slice(0, 5)"
          :key="c.id"
          :category="c"
          @select="openCategory"
        />
      </div>
    </section>

    <!-- Featured providers -->
    <section class="block">
      <div class="block-head">
        <h2>Top-rated near you</h2>
        <button class="btn-ui btn-ui-sm btn-ui-outline" @click="router.push({ name: 'providers' })">
          View all providers
        </button>
      </div>
      <div v-if="store.loading" class="state muted">Loading providers…</div>
      <div v-else-if="store.error" class="state error">{{ store.error }}</div>
      <div v-else class="prov-grid">
        <ProviderCard
          v-for="p in store.visibleProviders.slice(0, 3)"
          :key="p.id"
          :provider="p"
          @view="openProvider"
          @book="bookProvider"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.hero {
  background: linear-gradient(135deg, var(--color-primary), #1D4ED8);
  border-radius: var(--radius-lg);
  padding: 48px 40px;
  color: #fff;
}
.hero-copy { max-width: 680px; }
.hero h1 { font-size: 2rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
.hero p { color: rgba(255,255,255,0.85); margin: 14px 0 24px; font-size: 0.95rem; }
.hero-search {
  display: flex; gap: 10px; background: var(--color-card);
  padding: 10px; border-radius: var(--radius-md); flex-wrap: wrap;
}
.hs-field {
  flex: 1; min-width: 180px;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; color: var(--color-text);
}
.hs-loc { border-left: 2px solid var(--color-border); flex: 0 1 200px; }
.hs-field input { border: none; outline: none; width: 100%; font-family: var(--font-main); background: transparent; color: var(--color-text); font-size: 0.9rem; }
.block { display: flex; flex-direction: column; gap: var(--spacing-md); }
.block-head { display: flex; align-items: center; justify-content: space-between; }
.block-head h2 { font-size: 1.25rem; font-weight: 800; }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--spacing-md); }
.prov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-md); }
.state { padding: 32px; text-align: center; }
.state.error { color: var(--color-danger); }

@media (max-width: 640px) {
  .hero { padding: 32px 20px; }
  .hero h1 { font-size: 1.5rem; }
  .hs-loc { border-left: none; }
}
</style>
