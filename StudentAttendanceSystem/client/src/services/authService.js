import api from './api';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            const userData = response.data.user || response.data.teacher;
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                // backward-compat: also keep 'teacher' key for existing pages
                localStorage.setItem('teacher', JSON.stringify(userData));
            }
        }
        return response.data;
    },

    // Disabled on backend — returns 403 gracefully
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (err) {
            return err.response?.data || { success: false, message: 'Registration is disabled' };
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teacher');
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => !!localStorage.getItem('token')
};

export default authService;