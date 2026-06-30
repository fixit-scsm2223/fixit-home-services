<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProviderStore } from '@/stores/provider'

defineProps({ collapsed: Boolean })
defineEmits(['toggle'])

const router = useRouter()
const route  = useRoute()
const store  = useProviderStore()

const navRoutes = router.getRoutes().filter(r => r.path.startsWith('/provider/') && r.meta?.label && !r.meta?.hidden)

const groupOrder = ['Main', 'Business', 'Account']
const groupedNav = computed(() => {
  return groupOrder
    .map(group => ({ group, items: navRoutes.filter(r => r.meta.group === group) }))
    .filter(g => g.items.length > 0)
})

const initials = computed(() => {
  const name = store.profile.name || ''
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
})
</script>

<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="sidebar-brand">
      <div class="brand-logo"><span>Fix</span>It</div>
      <button class="sidebar-toggle" @click="$emit('toggle')">
        {{ collapsed ? '→' : '←' }}
      </button>
    </div>

    <div class="sidebar-menu">
      <div v-for="section in groupedNav" :key="section.group" class="sidebar-section">
        <div class="sidebar-section-label">{{ section.group.toUpperCase() }}</div>
        <ul class="sidebar-section-list">
          <li v-for="r in section.items" :key="r.name">
            <router-link
              :to="r.path"
              class="nav-link"
              :class="{ active: route.name === r.name }"
            >
              <span class="nav-icon">{{ r.meta.icon }}</span>
              <span class="nav-text">{{ r.meta.label }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="user-avatar">{{ initials }}</div>
      <div class="user-info">
        <h4>{{ store.profile.name }}</h4>
        <p>{{ store.kyc.status === 'verified' ? 'Verified Provider' : store.kyc.status === 'submitted' ? 'Verification Pending' : store.kyc.status === 'rejected' ? 'Verification Rejected' : 'Not Verified' }}</p>
      </div>
    </div>
  </aside>
</template>
