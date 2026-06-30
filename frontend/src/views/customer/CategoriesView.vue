<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import CategoryCard from '@/components/CategoryCard.vue'

const store = useCatalogStore()
const router = useRouter()

onMounted(() => {
  if (!store.categories.length) store.loadCategories()
})

function openCategory(category) {
  store.setFilter({ categoryId: category.id })
  router.push({ name: 'providers' })
}
</script>

<template>
  <div class="categories-page">
    <header class="page-head">
      <h1>Service categories</h1>
      <p class="muted">Pick a category to see verified providers offering that service.</p>
    </header>

    <div v-if="store.loading" class="state muted">Loading categories…</div>
    <div v-else-if="store.error" class="state error">{{ store.error }}</div>
    <div v-else-if="!store.categories.length" class="state muted">
      No categories available yet. Check back soon.
    </div>
    <div v-else class="cat-grid">
      <CategoryCard
        v-for="c in store.categories"
        :key="c.id"
        :category="c"
        @select="openCategory"
      />
    </div>
  </div>
</template>

<style scoped>
.categories-page { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.page-head h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
.page-head p { margin-top: 6px; font-size: 0.9rem; }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--spacing-md); }
.state { padding: 40px; text-align: center; }
.state.error { color: var(--color-danger); }
</style>
