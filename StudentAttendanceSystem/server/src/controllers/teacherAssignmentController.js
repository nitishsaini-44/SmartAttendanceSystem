const prisma = require('../config/prisma');

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/teacher/my-assignments
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyAssignments = async (req, res) => {
    try {
        const assignments = await prisma.teacherAssignment.findMany({
            where: { teacherId: req.user.id, status: 'active' },
            include: {
                class:   { select: { name: true, code: true, department: true, program: true, year: true, semester: true, academicSession: true } },
                subject: { select: { name: true, code: true, attendanceThreshold: true } }
            }
        });
        res.json({ success: true, assignments });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/teacher/roster?classId=&subjectId=
// @access Private (teacher, admin)
// Returns enrolled students for a given class+subject
// ─────────────────────────────────────────────────────────────────────────────
exports.getRoster = async (req, res) => {
    try {
        const { classId, subjectId, academicSession } = req.query;
        if (!classId || !subjectId) return res.status(400).json({ success: false, message: 'classId and subjectId are required' });

        // Verify teacher is assigned (skip for admin)
        if (req.user.role === 'teacher') {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: { teacherId: req.user.id, classId, subjectId, status: 'active' }
            });
            if (!assignment) return res.status(403).json({ success: false, message: 'You are not assigned to this class/subject.' });
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                classId, subjectId, status: 'active',
                ...(academicSession ? { academicSession } : {}),
                student: { status: 'active' }
            },
            include: { student: { select: { id: true, name: true, studentId: true, email: true, profilePhoto: true } } }
        });

        const roster = enrollments.map(e => ({
            _id:          e.student.id,
            name:         e.student.name,
            studentId:    e.student.studentId,
            email:        e.student.email,
            profilePhoto: e.student.profilePhoto,
            enrollmentId: e.id
        }));

        res.json({ success: true, count: roster.length, roster });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
