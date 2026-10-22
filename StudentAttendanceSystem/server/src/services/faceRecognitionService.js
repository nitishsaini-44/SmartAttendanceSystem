const axios = require('axios');

const FACE_API_URL = process.env.FACE_API_URL || 'http://localhost:5001/api';

const faceRecognitionService = {
    /**
     * Add a student with face embedding
     * @param {string} studentId - Student ID
     * @param {string} name - Student name
     * @param {string} imageBase64 - Base64 encoded image
     */
    addStudent: async (studentId, name, imageBase64) => {
        try {
            const response = await axios.post(`${FACE_API_URL}/add-student`, {
                studentId,
                name,
                image: imageBase64
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    },

    /**
     * Remove a student from face database
     * @param {string} studentId - Student ID to remove
     */
    removeStudent: async (studentId) => {
        try {
            const response = await axios.post(`${FACE_API_URL}/remove-student`, {
                studentId
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    },

    /**
     * Recognize a single face
     * @param {string} imageBase64 - Base64 encoded image
     * @param {object} [batchScope] - Optional academic batch scope ({ academicYear, branch, section, subsection })
     */
    recognizeFace: async (imageBase64, batchScope = {}) => {
        try {
            const payload = {
                image: imageBase64,
                academicYear: batchScope.academicYear,
                branch: batchScope.branch,
                section: batchScope.section,
                subsection: batchScope.subsection
            };
            const response = await axios.post(`${FACE_API_URL}/recognize`, payload);
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    },

    /**
     * Recognize multiple faces (for classroom attendance)
     * @param {string} imageBase64 - Base64 encoded image
     * @param {object} [batchScope] - Optional academic batch scope ({ academicYear, branch, section, subsection })
     */
    recognizeMultipleFaces: async (imageBase64, batchScope = {}) => {
        try {
            const payload = {
                image: imageBase64,
                academicYear: batchScope.academicYear,
                branch: batchScope.branch,
                section: batchScope.section,
                subsection: batchScope.subsection
            };
            const response = await axios.post(`${FACE_API_URL}/recognize-multiple`, payload);
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    },

    /**
     * Get face embedding from image
     * @param {string} imageBase64 - Base64 encoded image
     */
    getEmbedding: async (imageBase64) => {
        try {
            const response = await axios.post(`${FACE_API_URL}/get-embedding`, {
                image: imageBase64
            });
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    },

    /**
     * Check if Face API is running
     */
    healthCheck: async () => {
        try {
            const response = await axios.get(`${FACE_API_URL}/health`, { timeout: 5000 });
            return response.data;
        } catch (error) {
            return { success: false, message: 'Face Recognition API is not running', error: error.message };
        }
    },

    /**
     * Check if Face API is running (alias)
     */
    checkStatus: async () => {
        return faceRecognitionService.healthCheck();
    },

    /**
     * Register a student face (alias for addStudent)
     */
    registerFace: async (studentId, name, imageBase64) => {
        return faceRecognitionService.addStudent(studentId, name, imageBase64);
    }
};

module.exports = faceRecognitionService;
