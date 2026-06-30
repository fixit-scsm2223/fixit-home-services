// ============================================================
// FixIt — Auth API service (uses the shared Axios client).
// Each call resolves to the { success, message, data } envelope;
// the auth store reads `.data` for { token, user }.
// ============================================================
import http from './http'

export const authApi = {
  login: (payload) => http.post('/auth/login', payload),
  register: (formData) => http.post('/auth/register', formData),
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout'),
  verifyOtp: (payload) => http.post('/auth/verify-otp', payload),
  forgotPassword: (payload) => http.post('/auth/forgot-password', payload),

  // /health is unenveloped ({ ok, service }), unlike the other /auth/* routes.
  async checkConnection() {
    try {
      const res = await http.get('/health')
      return res?.ok === true
    } catch {
      return false
    }
  },
}

export default authApi
