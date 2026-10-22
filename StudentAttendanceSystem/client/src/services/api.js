import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
        
        // Only redirect to /login if 401 occurred on a protected route with an expired/invalid token,
        // NEVER on login attempts so the user can see wrong email/password error messages!
        if (error.response?.status === 401 && !isAuthRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('teacher');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        // For blob responses with errors, try to parse the error message
        if (error.response?.data instanceof Blob) {
            return error.response.data.text().then(text => {
                try {
                    const errorData = JSON.parse(text);
                    error.message = errorData.message || 'Download failed';
                } catch (e) {
                    error.message = 'Download failed';
                }
                return Promise.reject(error);
            });
        }
        return Promise.reject(error);
    }
);

export default api;