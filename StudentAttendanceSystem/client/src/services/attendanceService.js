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

/**
 * Determines whether a given database attendance session belongs strictly to a specified academic batch.
 * Differentiates complete sections (e.g. ECE-C ALL) from specific subsections (e.g. ECE-C C3).
 */
export const isSessionMatchingBatch = (sess, batch) => {
    if (!sess || !batch) return false;

    // 1. Branch / Class check
    const sessClass = (sess.className || '').toUpperCase().trim();
    const batchBranch = (batch.branch || '').toUpperCase().trim();
    if (batchBranch && sessClass && sessClass !== batchBranch) {
        return false;
    }

    // 2. Academic Year check (if specified on session)
    const yrStr = String(sess.sessionLabel || sess.academicSession || '');
    const yrMatch = yrStr.match(/\d+/);
    if (yrMatch && batch.academicYear) {
        if (Number(yrMatch[0]) !== Number(batch.academicYear)) {
            return false;
        }
    }

    // 3. Section and Subsection matching
    const sessSec = (sess.section || '').toUpperCase().trim();
    const batchSec = (batch.section || '').toUpperCase().trim();
    const batchSub = (batch.subsection || '').toUpperCase().trim();

    const isBatchAll = !batchSub || batchSub === 'ALL';

    if (isBatchAll) {
        // Full section batch (e.g. ECE-C ALL)
        // Matches if session is explicitly for ALL, C-ALL, or C.
        // MUST NEVER match a specific sub-batch (e.g. C1, C2, C3, etc.)
        if (sessSec === 'ALL') return true;
        if (batchSec && sessSec === `${batchSec}-ALL`) return true;
        if (batchSec && sessSec === batchSec) return true;
        return false;
    } else {
        // Specific subsection batch (e.g. ECE-C C3)
        // Matches if session section is C3, or C-C3
        if (sessSec === batchSub) return true;
        if (batchSec && sessSec === `${batchSec}-${batchSub}`) return true;
        return false;
    }
};

export default attendanceService;