import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API calls
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  signup: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  googleLogin: async (credential: string) => {
    // Decode the JWT token from Google
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decodedToken = JSON.parse(jsonPayload);
    
    // Send the decoded information to the backend
    const response = await api.post('/auth/google', {
      googleId: decodedToken.sub,
      email: decodedToken.email,
      name: decodedToken.name,
      profilePicture: decodedToken.picture
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string; profilePicture?: string }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },


  createSubscriptionOrder: async (data: { plan: string; amount: number }) => {
    const response = await api.post('/subscriptions/create-order', data);
    return response.data;
  },

  verifySubscriptionPayment: async (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    plan: string;
  }) => {
    const response = await api.post('/subscriptions/verify-payment', data);
    return response.data;
  },


  getProject: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/details`);
    return response.data;
  },


  updateProject: async (projectId: string, data: {
    title?: string;
    description?: string;
    thumbnail?: string;
    mainColorTheme?: string;
    secondaryColorTheme?: string;
  }) => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },
};

export default api; 