import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/auth';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Your Render backend. Used when nothing else is configured.
const RENDER_API = 'https://afya-cvq5.onrender.com';

// Accepts "https://host", "https://host/" or "https://host/api/v1" and always returns ".../api/v1"
const withApiPrefix = (url: string) => {
  const clean = url.replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
};

// expo.dev's API_URL must be exposed to the app through app.config.js -> extra.apiUrl
// (a plain API_URL env var is NOT readable from app code on its own).
const configuredUrl: string =
  Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? RENDER_API;
const productionApiUrl = withApiPrefix(configuredUrl);

// M-PESA callbacks can only reach a PUBLIC server. While testing payments from Expo Go,
// set EXPO_PUBLIC_FORCE_REMOTE_API=true so the app talks to Render instead of your laptop.
const forceRemote = process.env.EXPO_PUBLIC_FORCE_REMOTE_API === 'true';

const debuggerHost = Constants.expoConfig?.hostUri;
let API_URL = productionApiUrl;

if (!forceRemote && debuggerHost) {
  API_URL = `http://${debuggerHost.split(':')[0]}:3001/api/v1`;
} else if (!forceRemote && __DEV__ && Platform.OS === 'android') {
  API_URL = 'http://10.0.2.2:3001/api/v1';
}

export const client = axios.create({
  baseURL: API_URL,
  timeout: 60_000, // Render free instances can take up to a minute to wake up
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

    // Auth endpoints (login/register/refresh) legitimately return 401/403 for
    // bad credentials or an invalid refresh token. That is not an expired
    // access token, so never run the refresh-retry flow for these calls.
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/register')
      || originalRequest?.url?.includes('/auth/refresh');

    // If 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Backend wraps responses as { success, data: {...} }, so the
        // actual tokens are one level deeper than the axios `data` field.
        const { data: body } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });
        const { accessToken, refreshToken: newRefreshToken } = body.data;

        await useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        await useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);