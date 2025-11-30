import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let csrfToken = null

async function fetchCsrfToken(forceRefresh = false) {
  if (!csrfToken || forceRefresh) {
    try {
      const { data } = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      csrfToken = data.csrfToken
    } catch (e) {
      console.error('Failed to get CSRF token', e)
    }
  }
  return csrfToken
}

// Exporter pour pré-chargement
export const preloadCsrfToken = () => fetchCsrfToken(true)

// Intercepteur pour ajouter le token CSRF
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const token = await fetchCsrfToken()
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})

// Réessayer avec un nouveau token CSRF en cas d'erreur 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true
      csrfToken = null
      const newToken = await fetchCsrfToken(true)
      originalRequest.headers['X-CSRF-Token'] = newToken
      return api(originalRequest)
    }
    // Ne pas rediriger si on est déjà sur login/register
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (!isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
}

export const accountsApi = {
  getAll: () => api.get('/accounts'),
  getOne: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
}

// Filtre les paramètres vides
const cleanParams = (params) => {
  const cleaned = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}

export const transactionsApi = {
  getAll: (params) => api.get('/transactions', { params: cleanParams(params) }),
  getOne: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
}

export const categoriesApi = {
  getAll: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

export const creditCardsApi = {
  getAll: () => api.get('/credit-cards'),
  getOne: (id) => api.get(`/credit-cards/${id}`),
  getCycles: (id) => api.get(`/credit-cards/${id}/cycles`),
  getCurrentCycle: (id) => api.get(`/credit-cards/${id}/cycles/current`),
}

export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getExpensesByCategory: (params) => api.get('/reports/expenses/category', { params }),
  getMonthlyTrend: (params) => api.get('/reports/trend/monthly', { params }),
  getForecast: (params) => api.get('/reports/forecast', { params }),
}

export default api
