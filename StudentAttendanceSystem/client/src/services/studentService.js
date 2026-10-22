import api from './api';

const studentService = {
    getAllStudents: async () => {
        const response = await api.get('/students');
        return response.data;
    },

    getStudent: async (id) => {
        const response = await api.get(`/students/${id}`);
        return response.data;
    },

    addStudent: async (studentData) => {
        const hasProfilePhotoFile = studentData.profilePhoto && studentData.profilePhoto instanceof File;
        const hasFaceImage = !!studentData.faceImage;
        
        if (hasProfilePhotoFile || (hasProfilePhotoFile && hasFaceImage)) {
            // Use FormData for file upload
            const formData = new FormData();
            if (studentData.studentId) formData.append('studentId', studentData.studentId);
            if (studentData.name) formData.append('name', studentData.name);
            if (studentData.email) formData.append('email', studentData.email);
            if (studentData.password) formData.append('password', studentData.password);
            if (studentData.academicYear) formData.append('academicYear', studentData.academicYear);
            if (studentData.branch) formData.append('branch', studentData.branch);
            if (studentData.section) formData.append('section', studentData.section);
            if (studentData.subsection) formData.append('subsection', studentData.subsection);
            if (studentData.class) formData.append('class', studentData.class);
            if (studentData.profilePhoto) formData.append('profilePhoto', studentData.profilePhoto);
            if (studentData.faceImage) formData.append('faceImage', studentData.faceImage);
            
            const response = await api.post('/admin/students', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
        
        // Use JSON
        const jsonData = {
            studentId: studentData.studentId,
            name: studentData.name,
            email: studentData.email || '',
            password: studentData.password || '',
            academicYear: Number(studentData.academicYear) || 1,
            branch: studentData.branch || 'CSE',
            section: studentData.section || 'A',
            subsection: studentData.subsection || 'A1',
            class: studentData.class || ''
        };
        
        if (hasFaceImage) {
            jsonData.faceImage = studentData.faceImage;
        }
        
        const response = await api.post('/admin/students', jsonData, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    },

    updateStudent: async (id, studentData) => {
        const response = await api.put(`/students/${id}`, studentData);
        return response.data;
    },

    deleteStudent: async (id) => {
        const response = await api.delete(`/students/${id}`);
        return response.data;
    },

    registerFace: async (id, faceImage) => {
        const response = await api.post(`/students/${id}/register-face`, { faceImage });
        return response.data;
    },

    updateProfilePhoto: async (id, faceImage) => {
        const response = await api.put(`/students/${id}/profile-photo`, { faceImage });
        return response.data;
    },

    downloadStudentsCSV: async () => {
        const response = await api.get('/students/download/csv', {
            responseType: 'blob'
        });
        return response.data;
    }
};

export default studentService;