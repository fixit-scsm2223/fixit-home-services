const AdminDashboard = () => import('@/views/admin/AdminDashboard.vue')

export const adminRoutes = [
  {
    path: '/admin',
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/:section(dashboard|users|provider-verification|providers|jobs|analytics|profile|settings)?',
    name: 'admin-dashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, role: 'admin' },
  },
]

export default adminRoutes
