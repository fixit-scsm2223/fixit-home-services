// ============================================================
// FixIt — Customer API service (catalog browsing + bookings).
// Uses the single shared Axios client (services/http.js). Its
// response interceptor returns the { success, message, data }
// envelope, so callers read `.data` for the payload.
// ============================================================
import http from './http'

export const catalogApi = {
  // GET /categories
  getCategories() {
    return http.get('/categories')
  },

  // GET /providers — supports filter querystring
  getProviders(params = {}) {
    return http.get('/providers', { params })
  },

  // GET /providers/{id}
  getProvider(id) {
    return http.get(`/providers/${id}`)
  },

  // GET /providers/{id}/reviews
  getProviderReviews(id) {
    return http.get(`/providers/${id}/reviews`)
  },

  // GET /providers/nearby?lat=&lng=&radius=
  getNearbyProviders({ lat, lng, radius = 10 }) {
    return http.get('/providers/nearby', { params: { lat, lng, radius } })
  },
}

export const bookingApi = {
  // POST /bookings
  createBooking(payload) {
    return http.post('/bookings', payload)
  },

  // GET /bookings — the logged-in customer's bookings (jobs)
  getBookings(params = {}) {
    return http.get('/bookings', { params })
  },

  // GET /bookings/{id}
  getJob(id) {
    return http.get(`/bookings/${id}`)
  },

  // PATCH /bookings/{id}/confirm-cost
  confirmJobCost(id) {
    return http.patch(`/bookings/${id}/confirm-cost`)
  },

  // PATCH /bookings/{id}/cancel
  cancelBooking(id) {
    return http.patch(`/bookings/${id}/cancel`)
  },

  // PATCH /bookings/{id}/cancel-series
  cancelRecurringSeries(id) {
    return http.patch(`/bookings/${id}/cancel-series`)
  },

  // POST /bookings/{id}/review
  submitReview(jobId, payload) {
    return http.post(`/bookings/${jobId}/review`, payload)
  },

  // GET /reviews — the logged-in customer's submitted reviews
  getReviews(params = {}) {
    return http.get('/reviews', { params })
  },
}

export default http
