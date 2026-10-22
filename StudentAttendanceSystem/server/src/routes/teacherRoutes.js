const express = require('express');
const {
    getProfile,
    updateProfile,
    uploadProfilePhoto,
    getMyAcademicAccess
} = require('../controllers/teacherController');
const { getMyAssignments, getRoster } = require('../controllers/teacherAssignmentController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { teacherUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All teacher routes require authentication
router.use(authenticate);
// Teachers and admins can access
const teacherOrAdmin = authorizeRoles('teacher', 'admin');

router.get('/profile', teacherOrAdmin, getProfile);
router.put('/profile', teacherOrAdmin, updateProfile);
router.post('/profile/photo', teacherOrAdmin, teacherUploader.single('profilePhoto'), uploadProfilePhoto);

// Academic access (assigned by Administration)
router.get('/my-access', teacherOrAdmin, getMyAcademicAccess);

// Assignment + roster queries
router.get('/my-assignments', authorizeRoles('teacher'), getMyAssignments);
router.get('/roster', teacherOrAdmin, getRoster);

module.exports = router;