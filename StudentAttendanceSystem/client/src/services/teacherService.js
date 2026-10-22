import api from './api';

const teacherService = {
    getProfile: async () => {
        const response = await api.get('/teacher/profile');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.put('/teacher/profile', data);
        return response.data;
    },

    uploadPhoto: async (file) => {
        const formData = new FormData();
        formData.append('profilePhoto', file);
        
        const response = await api.post('/teacher/profile/photo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await api.put('/auth/change-password', {
            currentPassword,
            newPassword
        });
        return response.data;
    }
};

export default teacherService;