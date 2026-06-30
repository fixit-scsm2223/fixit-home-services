const DEFAULT_API_BASE_URL = '/api'
const LOCAL_ANDROID_API_BASE_URL = 'http://10.0.2.2:8090/api'

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, '') || DEFAULT_API_BASE_URL
}

function isNativeCapacitor() {
  const capacitor = globalThis.Capacitor
  if (!capacitor) return false
  if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform()
  if (typeof capacitor.getPlatform === 'function') return capacitor.getPlatform() !== 'web'
  return false
}

export function getApiBaseURL() {
  const configuredBaseURL = (import.meta.env.VITE_API_BASE_URL || '').trim()
  const capacitorBaseURL = (import.meta.env.VITE_CAPACITOR_API_BASE_URL || LOCAL_ANDROID_API_BASE_URL).trim()

  if (configuredBaseURL && configuredBaseURL !== DEFAULT_API_BASE_URL) {
    return withoutTrailingSlash(configuredBaseURL)
  }

  if (isNativeCapacitor()) {
    return withoutTrailingSlash(capacitorBaseURL)
  }

  return configuredBaseURL || DEFAULT_API_BASE_URL
}

export const API_BASE_URL = getApiBaseURL()
