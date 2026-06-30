// ============================================================
// FixIt — Single shared Axios client for the unified app.
// Base URL is '/api' (proxied to the Slim backend in dev). The
// response interceptor unwraps to the shared { success, message,
// data } envelope, and the request interceptor attaches the JWT.
// ============================================================
import axios from 'axios'
import { API_BASE_URL } from './apiBase'

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach the JWT (remember-me -> localStorage, else sessionStorage).
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('fixit_token') || sessionStorage.getItem('fixit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Let Axios/the browser set the multipart boundary for file uploads.
  if (config.data instanceof FormData) delete config.headers['Content-Type']
  return config
})

// Return the response envelope to callers; surface a clean Error on failure.
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const body = err.response?.data
    const error = new Error(body?.message || err.message || 'Network request failed')
    error.status = err.response?.status
    error.errors = body?.errors || {}
    return Promise.reject(error)
  }
)

export default http
