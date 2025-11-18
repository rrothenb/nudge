/**
 * API Client with Axios
 * Handles authentication, error handling, and retries
 */
import axios, type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { get } from 'svelte/store';
import { authStore } from '../stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Create axios instance
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - attach JWT token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const auth = get(authStore);

    if (auth.isAuthenticated && auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401) {
      // Try to refresh token
      const auth = get(authStore);
      if (auth.isAuthenticated) {
        try {
          await refreshToken();
          // Retry the original request
          if (error.config) {
            return apiClient.request(error.config);
          }
        } catch (refreshError) {
          // Refresh failed, logout user
          authStore.logout();
          window.location.hash = '/login';
        }
      }
    }

    // Handle other errors
    const errorMessage = getErrorMessage(error);
    console.error('API Error:', errorMessage, error);

    return Promise.reject(error);
  }
);

/**
 * Refresh JWT token
 */
async function refreshToken(): Promise<void> {
  // Implementation depends on AWS Amplify
  // This will be implemented when we set up auth
  console.log('Token refresh not yet implemented');
}

/**
 * Extract error message from axios error
 */
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any;
    return data.error || data.message || 'Unknown error';
  }

  if (error.request) {
    return 'No response from server';
  }

  return error.message || 'Request failed';
}

/**
 * Helper to handle API errors uniformly
 */
export function handleApiError(error: any): string {
  if (axios.isAxiosError(error)) {
    return getErrorMessage(error);
  }
  return error?.message || 'An unexpected error occurred';
}

export default apiClient;
