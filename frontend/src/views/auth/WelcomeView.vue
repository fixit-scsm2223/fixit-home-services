<template>
  <section class="welcome-section">
    <button class="public-theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
    <p v-if="logoutToast" class="public-toast success" role="status">{{ logoutToast }}</p>

    <div class="welcome-frame">
      <nav class="welcome-nav" aria-label="Welcome navigation">
        <div class="welcome-brand-row">
          <RouterLink class="welcome-logo" to="/" aria-label="FixIt home">
            <span>Fix<span>It</span></span>
          </RouterLink>
          <span class="eyebrow"><i></i> Secure access to local services</span>
        </div>

        <div class="welcome-nav-actions">
          <RouterLink class="welcome-nav-login" to="/login">Login</RouterLink>
          <RouterLink class="button button-primary" to="/register">Join Now</RouterLink>
        </div>
      </nav>

      <div class="welcome-grid premium-welcome-grid">
        <div class="welcome-copy">
          <span class="welcome-kicker">Verified local help</span>
          <h1>Trusted <span>Home Services,</span> Ready When You Are.</h1>
          <p>Book verified local providers, track every job, confirm final costs, and pay securely from one FixIt account.</p>
          <div class="welcome-actions">
            <RouterLink class="button button-primary button-large" to="/login">Find a Provider</RouterLink>
            <RouterLink class="button button-ghost button-large" to="/register">Join FixIt</RouterLink>
          </div>
          <div class="trust-list">
            <span>Verified Providers</span>
            <span>Secure Booking Flow</span>
            <span>Transparent Pricing</span>
            <span>Customer Reviews</span>
          </div>
        </div>

        <div class="brand-card premium-service-scene" aria-label="FixIt service preview">
          <span class="scene-dash scene-dash-top"></span>
          <span class="scene-dash scene-dash-bottom"></span>
          <span class="scene-icon scene-icon-calendar">3PM</span>
          <span class="scene-icon scene-icon-shield">SEC</span>
          <div class="service-disc" aria-hidden="true"></div>

          <div class="booking-visual-card">
            <div class="booking-visual-head">
              <span><i></i> Live booking</span>
              <strong>Today, 3:00 PM</strong>
            </div>
            <div class="booking-service-row">
              <b>AC</b>
              <div>
                <strong>AC Service</strong>
                <span>Verified provider assigned</span>
              </div>
            </div>
            <div class="booking-status-track" aria-label="Booking progress">
              <span class="done">Booked</span>
              <span class="done">Matched</span>
              <span>Pay</span>
            </div>
            <div class="booking-provider-row">
              <span class="brand-card-mark">F</span>
              <div>
                <strong>4.9 rated provider</strong>
                <p>Transparent final cost</p>
              </div>
            </div>
            <div class="booking-security-row">
              <span>Secure payment</span>
              <strong>Stripe protected</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { usePublicTheme } from '../../composables/usePublicTheme'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const { isDark, toggleTheme } = usePublicTheme()
const logoutToast = ref('')
let logoutToastTimer = 0

onMounted(() => {
  logoutToast.value = sessionStorage.getItem('fixit_logout_toast') || ''
  sessionStorage.removeItem('fixit_logout_toast')
  if (logoutToast.value) {
    logoutToastTimer = window.setTimeout(() => {
      logoutToast.value = ''
    }, 3200)
  }
})

onBeforeUnmount(() => {
  if (logoutToastTimer) window.clearTimeout(logoutToastTimer)
})
</script>
