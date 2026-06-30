// ============================================================
// FixIt — Provider API service (uses the shared Axios client).
// Each call resolves to the { success, message, data } envelope;
// the provider store reads `.data` for the payload.
// ============================================================
import http from './http'
import { API_BASE_URL } from './apiBase'

function authHeaders() {
  const token = localStorage.getItem('fixit_token') || sessionStorage.getItem('fixit_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const providerApi = {
  getProfile: () => http.get('/provider/profile'),
  updateProfile: (payload) => http.put('/provider/profile', payload),
  uploadKyc: (formData) => http.post('/provider/kyc', formData),
  downloadKyc: async () => {
    const response = await fetch(`${API_BASE_URL}/provider/kyc/download`, { headers: authHeaders() })
    if (!response.ok) throw new Error('Unable to download current KYC document.')
    return response.blob()
  },
  updateCategories: (categoryIds) => http.put('/provider/categories', { category_ids: categoryIds }),

  getJobs: () => http.get('/provider/jobs'),

  getAvailability: () => http.get('/provider/availability'),
  addAvailability: (blockedDate) => http.post('/provider/availability', { blocked_date: blockedDate }),
  deleteAvailability: (id) => http.delete(`/provider/availability/${id}`),

  getEarnings: () => http.get('/provider/earnings'),
  requestWithdrawal: () => http.post('/provider/earnings/withdraw'),

  getReviews: () => http.get('/provider/reviews'),
  getAnalytics: () => http.get('/provider/analytics'),

  getSettings: () => http.get('/provider/settings'),
  updateSettings: (payload) => http.put('/provider/settings', payload),

  acceptJob: (id) => http.put(`/jobs/${id}/accept`),
  rejectJob: (id) => http.put(`/jobs/${id}/reject`),
  updateJobStatus: (id, status) => http.put(`/jobs/${id}/status`, { status }),
  submitFinalCost: (id, payload) => http.put(`/jobs/${id}/final-cost`, payload),

  getMessages: (jobId) => http.get(`/jobs/${jobId}/messages`),
  sendMessage: (jobId, body) => http.post(`/jobs/${jobId}/messages`, { body }),
}

export default providerApi
