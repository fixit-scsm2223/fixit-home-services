<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authApi } from '@/services/authApi'
import { usePublicTheme } from '@/composables/usePublicTheme'

const email = ref(''), loading = ref(false), message = ref(''), error = ref('')
const { isDark, toggleTheme } = usePublicTheme()
async function submit() { loading.value = true; error.value = ''; try { const data = await authApi.forgotPassword({ email: email.value }); message.value = data.message } catch (e) { error.value = e.message } finally { loading.value = false } }
</script>

<template>
  <section class="simple-auth">
    <button class="public-theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
    <div class="compact-card">
      <span class="brand-mark">F</span>
      <h1>Reset your password</h1>
      <p>Enter your registered email and we will send password reset instructions.</p>
      <div v-if="message" class="alert success">{{ message }}</div>
      <div v-if="error" class="alert error">{{ error }}</div>
      <form class="form-grid" @submit.prevent="submit">
        <label class="field">
          <span>Email address</span>
          <input v-model.trim="email" required type="email" autocomplete="email" />
        </label>
        <button class="button button-primary submit-button" :disabled="loading">{{ loading ? 'Sending...' : 'Send reset instructions' }}</button>
      </form>
      <p class="auth-switch"><RouterLink to="/login">Return to sign in</RouterLink></p>
    </div>
  </section>
</template>
