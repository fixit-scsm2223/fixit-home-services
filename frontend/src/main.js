import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/theme.css'
import './assets/auth.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialise the unified auth store before the router guard runs
// (restores token/role from storage on a fresh page load).
useAuthStore()

app.use(router)
app.mount('#app')
