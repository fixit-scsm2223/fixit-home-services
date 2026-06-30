<script setup>
import { reactive, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { authApi } from '@/services/authApi'
import { usePublicTheme } from '@/composables/usePublicTheme'

const route = useRoute()
const form = reactive({ email: route.query.email || '', otp: route.query.code || '' })
const loading = ref(false), message = ref(''), error = ref('')
const { isDark, toggleTheme } = usePublicTheme()
async function submit() { loading.value = true; error.value = ''; try { const data = await authApi.verifyOtp(form); message.value = data.message } catch (e) { error.value = e.message } finally { loading.value = false } }
</script>

<template>
  <section class="simple-auth">
    <button class="public-theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
    <div class="compact-card">
      <span class="brand-mark">F</span>
      <h1>Verify your account</h1>
      <p>Enter the six-digit code sent to your email.</p>
      <div v-if="message" class="alert success">{{ message }}</div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <form class="form-grid" @submit.prevent="submit">
        <label class="field">
          <span>Email</span>
          <input v-model.trim="form.email" required type="email" />
        </label>
        <label class="field">
          <span>Verification code</span>
          <input v-model.trim="form.otp" required inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="000000" />
        </label>
        <button class="button button-primary submit-button" :disabled="loading">{{ loading ? 'Verifying...' : 'Verify account' }}</button>
      </form>
      <p class="auth-switch"><RouterLink to="/login">Return to sign in</RouterLink></p>
    </div>
  </section>
</template>
