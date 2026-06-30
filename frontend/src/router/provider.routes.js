const ProviderLayout = () => import('@/components/ProviderLayout.vue')
const ProviderDashboard = () => import('@/views/provider/ProviderDashboard.vue')
const JobRequests = () => import('@/views/provider/JobRequests.vue')
const MyJobs = () => import('@/views/provider/MyJobs.vue')
const AvailabilityCalendar = () => import('@/views/provider/AvailabilityCalendar.vue')
const KycUpload = () => import('@/views/provider/KycUpload.vue')
const Earnings = () => import('@/views/provider/Earnings.vue')
const Reviews = () => import('@/views/provider/Reviews.vue')
const Analytics = () => import('@/views/provider/Analytics.vue')
const ProviderProfile = () => import('@/views/provider/ProviderProfile.vue')
const ProviderSettings = () => import('@/views/provider/ProviderSettings.vue')

export const providerPortalRoutes = [
  {
    path: '/provider',
    component: ProviderLayout,
    meta: { requiresAuth: true, role: 'provider' },
    children: [
      { path: '', redirect: '/provider/dashboard' },
      { path: 'dashboard', name: 'provider-dashboard', component: ProviderDashboard, meta: { icon: '📊', label: 'Dashboard', group: 'Main' } },
      { path: 'my-jobs', name: 'provider-my-jobs', component: MyJobs, meta: { icon: '🛠️', label: 'Job Management', group: 'Main' } },
      { path: 'job-requests', name: 'provider-job-requests', component: JobRequests, meta: { icon: '📋', label: 'Job Requests', group: 'Main', hidden: true } },
      { path: 'availability', name: 'provider-availability', component: AvailabilityCalendar, meta: { icon: '📅', label: 'My Schedule', group: 'Main' } },
      { path: 'earnings', name: 'provider-earnings', component: Earnings, meta: { icon: '💰', label: 'Earnings', group: 'Business' } },
      { path: 'reviews', name: 'provider-reviews', component: Reviews, meta: { icon: '⭐', label: 'Reviews', group: 'Business' } },
      { path: 'analytics', name: 'provider-analytics', component: Analytics, meta: { icon: '📈', label: 'Analytics', group: 'Business' } },
      { path: 'profile', name: 'provider-profile', component: ProviderProfile, meta: { icon: '👤', label: 'Profile', group: 'Account' } },
      { path: 'kyc', name: 'provider-kyc', component: KycUpload, meta: { icon: '🛡️', label: 'KYC Verification', group: 'Account', hidden: true } },
      { path: 'settings', name: 'provider-settings', component: ProviderSettings, meta: { icon: '⚙️', label: 'Settings', group: 'Account' } },
      { path: 'jobs/:id', redirect: '/provider/my-jobs' },
    ],
  },
]

export default providerPortalRoutes
