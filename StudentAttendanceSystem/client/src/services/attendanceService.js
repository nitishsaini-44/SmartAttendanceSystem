import api from './api';

const attendanceService = {
    takeAttendance: async (attendanceData) => {
        const response = await api.post('/attendance', attendanceData);
        return response.data;
    },

    getTodayAttendance: async (params = {}) => {
        const response = await api.get('/attendance/today', { params });
        return response.data;
    },

    getAllAttendance: async () => {
        const response = await api.get('/attendance');
        return response.data;
    },

    getAttendanceByDate: async (date) => {
        const response = await api.get(`/attendance/date/${date}`);
        return response.data;
    },

    downloadTodayAttendanceCSV: async (params = {}) => {
        const response = await api.get('/attendance/download/today', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    downloadAttendanceCSV: async (date) => {
        try {
            const response = await api.get(`/attendance/download/${date}`, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            // Extract error message from blob error response
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || 'Failed to download attendance');
                } catch (parseError) {
                    if (parseError.message !== 'Failed to download attendance' && !parseError.message.includes('Error')) {
                        throw new Error('Failed to download attendance');
                    }
                    throw parseError;
                }
            }
            throw error;
        }
    },

    downloadAttendanceCSVRange: async (fromDate, toDate) => {
        try {
            const response = await api.get(`/attendance/download/range?fromDate=${fromDate}&toDate=${toDate}`, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            // Extract error message from blob error response
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || 'Failed to download attendance');
                } catch (parseError) {
                    if (parseError.message !== 'Failed to download attendance' && !parseError.message.includes('Error')) {
                        throw new Error('Failed to download attendance');
                    }
                    throw parseError;
                }
            }
            throw error;
        }
    },

    // Face Recognition Attendance
    takeFaceAttendance: async (imageBase64, batchData = {}) => {
        const response = await api.post('/attendance/face', {
            image: imageBase64,
            ...batchData
        });
        return response.data;
    },

    takeMultipleFaceAttendance: async (imageBase64, batchData = {}) => {
        const response = await api.post('/attendance/face-multiple', {
            image: imageBase64,
            ...batchData
        });
        return response.data;
    },

    bulkPhotoAttendance: async (data) => {
        const response = await api.post('/attendance/bulk-photos', data);
        return response.data;
    },

    checkFaceApiStatus: async () => {
        const response = await api.get('/attendance/face-status');
        return response.data;
    },

    resetTodayAttendance: async (params = {}) => {
        const response = await api.delete('/attendance/today', { params });
        return response.data;
    }
};

export default attendanceService;