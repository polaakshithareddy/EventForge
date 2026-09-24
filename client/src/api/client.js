import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt to refresh if the request was an auth endpoint
    if (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/refresh') ||
      originalRequest.url.includes('/auth/me') ||
      originalRequest.url.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch {
        // Refresh failed, just reject. The app state/ProtectedRoute will handle redirecting.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
