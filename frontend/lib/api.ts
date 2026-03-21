import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
})

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors — never throw unhandled, always reject cleanly
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        // Prevent infinite loop if the logout request itself returns 401
        if (error.config?.url?.includes('/auth/logout')) {
          return Promise.reject(error)
        }
        // Use standard logout from AuthStore to clear state AND storage
        import('@/store/authStore').then((mod) => {
          mod.useAuthStore.getState().logout()
        })
      }
      // 403 — let the calling component handle it, don't crash the app
    }
    return Promise.reject(error)
  }
)

export default api
