const express = require('express');
const {
    takeAttendance,
    getTodayAttendance,
    getAttendanceByDate,
    getAllAttendance,
    downloadTodayAttendanceCSV,
    downloadAttendanceCSV,
    downloadAttendanceCSVRange,
    takeFaceAttendance,
    takeMultipleFaceAttendance,
    bulkPhotoAttendance,
    checkFaceApiStatus,
    resetTodayAttendance
} = require('../controllers/attendanceController');
const { authenticate, authorizeRoles, requireTeacherAssignment } = require('../middleware/authMiddleware');

const router = express.Router();

// All attendance routes require auth + teacher or admin role
router.use(authenticate, authorizeRoles('teacher', 'admin'));

// Manual attendance
router.post('/', takeAttendance);
router.get('/', getAllAttendance);
router.get('/today', getTodayAttendance);
router.get('/date/:date', getAttendanceByDate);
router.get('/download/today', downloadTodayAttendanceCSV);
router.get('/download/range', downloadAttendanceCSVRange);
router.get('/download/:date', downloadAttendanceCSV);
router.delete('/today', resetTodayAttendance);

// Face recognition attendance
router.post('/face', takeFaceAttendance);
router.post('/face-multiple', takeMultipleFaceAttendance);
router.post('/bulk-photos', bulkPhotoAttendance);
router.get('/face-status', checkFaceApiStatus);

module.exports = router;