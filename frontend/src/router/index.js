import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { customerBrowsingRoutes } from './customer.routes'
import { providerPortalRoutes } from './provider.routes'
import { adminRoutes } from './admin.routes'

const WelcomeView = () => import('@/views/auth/WelcomeView.vue')
const LoginView = () => import('@/views/auth/LoginView.vue')
const RegisterView = () => import('@/views/auth/RegisterView.vue')
const OtpView = () => import('@/views/auth/OtpView.vue')
const ForgotPasswordView = () => import('@/views/auth/ForgotPasswordView.vue')

function hasStoredToken() {
  return !!(localStorage.getItem('fixit_token') || sessionStorage.getItem('fixit_token'))
}

function applyScrollMode(path) {
  const usesShellScroll = path.startsWith('/customer') || path.startsWith('/provider')
  document.body.classList.toggle('fixit-shell-layout', usesShellScroll)
  document.body.classList.toggle('fixit-document-layout', !usesShellScroll)
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'welcome', component: WelcomeView, meta: { publicOnly: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { publicOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { publicOnly: true } },
    { path: '/verify-otp', name: 'otp', component: OtpView },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },

    ...customerBrowsingRoutes,
    ...providerPortalRoutes,
    ...adminRoutes,

    {
      path: '/:pathMatch(.*)*',
      redirect: () => {
        const auth = useAuthStore()
        return auth.role ? auth.homeForRole(auth.role) : '/login'
      },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const hasToken = hasStoredToken()

  // Already-authenticated users shouldn't see the welcome/login/register screens.
  if (to.meta.publicOnly && hasToken && auth.role) {
    return { path: auth.homeForRole(auth.role) }
  }

  if (!to.meta.requiresAuth) return true

  if (!hasToken) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Fast path: trust the already-validated session if its role already matches.
  if (auth.user && (!to.meta.role || auth.role === to.meta.role)) {
    return true
  }

  try {
    const user = await auth.fetchMe()
    if (to.meta.role && user.role !== to.meta.role) {
      return { path: '/login', query: { access: to.meta.role } }
    }
    return true
  } catch (error) {
    await auth.logout()
    return { path: '/login', query: { redirect: to.fullPath, server: error.status && error.status >= 500 ? 'unavailable' : undefined } }
  }
})

router.afterEach((to) => {
  applyScrollMode(to.path)
})

export default router
