<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePublicTheme } from '@/composables/usePublicTheme'
import PasswordField from '@/components/PasswordField.vue'

const auth = useAuthStore()
const router = useRouter()
const { isDark, toggleTheme } = usePublicTheme()
const fileInput = ref(null)
const kycName = ref('')
const kycError = ref('')
const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
const form = reactive({ full_name: '', username: '', email: '', phone: '', password: '', password_confirmation: '', role: 'customer', bio: '', location: '', base_rate: '', service_category: '' })
const isProvider = computed(() => form.role === 'provider')
const fieldErrors = computed(() => auth.fieldErrors || {})

function fieldClass(name) {
  return { invalid: Boolean(fieldErrors.value[name]) }
}

function validateKyc(event) {
  const file = event.target.files[0]
  kycError.value = ''; kycName.value = ''
  if (!file) return
  const extension = file.name.split('.').pop().toLowerCase()
  if (!allowedTypes.includes(file.type) || !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) kycError.value = 'Only PDF, JPG, JPEG, or PNG files are allowed.'
  else if (file.size > 5 * 1024 * 1024) kycError.value = 'The KYC document must be 5 MB or smaller.'
  else kycName.value = file.name
  if (kycError.value) event.target.value = ''
}

async function submit() {
  if (isProvider.value && (!fileInput.value?.files[0] || kycError.value)) { kycError.value ||= 'A valid KYC document is required.'; return }
  const payload = new FormData()
  Object.entries(form).forEach(([key, value]) => payload.append(key, value))
  if (isProvider.value) payload.append('kyc_document', fileInput.value.files[0])
  try {
    // auth.register() resolves to the full { success, message, data } envelope.
    const env = await auth.register(payload)
    const developmentOtp = env?.data?.development_otp
    router.push({ name: 'otp', query: { email: form.email, ...(developmentOtp ? { code: developmentOtp } : {}) } })
  } catch { /* Store exposes the API error. */ }
}
</script>

<template>
  <section class="auth-page register-page">
    <button class="public-theme-toggle" type="button" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
      {{ isDark ? '☀️' : '🌙' }}
    </button>
    <div class="auth-layout container">
    <aside class="auth-aside register-visual-panel">
      <span class="eyebrow light"><i></i> Join FixIt</span>
      <h1>Build a trusted <br />FixIt account.</h1>
      <p>Register as a customer or submit your provider details for verification.</p>
      <div class="register-trust-grid" aria-label="FixIt trust highlights">
        <article>
          <span>01</span>
          <div>
            <strong>Verified access</strong>
            <small>Customers and providers start with account checks.</small>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <strong>Secure bookings</strong>
            <small>Requests, quotes, and payments stay in one flow.</small>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <strong>Provider KYC</strong>
            <small>Service profiles can be reviewed before going live.</small>
          </div>
        </article>
      </div>
      <div class="register-service-icons" aria-label="Popular service categories">
        <span>Plumbing</span><span>Electrical</span><span>Cleaning</span><span>AC Service</span>
      </div>
    </aside>
    <div class="auth-card auth-card-wide">
      <div class="card-heading"><span class="brand-mark">F</span><div><h2>Create account</h2><p>Use accurate details for account verification.</p></div></div>
      <div v-if="auth.error" class="alert error" role="alert">{{ auth.error }}</div>
      <form class="registration-form" :class="{ 'provider-registration': isProvider }" @submit.prevent="submit">
        <div class="registration-core">
          <label class="field" :class="fieldClass('full_name')"><span>Full name</span><input v-model.trim="form.full_name" required autocomplete="name" /><small v-if="fieldErrors.full_name" class="field-error">{{ fieldErrors.full_name }}</small></label>
          <label class="field" :class="fieldClass('username')"><span>Username</span><input v-model.trim="form.username" required autocomplete="username" /><small v-if="fieldErrors.username" class="field-error">{{ fieldErrors.username }}</small></label>
          <label class="field" :class="fieldClass('email')"><span>Email</span><input v-model.trim="form.email" required type="email" autocomplete="email" /><small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small></label>
          <label class="field" :class="fieldClass('phone')"><span>Phone</span><input v-model.trim="form.phone" required type="tel" autocomplete="tel" /><small v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</small></label>
          <PasswordField v-model="form.password" label="Password" required minlength="8" autocomplete="new-password" :error="fieldErrors.password" />
          <PasswordField v-model="form.password_confirmation" label="Confirm password" required autocomplete="new-password" :error="fieldErrors.password_confirmation" />
          <label class="field registration-role" :class="fieldClass('role')"><span>Account role</span><select v-model="form.role"><option value="customer">Customer</option><option value="provider">Service Provider</option></select><small v-if="fieldErrors.role" class="field-error">{{ fieldErrors.role }}</small></label>
        </div>
        <section v-if="isProvider" class="provider-profile-panel" aria-labelledby="provider-profile-title">
          <div class="provider-panel-heading">
            <strong id="provider-profile-title">Provider profile</strong>
            <span>Details used for professional verification.</span>
          </div>
          <label class="field" :class="fieldClass('bio')"><span>Bio</span><textarea v-model.trim="form.bio" required rows="3" placeholder="Describe your experience and services"></textarea><small v-if="fieldErrors.bio" class="field-error">{{ fieldErrors.bio }}</small></label>
          <label class="field" :class="fieldClass('location')"><span>Location</span><input v-model.trim="form.location" required /><small v-if="fieldErrors.location" class="field-error">{{ fieldErrors.location }}</small></label>
          <label class="field" :class="fieldClass('base_rate')"><span>Base rate (RM)</span><input v-model="form.base_rate" required type="number" min="0" step="0.01" /><small v-if="fieldErrors.base_rate" class="field-error">{{ fieldErrors.base_rate }}</small></label>
          <label class="field" :class="fieldClass('service_category')"><span>Service category</span><select v-model="form.service_category" required><option disabled value="">Select category</option><option>Plumbing</option><option>Electrical</option><option>Cleaning</option><option>Gardening</option><option>AC Service</option></select><small v-if="fieldErrors.service_category" class="field-error">{{ fieldErrors.service_category }}</small></label>
          <label class="upload-field" :class="{ invalid: kycError || fieldErrors.kyc_document }"><span>KYC document <small>PDF, JPG, JPEG or PNG, maximum 5 MB</small></span><input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" @change="validateKyc" /><strong>{{ kycName || 'Choose document' }}</strong></label>
          <p v-if="kycError || fieldErrors.kyc_document" class="field-error">{{ kycError || fieldErrors.kyc_document }}</p>
        </section>
        <button class="button button-primary submit-button registration-submit" :disabled="auth.loading">{{ auth.loading ? 'Creating account...' : 'Create account' }}</button>
      </form>
      <p class="auth-switch">Already registered? <RouterLink to="/login">Sign in</RouterLink></p>
    </div>
  </div></section>
</template>
