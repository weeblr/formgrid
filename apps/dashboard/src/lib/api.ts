import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { getToken, clearToken } from './auth' // [weeblr] clearToken for the expired-session redirect

/**
 * API client configuration
 */
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4001'

/**
 * Create Axios instance with base configuration
 */
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

/**
 * Request interceptor to attach authentication token
 */
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response
    },
    (error) => {
        // Handle 401 Unauthorized responses
        if (error.response?.status === 401) {
            // Token might be expired or invalid
            // You can dispatch a logout action here if using Redux/Context
            console.warn('Authentication token expired or invalid')
            // [weeblr] Expired or invalid session: back to the sign-in page. Only for requests that sent a token, so a failed login keeps its message
            if (error.config?.headers?.Authorization && window.location.pathname !== '/login') {
                clearToken()
                window.location.replace('/login')
            }
        }
        return Promise.reject(error)
    }
)

/**
 * Example usage:
 * 
 * import api from './lib/api'
 * 
 * // GET request
 * const response = await api.get('/api/user/profile')
 * 
 * // POST request with data
 * const loginResponse = await api.post('/api/auth/login', {
 *   email: 'user@example.com',
 *   password: 'password123'
 * })
 * 
 * // PUT request
 * const updateResponse = await api.put('/api/user/profile', {
 *   name: 'John Doe',
 *   bio: 'Software Developer'
 * })
 * 
 * // DELETE request
 * await api.delete('/api/user/profile')
 * 
 * // Request with custom config
 * const customResponse = await api.get('/api/data', {
 *   params: { page: 1, limit: 10 },
 *   timeout: 5000
 * })
 */

// Export the configured API instance
export default api

// Export types for better TypeScript support
export type ApiResponse<T = any> = AxiosResponse<T>
export type ApiError = {
    message: string
    status?: number
    data?: any
}

// Helper function to extract error message from API errors
export function getApiErrorMessage(error: any): string {
    if (error.response?.data?.message) {
        return error.response.data.message
    }
    if (error.response?.data?.error) {
        return error.response.data.error
    }
    if (error.message) {
        return error.message
    }
    return 'An unexpected error occurred'
}
