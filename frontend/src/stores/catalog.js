// ============================================================
// FixIt — Catalog Store (Member 1)
// Holds service categories, the provider list, and the customer
// filter state. Filtering is sent to the backend as query params
// (authoritative), with a client-side mirror for instant feedback.
// ============================================================

import { defineStore } from 'pinia'
import { catalogApi } from '@/services/api'

const defaultFilters = () => ({
  categoryId: null,   // null = all categories
  maxDistance: 25,    // km
  minPrice: 0,        // RM
  maxPrice: 200,      // RM
  minRating: 0,       // 0–5
  sort: 'rating',     // 'rating' | 'price_asc' | 'price_desc' | 'distance'
  search: '',
})

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [],
    providers: [],
    activeProvider: null,
    activeReviews: [],
    filters: defaultFilters(),
    loading: false,
    error: null,
    // Customer's detected/declared location. Defaults to the project's demo
    // location in Skudai until geolocation succeeds (or falls back here on
    // denial/error so nearby search always has a location to work with).
    customerLocation: { lat: 1.5375, lng: 103.6306, label: 'Skudai, Johor' },

    // Map Radar — nearby-provider search driven by the customer's location.
    nearbyProviders: [],
    nearbyLoading: false,
    nearbyError: null,
    nearbyRadius: 10,
    // 'idle' | 'detecting' | 'granted' | 'denied' | 'unavailable' | 'error'
    locationStatus: 'idle',
    locationMessage: null,
  }),

  getters: {
    categoryCount: (s) => s.categories.length,
    providerCount: (s) => s.providers.length,

    // Client-side mirror of the filters — used so the UI updates instantly
    // while a debounced backend refetch confirms the authoritative result.
    visibleProviders: (s) => {
      let list = [...s.providers]
      const f = s.filters

      if (f.categoryId) {
        list = list.filter((p) =>
          (p.categories || []).some((c) => c.id === f.categoryId)
        )
      }
      if (f.search.trim()) {
        const q = f.search.toLowerCase()
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.service || '').toLowerCase().includes(q) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(q))
        )
      }
      list = list.filter(
        (p) =>
          Number(p.base_rate) >= f.minPrice &&
          Number(p.base_rate) <= f.maxPrice &&
          Number(p.rating || 0) >= f.minRating &&
          (p.distance == null || Number(p.distance) <= f.maxDistance)
      )

      switch (f.sort) {
        case 'price_asc':  list.sort((a, b) => a.base_rate - b.base_rate); break
        case 'price_desc': list.sort((a, b) => b.base_rate - a.base_rate); break
        case 'distance':   list.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9)); break
        default:           list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      }
      return list
    },
  },

  actions: {
    async loadCategories() {
      this.loading = true
      this.error = null
      try {
        const res = await catalogApi.getCategories()
        this.categories = res.data || []
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async loadProviders() {
      this.loading = true
      this.error = null
      try {
        const f = this.filters
        const params = {}
        if (f.categoryId)       params.category_id   = f.categoryId
        if (f.search.trim())    params.search        = f.search.trim()
        if (f.minRating > 0)    params.min_rating    = f.minRating
        if (f.minPrice > 0)     params.min_price     = f.minPrice
        if (f.maxPrice < 200)   params.max_price     = f.maxPrice
        if (f.maxDistance < 25) params.max_distance  = f.maxDistance
        if (f.sort)             params.sort          = f.sort
        const res = await catalogApi.getProviders(params)
        this.providers = (res.data || []).map((p) => {
          const categories = Array.isArray(p.categories) ? p.categories : []
          return {
            ...p,
            categories,
            service: p.service || p.service_category || categories[0]?.name || 'Home service',
            rating:    Number(p.rating    ?? 0),
            base_rate: Number(p.base_rate ?? 0),
            distance:  p.distance != null ? Number(p.distance) : null,
          }
        })
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async loadProvider(id) {
      this.loading = true
      this.error = null
      this.activeProvider = null
      try {
        const [pRes, rRes] = await Promise.all([
          catalogApi.getProvider(id),
          catalogApi.getProviderReviews(id).catch(() => ({ data: [] })),
        ])
        this.activeProvider = pRes.data || null
        this.activeReviews = rRes.data || []
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    setFilter(patch) {
      this.filters = { ...this.filters, ...patch }
    },

    resetFilters() {
      this.filters = defaultFilters()
    },

    // Map Radar — ask the browser for the customer's real position. Falls
    // back to the demo location on denial/unavailability/timeout so nearby
    // search always has something to query with.
    detectLocation() {
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          this.locationStatus = 'unavailable'
          this.locationMessage = 'Your browser does not support location detection.'
          resolve(false)
          return
        }

        this.locationStatus = 'detecting'
        this.locationMessage = null

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.customerLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              label: 'Your current location',
            }
            this.locationStatus = 'granted'
            this.locationMessage = null
            resolve(true)
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              this.locationStatus = 'denied'
              this.locationMessage = 'Location access was denied. Showing providers near your saved address instead.'
            } else if (err.code === err.TIMEOUT) {
              this.locationStatus = 'error'
              this.locationMessage = 'Location request timed out. Showing providers near your saved address instead.'
            } else {
              this.locationStatus = 'unavailable'
              this.locationMessage = 'Your location is unavailable right now. Showing providers near your saved address instead.'
            }
            resolve(false)
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      })
    },

    async loadNearbyProviders(radius = this.nearbyRadius) {
      this.nearbyRadius = radius
      this.nearbyLoading = true
      this.nearbyError = null
      try {
        const { lat, lng } = this.customerLocation
        const res = await catalogApi.getNearbyProviders({ lat, lng, radius })
        this.nearbyProviders = (res.data || []).map((p) => ({
          ...p,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          distance: Number(p.distance),
          rating: Number(p.rating || 0),
          base_rate: Number(p.base_rate),
        }))
      } catch (e) {
        this.nearbyError = e.message
      } finally {
        this.nearbyLoading = false
      }
    },
  },
})
