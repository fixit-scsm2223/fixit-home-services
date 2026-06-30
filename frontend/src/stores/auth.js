// ============================================================
// FixIt — Unified auth store.
// Login saves the JWT + role to storage and resolves the role so
// callers (login view / router guard) can route by role:
//   customer -> /customer, provider -> /provider/dashboard,
//   admin    -> /admin/dashboard
// ============================================================
import { defineStore } from 'pinia'
import { authApi } from '@/services/authApi'

export const HOME_BY_ROLE = {
  customer: '/customer',
  provider: '/provider/dashboard',
  admin: '/admin/dashboard',
}

function clearStoredSession() {
  const keys = ['fixit_token', 'fixit_role', 'fixit_user', 'fixit_session', 'fixit_auth']
  for (const store of [localStorage, sessionStorage]) {
    keys.forEach((key) => store.removeItem(key))
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    role: localStorage.getItem('fixit_role') || sessionStorage.getItem('fixit_role') || null,
    loading: false,
    error: '',
    fieldErrors: {},
  }),

  getters: {
    isAuthenticated: () =>
      !!(localStorage.getItem('fixit_token') || sessionStorage.getItem('fixit_token')),
    homePath: (state) => HOME_BY_ROLE[state.role] || '/login',
  },

  actions: {
    homeForRole(role) {
      return HOME_BY_ROLE[role] || '/login'
    },

    clearError() {
      this.error = ''
      this.fieldErrors = {}
    },

    async login(credentials) {
      this.loading = true
      this.clearError()
      // Clear previous user immediately so stale state is never visible
      this.user = null
      this.role = null
      try {
        const env  = await authApi.login(credentials)
        // http.js interceptor unwraps the envelope → env = { token, user, ... }
        const data = env?.data || {}
        const user = data.user || null
        if (!data.token || !user || !user.role) {
          throw new Error('The server returned incomplete login details.')
        }
        clearStoredSession()
        const storage = credentials.remember ? localStorage : sessionStorage
        storage.setItem('fixit_token', data.token)
        storage.setItem('fixit_role', user.role)
        // Overwrite with the exact object returned by the API
        this.user = { ...user }
        this.role = user.role
        return data
      } catch (error) {
        this.error       = error.message
        this.fieldErrors = error.errors || {}
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(formData) {
      this.loading = true
      this.clearError()
      try {
        return await authApi.register(formData)
      } catch (error) {
        this.error = error.message
        this.fieldErrors = error.errors || {}
        throw error
      } finally {
        this.loading = false
      }
    },

    // Validate the stored token and refresh the current user (used by the guard).
    // Always overwrites this.user — never merges with stale state.
    async fetchMe() {
      const env  = await authApi.me()
      // http.js unwraps envelope → env = { success, message, data: { user } }
      const user = env?.data?.user || null
      this.user  = user ? { ...user } : null
      this.role  = user?.role ?? this.role
      return this.user
    },

    async logout() {
      try {
        await authApi.logout()
      } catch {
        /* ignore network/credential errors on logout */
      } finally {
        clearStoredSession()
        this.user = null
        this.role = null
      }
    },
  },
})
