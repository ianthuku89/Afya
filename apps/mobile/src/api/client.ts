import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/auth';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const debuggerHost = Constants.expoConfig?.hostUri;
let API_URL = 'http://localhost:3001/api/v1';

if (debuggerHost) {
  API_URL = `http://${debuggerHost.split(':')[0]}:3001/api/v1`;
} else if (Platform.OS === 'android') {
  API_URL = 'http://10.0.2.2:3001/api/v1';
}
export const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
client.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Try to refresh
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        // Store new tokens
        await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        // Update authorization header & retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        // Refresh failed, log out
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
