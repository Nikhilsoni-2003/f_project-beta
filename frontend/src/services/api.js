// import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL;

// // Validate API URL
// if (!API_BASE_URL) {
//   console.error('VITE_API_GATEWAY_URL is not defined in environment variables');
//   throw new Error('API Gateway URL is not configured');
// }

// console.log('API Base URL:', API_BASE_URL);

// // Create axios instance
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json'
//   },
// });

// // Add auth token to requests
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('accessToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Handle token expiration
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('accessToken');
//       localStorage.removeItem('idToken');
//       localStorage.removeItem('refreshToken');
//       window.location.href = '/signin';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from 'axios';
import authService from './auth';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL;

// Validate API URL
if (!API_BASE_URL) {
  console.error('VITE_API_GATEWAY_URL is not defined in environment variables');
  throw new Error('API Gateway URL is not configured');
}

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await authService.getToken(); // Use the instance method
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No token available for request');
  }
  return config;
}, (error) => Promise.reject(error));

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Token expired, clearing tokens and redirecting to signin');
      authService.clearTokens(); // Use authService method
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default api;