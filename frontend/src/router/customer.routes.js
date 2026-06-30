const AppShell = () => import('@/components/AppShell.vue')
const CustomerDashboard = () => import('@/views/customer/CustomerDashboard.vue')
const CategoriesView = () => import('@/views/customer/CategoriesView.vue')
const ProvidersView = () => import('@/views/customer/ProvidersView.vue')
const ProviderDetailsView = () => import('@/views/customer/ProviderDetailsView.vue')
const CreateBookingView = () => import('@/views/customer/CreateBookingView.vue')
const MyBookingsView = () => import('@/views/customer/MyBookingsView.vue')
const JobTicketView = () => import('@/views/customer/JobTicketView.vue')
const RecurringBookingsView = () => import('@/views/customer/RecurringBookingsView.vue')
const ReviewsView = () => import('@/views/customer/ReviewsView.vue')
const MapView = () => import('@/views/customer/MapView.vue')
const AccountSettingsView = () => import('@/views/customer/AccountSettingsView.vue')
const MyProfileView = () => import('@/views/customer/MyProfileView.vue')

export const customerBrowsingRoutes = [
  {
    path: '/customer',
    component: AppShell,
    meta: { requiresAuth: true, role: 'customer' },
    children: [
      { path: '',          name: 'dashboard',        component: CustomerDashboard },
      { path: 'home',      redirect: '/customer' },
      { path: 'categories',name: 'categories',       component: CategoriesView },
      { path: 'providers', name: 'providers',        component: ProvidersView },
      { path: 'providers/:id', name: 'provider-details', component: ProviderDetailsView, props: true },
      { path: 'bookings/create', name: 'create-booking',     component: CreateBookingView },
      { path: 'bookings',        name: 'my-bookings',        component: MyBookingsView },
      { path: 'bookings/:id',    name: 'job-ticket',         component: JobTicketView, props: true },
      { path: 'recurring',       name: 'recurring-bookings', component: RecurringBookingsView },
      { path: 'reviews',         name: 'reviews',            component: ReviewsView },
      { path: 'map',             name: 'map',                component: MapView },
      { path: 'settings',        name: 'settings',          component: AccountSettingsView },
      { path: 'profile',         name: 'profile',            component: MyProfileView },
    ]
  }
]

export default customerBrowsingRoutes
