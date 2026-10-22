const express = require('express');
const {
    getProfile,
    getEnrollments,
    getAttendance,
    getAttendanceSummary,
    getSubjectAttendance
} = require('../controllers/studentPortalController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All student-portal routes require authentication + student role
router.use(authenticate, authorizeRoles('student'));

router.get('/profile', getProfile);
router.get('/enrollments', getEnrollments);
router.get('/attendance', getAttendance);
router.get('/attendance/summary', getAttendanceSummary);
router.get('/attendance/:subjectId', getSubjectAttendance);

module.exports = router;
