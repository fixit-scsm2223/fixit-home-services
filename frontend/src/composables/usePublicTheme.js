import { computed, onMounted, ref } from 'vue'

const STORAGE_KEY = 'fixit-public-theme'
const LEGACY_KEY = 'fixit-night-mode'

function initialTheme() {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem(STORAGE_KEY)
    || document.documentElement.dataset.theme
    || (localStorage.getItem(LEGACY_KEY) === '1' ? 'dark' : 'light')
}

const theme = ref(initialTheme())

function applyTheme(value) {
  if (typeof window === 'undefined') return
  document.documentElement.dataset.theme = value
  document.body.classList.toggle('night-mode-active', value === 'dark')
  localStorage.setItem(STORAGE_KEY, value)
  localStorage.setItem(LEGACY_KEY, value === 'dark' ? '1' : '0')
}

export function usePublicTheme() {
  onMounted(() => applyTheme(theme.value))

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    toggleTheme,
  }
}
