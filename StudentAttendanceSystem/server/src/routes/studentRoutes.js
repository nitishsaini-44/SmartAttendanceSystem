const express = require('express');
const {
    getAllStudents,
    getStudent,
    addStudent,
    updateStudent,
    deleteStudent,
    downloadStudentsCSV,
    registerFace,
    updateProfilePhoto
} = require('../controllers/studentController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { studentUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authenticate);

// Optional upload — continues without error if no file sent
const optionalUpload = (req, res, next) => {
    studentUploader.single('profilePhoto')(req, res, (err) => {
        if (err) console.error('Upload error:', err.message);
        next();
    });
};

// GET all students — admin or teacher can access
router.get('/', authorizeRoles('admin', 'teacher'), getAllStudents);

// CSV download — admin or teacher
router.get('/download/csv', authorizeRoles('admin', 'teacher'), downloadStudentsCSV);

// Create student — admin only
router.post('/', authorizeRoles('admin'), optionalUpload, addStudent);

// Individual student operations
router.get('/:id', authorizeRoles('admin', 'teacher'), getStudent);

// Update — admin only (prevents teacher from editing arbitrary students)
router.put('/:id', authorizeRoles('admin'), updateStudent);

// Delete — admin only
router.delete('/:id', authorizeRoles('admin'), deleteStudent);

// Face registration — teacher or admin (for students in their class)
router.post('/:id/register-face', authorizeRoles('admin', 'teacher'), registerFace);
router.put('/:id/profile-photo', authorizeRoles('admin', 'teacher'), updateProfilePhoto);

module.exports = router;