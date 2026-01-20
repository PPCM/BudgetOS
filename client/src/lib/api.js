/**
 * @fileoverview API client module for BudgetOS
 * Provides centralized API calls with CSRF protection and error handling
 */

import axios from 'axios'

/**
 * Axios instance configured for the BudgetOS API
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** @type {string|null} Cached CSRF token */
let csrfToken = null

/**
 * Fetches CSRF token from the server
 * @param {boolean} forceRefresh - Force a new token fetch even if cached
 * @returns {Promise<string|null>} The CSRF token
 */
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

/**
 * Preloads CSRF token for faster subsequent requests
 * @returns {Promise<string|null>} The CSRF token
 */
export const preloadCsrfToken = () => fetchCsrfToken(true)

// Request interceptor: adds CSRF token to state-changing requests
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const token = await fetchCsrfToken()
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})

// Response interceptor: handles CSRF errors and authentication redirects
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    // Retry with fresh CSRF token on 403 error
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true
      csrfToken = null
      const newToken = await fetchCsrfToken(true)
      originalRequest.headers['X-CSRF-Token'] = newToken
      return api(originalRequest)
    }
    // Redirect to login on 401 (unless already on auth page)
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (!isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Authentication API endpoints
 * @namespace authApi
 */
export const authApi = {
  /** @param {Object} data - Login credentials (email, password) */
  login: (data) => api.post('/auth/login', data),
  /** @param {Object} data - Registration data (email, password, name) */
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
}

/**
 * Accounts API endpoints
 * @namespace accountsApi
 */
export const accountsApi = {
  getAll: () => api.get('/accounts'),
  /** @param {string} id - Account UUID */
  getOne: (id) => api.get(`/accounts/${id}`),
  /** @param {Object} data - Account data (name, type, currency, etc.) */
  create: (data) => api.post('/accounts', data),
  /** @param {string} id - Account UUID */
  update: (id, data) => api.put(`/accounts/${id}`, data),
  /** @param {string} id - Account UUID */
  delete: (id) => api.delete(`/accounts/${id}`),
}

/**
 * Removes empty, null, or undefined values from params object
 * @param {Object} params - Query parameters
 * @returns {Object} Cleaned parameters
 */
const cleanParams = (params) => {
  const cleaned = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}

/**
 * Transactions API endpoints
 * @namespace transactionsApi
 */
export const transactionsApi = {
  /** @param {Object} params - Filter params (accountId, startDate, endDate, etc.) */
  getAll: (params) => api.get('/transactions', { params: cleanParams(params) }),
  /** @param {string} id - Transaction UUID */
  getOne: (id) => api.get(`/transactions/${id}`),
  /** @param {Object} data - Transaction data (amount, description, date, etc.) */
  create: (data) => api.post('/transactions', data),
  /** @param {string} id - Transaction UUID */
  update: (id, data) => api.put(`/transactions/${id}`, data),
  /** @param {string} id - Transaction UUID */
  delete: (id) => api.delete(`/transactions/${id}`),
}

/**
 * Categories API endpoints
 * @namespace categoriesApi
 */
export const categoriesApi = {
  /** @param {Object} params - Filter params (type: income/expense/transfer) */
  getAll: (params) => api.get('/categories', { params }),
  /** @param {Object} data - Category data (name, type, icon, color) */
  create: (data) => api.post('/categories', data),
  /** @param {string} id - Category UUID */
  update: (id, data) => api.put(`/categories/${id}`, data),
  /** @param {string} id - Category UUID */
  delete: (id) => api.delete(`/categories/${id}`),
}

/**
 * Credit Cards API endpoints
 * @namespace creditCardsApi
 */
export const creditCardsApi = {
  /** @param {Object} params - Filter params (status: active/expired, sortBy, sortOrder) */
  getAll: (params) => api.get('/credit-cards', { params: cleanParams(params || {}) }),
  /** @param {string} id - Credit card UUID */
  getOne: (id) => api.get(`/credit-cards/${id}`),
  /** @param {Object} data - Credit card data (name, accountId, debitType, etc.) */
  create: (data) => api.post('/credit-cards', data),
  /** @param {string} id - Credit card UUID */
  update: (id, data) => api.put(`/credit-cards/${id}`, data),
  /** @param {string} id - Credit card UUID */
  delete: (id) => api.delete(`/credit-cards/${id}`),
  /** @param {string} id - Credit card UUID */
  getCycles: (id) => api.get(`/credit-cards/${id}/cycles`),
  /** @param {string} id - Credit card UUID */
  getCurrentCycle: (id) => api.get(`/credit-cards/${id}/cycles/current`),
}

/**
 * Reports API endpoints
 * @namespace reportsApi
 */
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  /** @param {Object} params - Date range params (startDate, endDate) */
  getExpensesByCategory: (params) => api.get('/reports/expenses/category', { params }),
  /** @param {Object} params - Date range params */
  getMonthlyTrend: (params) => api.get('/reports/trend/monthly', { params }),
  /** @param {Object} params - Forecast params (days: 30/60/90) */
  getForecast: (params) => api.get('/reports/forecast', { params }),
}

/**
 * Payees API endpoints
 * @namespace payeesApi
 */
export const payeesApi = {
  /** @param {Object} params - Filter params (search, limit) */
  getAll: (params) => api.get('/payees', { params: cleanParams(params || {}) }),
  /** @param {string} id - Payee UUID */
  getOne: (id) => api.get(`/payees/${id}`),
  /** @param {Object} data - Payee data (name, imageUrl) */
  create: (data) => api.post('/payees', data),
  /** @param {string} id - Payee UUID */
  update: (id, data) => api.put(`/payees/${id}`, data),
  /** @param {string} id - Payee UUID */
  delete: (id) => api.delete(`/payees/${id}`),
  /** @param {string} id - Payee UUID */
  getTransactionCount: (id) => api.get(`/payees/${id}/transactions/count`),
  /**
   * Reassigns all transactions from one payee to another
   * @param {string} id - Source payee UUID
   * @param {string} toPayeeId - Target payee UUID
   */
  reassignTransactions: (id, toPayeeId) => api.post(`/payees/${id}/transactions/reassign`, { toPayeeId }),
}

/**
 * File uploads API endpoints
 * @namespace uploadsApi
 */
export const uploadsApi = {
  /**
   * Uploads a payee image
   * @param {File} file - Image file to upload
   * @returns {Promise} Response with imageUrl
   */
  uploadPayeeImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/uploads/payee-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  /**
   * Deletes a payee image
   * @param {string} imageUrl - URL of the image to delete
   */
  deletePayeeImage: (imageUrl) => api.delete('/uploads/payee-image', { data: { imageUrl } }),
}

export default api
