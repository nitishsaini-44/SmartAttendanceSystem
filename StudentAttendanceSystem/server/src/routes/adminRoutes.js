const express = require('express');
const {
    getStats,
    createTeacher, getTeachers, updateTeacher, archiveTeacher, deleteTeacher, resetTeacherPassword,
    getTeacherAccess, assignTeacherAccess, revokeTeacherAccess,
    createStudent, getStudents, updateStudent, archiveStudent, deleteStudent, resetStudentPassword,
    createClass, getClasses, updateClass, archiveClass,
    createSubject, getSubjects, updateSubject,
    createEnrollment, getEnrollments, dropEnrollment,
    createAssignment, getAssignments, deactivateAssignment,
    getAllAttendance, correctAttendance,
    getAuditLogs
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { studentUploader } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Optional upload — continues without error if no file sent
const optionalUpload = (req, res, next) => {
    studentUploader.single('profilePhoto')(req, res, (err) => {
        if (err) console.error('Admin upload error:', err.message);
        next();
    });
};

// All admin routes require authentication + admin role
router.use(authenticate, authorizeRoles('admin'));

// Dashboard
router.get('/stats', getStats);

// Teachers
router.post('/teachers', createTeacher);
router.get('/teachers', getTeachers);
router.put('/teachers/:id', updateTeacher);
router.put('/teachers/:id/archive', archiveTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.put('/teachers/:id/reset-password', resetTeacherPassword);
router.get('/teachers/:id/access', getTeacherAccess);
router.post('/teachers/:id/access', assignTeacherAccess);
router.delete('/teachers/:id/access/:accessId', revokeTeacherAccess);
router.delete('/teachers/access/:id', revokeTeacherAccess);

// Students
router.post('/students', optionalUpload, createStudent);
router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.put('/students/:id/archive', archiveStudent);
router.delete('/students/:id', deleteStudent);
router.put('/students/:id/reset-password', resetStudentPassword);

// Classes
router.post('/classes', createClass);
router.get('/classes', getClasses);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', archiveClass);

// Subjects
router.post('/subjects', createSubject);
router.get('/subjects', getSubjects);
router.put('/subjects/:id', updateSubject);

// Enrollments
router.post('/enrollments', createEnrollment);
router.get('/enrollments', getEnrollments);
router.delete('/enrollments/:id', dropEnrollment);

// Teacher Assignments
router.post('/assignments', createAssignment);
router.get('/assignments', getAssignments);
router.delete('/assignments/:id', deactivateAssignment);

// Attendance (institution-wide)
router.get('/attendance', getAllAttendance);
router.put('/attendance/:id/correct', correctAttendance);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
