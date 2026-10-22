const bcrypt = require('bcryptjs');
const prisma  = require('../config/prisma');
const faceRecognitionService = require('../services/faceRecognitionService');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function createAuditLog(actorId, actorName, actorRole, action, targetModel = '', targetId = '', changes = {}) {
    try {
        await prisma.auditLog.create({
            data: { actorId, actorName, actorRole, action, targetModel, targetId: String(targetId), changes }
        });
    } catch { /* audit failures must never crash the main request */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
    try {
        const [totalTeachers, totalStudents, totalClasses, totalSubjects, todayAttendanceCount, recentAuditLogs] = await Promise.all([
            prisma.teacher.count({ where: { status: 'active' } }),
            prisma.student.count({ where: { status: 'active' } }),
            prisma.class.count({ where: { status: 'active' } }),
            prisma.subject.count({ where: { status: 'active' } }),
            prisma.attendance.count({
                where: { date: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) } }
            }),
            prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
        ]);
        res.json({ success: true, stats: { totalTeachers, totalStudents, totalClasses, totalSubjects, todayAttendanceCount, recentAuditLogs } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHERS
// ─────────────────────────────────────────────────────────────────────────────

exports.createTeacher = async (req, res) => {
    const { name, email, password, subject } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email, password are required' });
    if (password.length < 6)          return res.status(400).json({ success: false, message: 'Password must be at least 6 chars' });
    try {
        const hashed = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email: email.toLowerCase(), password: hashed, role: 'teacher', status: 'active' }
        });
        const teacher = await prisma.teacher.create({
            data: { userId: user.id, name, email: email.toLowerCase(), subject: subject || '', status: 'active' }
        });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_TEACHER', 'Teacher', teacher.id, { name, email });
        res.status(201).json({ success: true, message: 'Teacher created', teacher });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Email already in use' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getTeachers = async (req, res) => {
    const { search, status = 'active' } = req.query;
    try {
        const where = {
            ...(status && status !== 'all' ? { status } : {}),
            ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {})
        };
        const teachers = await prisma.teacher.findMany({
            where,
            include: {
                academicAccess: {
                    orderBy: [
                        { academicYear: 'asc' },
                        { branch: 'asc' },
                        { section: 'asc' },
                        { subsection: 'asc' }
                    ]
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, count: teachers.length, teachers });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateTeacher = async (req, res) => {
    const { id } = req.params;
    const { name, email, subject, description } = req.body;
    try {
        const teacher = await prisma.teacher.update({ where: { id }, data: { name, email, subject, description } });
        if (name || email) await prisma.user.update({ where: { id: teacher.userId }, data: { name, email } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'UPDATE_TEACHER', 'Teacher', id, req.body);
        res.json({ success: true, teacher });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.archiveTeacher = async (req, res) => {
    const { id } = req.params;
    try {
        const teacher = await prisma.teacher.findUnique({ where: { id } });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        const newStatus = teacher.status === 'archived' ? 'active' : 'archived';
        await prisma.teacher.update({ where: { id }, data: { status: newStatus } });
        if (teacher.userId) await prisma.user.update({ where: { id: teacher.userId }, data: { status: newStatus } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, newStatus === 'archived' ? 'ARCHIVE_TEACHER' : 'RESTORE_TEACHER', 'Teacher', id, {});
        res.json({ success: true, message: `Teacher ${newStatus === 'archived' ? 'archived' : 'restored'}` });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteTeacher = async (req, res) => {
    const { id } = req.params;
    if (req.query.archive === 'true') {
        return exports.archiveTeacher(req, res);
    }
    try {
        const teacher = await prisma.teacher.findUnique({ where: { id } });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

        await prisma.$transaction(async (tx) => {
            // 1. Delete assignments
            await tx.teacherAssignment.deleteMany({
                where: {
                    OR: [
                        { teacherProfileId: id },
                        { teacherId: teacher.userId }
                    ]
                }
            });

            // 2. Unlink students registered by this teacher
            await tx.student.updateMany({
                where: { registeredById: id },
                data: { registeredById: null }
            });

            // 3. Delete attendance sessions & records created by this teacher
            const attendances = await tx.attendance.findMany({
                where: { teacherId: id },
                select: { id: true }
            });
            const attIds = attendances.map(a => a.id);
            if (attIds.length > 0) {
                await tx.attendanceRecord.deleteMany({
                    where: { attendanceId: { in: attIds } }
                });
                await tx.attendance.deleteMany({
                    where: { teacherId: id }
                });
            }

            // 4. Delete teacher profile
            await tx.teacher.delete({ where: { id } });

            // 5. Delete user account and audit logs
            if (teacher.userId) {
                await tx.auditLog.deleteMany({ where: { actorId: teacher.userId } });
                await tx.user.delete({ where: { id: teacher.userId } });
            }
        });

        await createAuditLog(req.user.id, req.user.name, req.user.role, 'DELETE_TEACHER', 'Teacher', id, { name: teacher.name, email: teacher.email });
        res.json({ success: true, message: 'Teacher deleted successfully' });
    } catch (e) {
        console.error('Delete teacher error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.resetTeacherPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be ≥6 chars' });
    try {
        const teacher = await prisma.teacher.findUnique({ where: { id } });
        const hashed  = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: teacher.userId }, data: { password: hashed } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'RESET_TEACHER_PASSWORD', 'Teacher', id, {});
        res.json({ success: true, message: 'Password reset' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS (Academic Year, Branch, Section, Subsection)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ACADEMIC_YEARS = [1, 2, 3, 4];
const VALID_BRANCHES = ['CSE', 'ECE', 'AIDE'];
const VALID_SECTIONS = ['A', 'B', 'C', 'D'];
const VALID_SUBSECTIONS = {
    A: ['A1', 'A2', 'A3'],
    B: ['B1', 'B2', 'B3'],
    C: ['C1', 'C2', 'C3'],
    D: ['D1', 'D2', 'D3'],
};

function validateAcademicFields({ academicYear, branch, section, subsection }, isRequired = true) {
    if (isRequired || academicYear !== undefined) {
        const yr = parseInt(academicYear, 10);
        if (!VALID_ACADEMIC_YEARS.includes(yr)) {
            return 'Academic Year must be 1, 2, 3, or 4 (1st Year to 4th Year)';
        }
    }
    if (isRequired || branch !== undefined) {
        const br = (branch || '').toUpperCase();
        if (!VALID_BRANCHES.includes(br)) {
            return `Branch must be one of: ${VALID_BRANCHES.join(', ')}`;
        }
    }
    if (isRequired || section !== undefined) {
        const sec = (section || '').toUpperCase();
        if (!VALID_SECTIONS.includes(sec)) {
            return `Section must be one of: ${VALID_SECTIONS.join(', ')}`;
        }
    }
    if (isRequired || subsection !== undefined) {
        const sec = (section || 'A').toUpperCase();
        const sub = (subsection || '').toUpperCase();
        const allowed = VALID_SUBSECTIONS[sec] || [];
        if (!allowed.includes(sub)) {
            return `Subsection for Section ${sec} must be one of: ${allowed.join(', ')}`;
        }
    }
    return null;
}

exports.createStudent = async (req, res) => {
    const {
        studentId, name, email, password,
        academicYear, branch, section, subsection,
        class: cls, faceImage, image
    } = req.body;

    if (!studentId || !name) {
        return res.status(400).json({ success: false, message: 'Student ID / Roll Number and Name are required' });
    }

    const acYear = academicYear !== undefined && academicYear !== null && academicYear !== ''
        ? parseInt(academicYear, 10)
        : 1;
    const acBranch = (branch || 'CSE').toUpperCase();
    const acSection = (section || 'A').toUpperCase();
    const acSubsection = (subsection || `${acSection}1`).toUpperCase();

    const academicError = validateAcademicFields({
        academicYear: acYear,
        branch: acBranch,
        section: acSection,
        subsection: acSubsection
    }, true);

    if (academicError) {
        return res.status(400).json({ success: false, message: academicError });
    }

    const displayClass = cls || `${acBranch} - Year ${acYear}`;

    try {
        let userId = null;
        if (email && password) {
            const hashed = await bcrypt.hash(password, 12);
            const user = await prisma.user.create({
                data: { name: name.trim(), email: email.toLowerCase().trim(), password: hashed, role: 'student', status: 'active' }
            });
            userId = user.id;
        }

        const profilePhoto = req.file ? `/uploads/students/${req.file.filename}` : (req.body.profilePhoto || '');

        const student = await prisma.student.create({
            data: {
                studentId: studentId.trim(),
                name: name.trim(),
                email: email ? email.toLowerCase().trim() : null,
                userId,
                academicYear: acYear,
                branch: acBranch,
                section: acSection,
                subsection: acSubsection,
                class: displayClass,
                profilePhoto,
                status: 'active'
            }
        });

        // Face registration if face image is provided
        let faceWarning = null;
        let faceImg = faceImage || image;

        // Fallback: If no explicit faceImage was captured, but a profilePhoto was uploaded via multer, use it
        if (!faceImg && req.file && req.file.path) {
            try {
                const fs = require('fs');
                if (fs.existsSync(req.file.path)) {
                    const fileBuf = fs.readFileSync(req.file.path);
                    faceImg = `data:${req.file.mimetype || 'image/jpeg'};base64,${fileBuf.toString('base64')}`;
                }
            } catch (readErr) {
                console.warn('Could not read uploaded avatar for face recognition:', readErr.message);
            }
        }

        if (faceImg) {
            try {
                const faceRes = await faceRecognitionService.registerFace(studentId, name, faceImg);
                if (faceRes.success && faceRes.embedding) {
                    await prisma.student.update({
                        where: { id: student.id },
                        data: { faceEmbedding: faceRes.embedding }
                    });
                } else if (!faceRes.success) {
                    faceWarning = faceRes.message || 'Face detection failed';
                }
            } catch (faceErr) {
                faceWarning = 'Face registration service error: ' + faceErr.message;
                console.warn('Face registration notice during createStudent:', faceErr.message);
            }
        }

        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_STUDENT', 'Student', student.id, {
            studentId,
            name,
            academicYear: acYear,
            branch: acBranch,
            section: acSection,
            subsection: acSubsection,
            hasFace: !!faceImg,
            hasPhoto: !!profilePhoto
        });

        res.status(201).json({
            success: true,
            message: 'Student created successfully' + (faceImg && !faceWarning ? ' with face registered' : ''),
            student,
            faceWarning
        });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Student ID or email already exists' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getStudents = async (req, res) => {
    const { search, status = 'active', limit, academicYear, branch, section, subsection } = req.query;
    try {
        const where = {
            ...(status && status !== 'all' ? { status } : {}),
            ...(academicYear && academicYear !== 'all' ? { academicYear: parseInt(academicYear, 10) } : {}),
            ...(branch && branch !== 'all' ? { branch: branch.toUpperCase() } : {}),
            ...(section && section !== 'all' ? { section: section.toUpperCase() } : {}),
            ...(subsection && subsection !== 'all' ? { subsection: subsection.toUpperCase() } : {}),
            ...(search ? { OR: [
                { name:      { contains: search, mode: 'insensitive' } },
                { studentId: { contains: search, mode: 'insensitive' } },
                { email:     { contains: search, mode: 'insensitive' } }
            ]} : {})
        };
        const students = await prisma.student.findMany({
            where,
            orderBy: [
                { academicYear: 'asc' },
                { branch: 'asc' },
                { section: 'asc' },
                { subsection: 'asc' },
                { studentId: 'asc' }
            ],
            ...(limit ? { take: parseInt(limit, 10) } : {})
        });
        res.json({ success: true, count: students.length, students });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateStudent = async (req, res) => {
    const { id } = req.params;
    const { name, email, class: cls, academicYear, branch, section, subsection } = req.body;
    try {
        const currentStudent = await prisma.student.findUnique({ where: { id } });
        if (!currentStudent) return res.status(404).json({ success: false, message: 'Student not found' });

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
        if (cls !== undefined) updateData.class = cls;

        const targetYear = academicYear !== undefined && academicYear !== null && academicYear !== ''
            ? parseInt(academicYear, 10)
            : currentStudent.academicYear;
        const targetBranch = branch ? branch.toUpperCase() : currentStudent.branch;
        const targetSection = section ? section.toUpperCase() : currentStudent.section;
        const targetSubsection = subsection ? subsection.toUpperCase() : (
            section && section.toUpperCase() !== currentStudent.section ? `${targetSection}1` : currentStudent.subsection
        );

        if (academicYear !== undefined || branch !== undefined || section !== undefined || subsection !== undefined) {
            const err = validateAcademicFields({
                academicYear: targetYear,
                branch: targetBranch,
                section: targetSection,
                subsection: targetSubsection
            }, true);
            if (err) return res.status(400).json({ success: false, message: err });

            updateData.academicYear = targetYear;
            updateData.branch = targetBranch;
            updateData.section = targetSection;
            updateData.subsection = targetSubsection;
        }

        const student = await prisma.student.update({ where: { id }, data: updateData });
        if (student.userId && (name || email)) {
            await prisma.user.update({
                where: { id: student.userId },
                data: {
                    ...(name ? { name: name.trim() } : {}),
                    ...(email ? { email: email.toLowerCase().trim() } : {})
                }
            });
        }
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'UPDATE_STUDENT', 'Student', id, req.body);
        res.json({ success: true, student });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.archiveStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const student = await prisma.student.findUnique({ where: { id } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
        const newStatus = student.status === 'archived' ? 'active' : 'archived';
        await prisma.student.update({ where: { id }, data: { status: newStatus } });
        if (student.userId) await prisma.user.update({ where: { id: student.userId }, data: { status: newStatus } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, newStatus === 'archived' ? 'ARCHIVE_STUDENT' : 'RESTORE_STUDENT', 'Student', id, {});
        res.json({ success: true, message: `Student ${newStatus === 'archived' ? 'archived' : 'restored'}` });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deleteStudent = async (req, res) => {
    const { id } = req.params;
    if (req.query.archive === 'true') {
        return exports.archiveStudent(req, res);
    }
    try {
        const student = await prisma.student.findUnique({ where: { id } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        // Remove face from Face API if registered
        try {
            await faceRecognitionService.removeStudent(student.studentId);
        } catch (faceErr) {
            console.warn('Face API student removal notice:', faceErr.message);
        }

        await prisma.$transaction(async (tx) => {
            // 1. Delete enrollments
            await tx.enrollment.deleteMany({ where: { studentId: id } });

            // 2. Delete attendance records for this student
            await tx.attendanceRecord.deleteMany({ where: { studentId: id } });

            // 3. Delete student profile
            await tx.student.delete({ where: { id } });

            // 4. Delete user account and audit logs
            if (student.userId) {
                await tx.auditLog.deleteMany({ where: { actorId: student.userId } });
                await tx.user.delete({ where: { id: student.userId } });
            }
        });

        await createAuditLog(req.user.id, req.user.name, req.user.role, 'DELETE_STUDENT', 'Student', id, { studentId: student.studentId, name: student.name });
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (e) {
        console.error('Delete student error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.resetStudentPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be ≥6 chars' });
    try {
        const student = await prisma.student.findUnique({ where: { id } });
        if (!student?.userId) return res.status(400).json({ success: false, message: 'Student has no login account. Provide an email first.' });
        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: student.userId }, data: { password: hashed } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'RESET_STUDENT_PASSWORD', 'Student', id, {});
        res.json({ success: true, message: 'Password reset' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASSES
// ─────────────────────────────────────────────────────────────────────────────

exports.createClass = async (req, res) => {
    const { name, code, department, program, year, semester, academicSession } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'name and code required' });
    try {
        const cls = await prisma.class.create({ data: { name, code, department, program, year, semester, academicSession, status: 'active' } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_CLASS', 'Class', cls.id, { name, code });
        res.status(201).json({ success: true, class: cls });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Class code already exists' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getClasses = async (req, res) => {
    try {
        const classes = await prisma.class.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } });
        res.json({ success: true, classes });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateClass = async (req, res) => {
    const { id } = req.params;
    try {
        const cls = await prisma.class.update({ where: { id }, data: req.body });
        res.json({ success: true, class: cls });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.archiveClass = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.class.update({ where: { id }, data: { status: 'archived' } });
        res.json({ success: true, message: 'Class archived' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────

exports.createSubject = async (req, res) => {
    const { name, code, classId, academicSession, credits, attendanceThreshold } = req.body;
    if (!name || !code || !classId) return res.status(400).json({ success: false, message: 'name, code, classId required' });
    try {
        const subject = await prisma.subject.create({
            data: { name, code, classId, academicSession: academicSession || '', credits: credits ? parseInt(credits) : 0, attendanceThreshold: attendanceThreshold ? parseInt(attendanceThreshold) : 75, status: 'active' }
        });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_SUBJECT', 'Subject', subject.id, { name, code });
        res.status(201).json({ success: true, subject });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Subject code already exists for this class/session' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getSubjects = async (req, res) => {
    const { classId } = req.query;
    try {
        const subjects = await prisma.subject.findMany({
            where: { status: 'active', ...(classId ? { classId } : {}) },
            include: { class: { select: { name: true, code: true } } },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, subjects });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateSubject = async (req, res) => {
    const { id } = req.params;
    const { name, credits, attendanceThreshold } = req.body;
    try {
        const subject = await prisma.subject.update({ where: { id }, data: { name, credits: credits ? parseInt(credits) : undefined, attendanceThreshold: attendanceThreshold ? parseInt(attendanceThreshold) : undefined } });
        res.json({ success: true, subject });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────────────────────────

exports.createEnrollment = async (req, res) => {
    const { studentId, classId, subjectId, academicSession } = req.body;
    if (!studentId || !classId || !subjectId || !academicSession) return res.status(400).json({ success: false, message: 'All fields required' });
    try {
        const enrollment = await prisma.enrollment.create({ data: { studentId, classId, subjectId, academicSession, status: 'active', enrolledById: req.user.id } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_ENROLLMENT', 'Enrollment', enrollment.id, { studentId, subjectId });
        res.status(201).json({ success: true, enrollment });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Student already enrolled in this subject for this session' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getEnrollments = async (req, res) => {
    const { classId, subjectId, studentId } = req.query;
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(studentId ? { studentId } : {}) },
            include: {
                student: { select: { id: true, name: true, studentId: true } },
                class:   { select: { id: true, name: true, code: true } },
                subject: { select: { id: true, name: true, code: true, attendanceThreshold: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, count: enrollments.length, enrollments });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.dropEnrollment = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.enrollment.update({ where: { id }, data: { status: 'dropped' } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'DROP_ENROLLMENT', 'Enrollment', id, {});
        res.json({ success: true, message: 'Enrollment dropped' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

exports.createAssignment = async (req, res) => {
    const { teacherId, classId, subjectId, academicSession } = req.body;
    if (!teacherId || !classId || !subjectId || !academicSession) return res.status(400).json({ success: false, message: 'All fields required' });
    try {
        // Get teacher profile id
        const teacherProfile = await prisma.teacher.findFirst({ where: { userId: teacherId } });
        const assignment = await prisma.teacherAssignment.create({
            data: { teacherId, teacherProfileId: teacherProfile?.id || null, classId, subjectId, academicSession, status: 'active', assignedById: req.user.id }
        });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CREATE_ASSIGNMENT', 'TeacherAssignment', assignment.id, { teacherId, subjectId });
        res.status(201).json({ success: true, assignment });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Teacher already assigned to this class/subject for this session' });
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const assignments = await prisma.teacherAssignment.findMany({
            include: {
                teacherUser:    { select: { name: true, email: true } },
                class:          { select: { name: true, code: true } },
                subject:        { select: { name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, assignments });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deactivateAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.teacherAssignment.update({ where: { id }, data: { status: 'inactive' } });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'DEACTIVATE_ASSIGNMENT', 'TeacherAssignment', id, {});
        res.json({ success: true, message: 'Assignment deactivated' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE (institution-wide)
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllAttendance = async (req, res) => {
    const { classId, subjectId, teacherId, fromDate, toDate, page = 1, limit = 25 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (classId)   where.classId   = classId;
    if (subjectId) where.subjectId = subjectId;
    if (teacherId) {
        where.OR = [
            { teacherId },
            { teacher: { userId: teacherId } }
        ];
    }
    if (fromDate || toDate) {
        where.date = {};
        if (fromDate) { const d = new Date(fromDate); d.setHours(0,0,0,0);       where.date.gte = d; }
        if (toDate)   { const d = new Date(toDate);   d.setHours(23,59,59,999);  where.date.lte = d; }
    }
    try {
        const [rawAttendance, count, allActiveStudents] = await Promise.all([
            prisma.attendance.findMany({
                where, skip, take: parseInt(limit),
                include: {
                    teacher: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            subject: true,
                            userId: true,
                            user: { select: { id: true, name: true, email: true } },
                            academicAccess: true
                        }
                    },
                    class:   { select: { id: true, name: true, code: true, department: true } },
                    subject: { select: { id: true, name: true, code: true } },
                    records: {
                        include: {
                            student: {
                                select: {
                                    id: true,
                                    name: true,
                                    studentId: true,
                                    academicYear: true,
                                    branch: true,
                                    section: true,
                                    subsection: true
                                }
                            }
                        }
                    }
                },
                orderBy: { date: 'desc' }
            }),
            prisma.attendance.count({ where }),
            prisma.student.findMany({
                where: { status: 'active' },
                select: {
                    id: true,
                    name: true,
                    studentId: true,
                    academicYear: true,
                    branch: true,
                    section: true,
                    subsection: true
                }
            })
        ]);

        const attendance = rawAttendance.map(att => {
            const teacherName = att.teacher?.name || att.teacher?.user?.name || '–';
            const sampleStudent = att.records.find(r => r.student)?.student;

            // Class / Branch resolution
            let resolvedClass = att.className || att.class?.name;
            if (!resolvedClass && sampleStudent?.branch) {
                resolvedClass = sampleStudent.branch;
            }
            if (!resolvedClass && att.teacher?.academicAccess?.length > 0) {
                resolvedClass = att.teacher.academicAccess[0].branch;
            }
            if (!resolvedClass) resolvedClass = '–';

            // Section / Subsection resolution
            let resolvedSection = att.section;
            if (!resolvedSection && sampleStudent) {
                resolvedSection = (sampleStudent.subsection && sampleStudent.subsection !== 'ALL')
                    ? sampleStudent.subsection
                    : sampleStudent.section;
            }
            if (!resolvedSection && att.teacher?.academicAccess?.length > 0) {
                const acc = att.teacher.academicAccess[0];
                resolvedSection = (acc.subsection && acc.subsection !== 'ALL') ? acc.subsection : acc.section;
            }

            const classDisplay = resolvedClass !== '–'
                ? (resolvedSection ? `${resolvedClass} - ${resolvedSection}` : resolvedClass)
                : '–';

            // Subject resolution
            const subjectDisplay = att.subjectName || att.subject?.name || att.teacher?.subject || '–';

            // Session resolution
            let sessionDisplay = att.sessionLabel || att.academicSession;
            if (!sessionDisplay && sampleStudent?.academicYear) {
                sessionDisplay = `Year ${sampleStudent.academicYear}`;
            }
            if (!sessionDisplay && att.teacher?.academicAccess?.length > 0) {
                sessionDisplay = `Year ${att.teacher.academicAccess[0].academicYear}`;
            }
            if (!sessionDisplay && resolvedSection) {
                sessionDisplay = `Sec ${resolvedSection}`;
            }
            if (!sessionDisplay) {
                sessionDisplay = 'Regular';
            }

            // Academic year resolution
            const parsedYear = parseInt((att.sessionLabel || att.academicSession || '').replace(/\D/g, ''), 10);
            const resolvedYear = sampleStudent?.academicYear || parsedYear || (att.teacher?.academicAccess?.[0]?.academicYear) || null;

            // Determine students strictly matching this corresponding batch
            const batchStudents = allActiveStudents.filter(s => {
                if (resolvedYear && s.academicYear !== resolvedYear) return false;
                if (resolvedClass && resolvedClass !== '–' && (s.branch || '').toUpperCase() !== resolvedClass.toUpperCase()) return false;
                if (resolvedSection && resolvedSection !== 'ALL') {
                    const sSec = (s.section || '').toUpperCase();
                    const sSub = (s.subsection || '').toUpperCase();
                    if (sSub !== resolvedSection.toUpperCase() && sSec !== resolvedSection.toUpperCase()) return false;
                }
                return true;
            });

            const totalBatchStudents = Math.max(batchStudents.length, att.records.length);
            const presentCount = att.records.filter(r => r.status === 'present').length;
            const absentCount = Math.max(0, totalBatchStudents - presentCount);

            // Ensure any batch students not yet in records are represented for correction/review
            const existingStudentIds = new Set(att.records.map(r => r.studentId));
            const synthesizedMissing = batchStudents
                .filter(bs => !existingStudentIds.has(bs.id))
                .map(bs => ({
                    id: `synth_${att.id}_${bs.id}`,
                    attendanceId: att.id,
                    studentId: bs.id,
                    studentName: bs.name,
                    studentRollNo: bs.studentId,
                    status: 'absent',
                    markedAt: att.date,
                    student: bs
                }));

            const fullRecords = [...att.records, ...synthesizedMissing];

            return {
                ...att,
                records: fullRecords,
                presentCount,
                absentCount,
                totalCount: totalBatchStudents,
                totalBatchStudents,
                // Provide teacherId as an object with name for backward compatibility with old code
                teacherId: att.teacher ? { _id: att.teacher.id, id: att.teacher.id, name: teacherName, email: att.teacher.email } : att.teacherId,
                teacherName,
                classDisplay,
                subjectDisplay,
                sessionDisplay,
                academicYear: resolvedYear
            };
        });

        res.json({ success: true, count, attendance });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.correctAttendance = async (req, res) => {
    const { id } = req.params;
    const { records, reason } = req.body;
    if (!records || !reason) return res.status(400).json({ success: false, message: 'records and reason required' });
    try {
        for (const r of records) {
            const student = await prisma.student.findFirst({
                where: { OR: [{ studentId: r.studentRollNo }, { id: r.studentId }] }
            });
            if (!student) continue;

            await prisma.attendanceRecord.upsert({
                where: { attendanceId_studentId: { attendanceId: id, studentId: student.id } },
                update: { status: r.status },
                create: {
                    attendanceId: id,
                    studentId: student.id,
                    studentName: student.name,
                    studentRollNo: student.studentId,
                    status: r.status,
                    markedAt: new Date()
                }
            });
        }
        await prisma.attendance.update({
            where: { id },
            data: { correctedById: req.user.id, correctionReason: reason, correctionAt: new Date() }
        });
        await createAuditLog(req.user.id, req.user.name, req.user.role, 'CORRECT_ATTENDANCE', 'Attendance', id, { reason });
        res.json({ success: true, message: 'Attendance corrected' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

exports.getAuditLogs = async (req, res) => {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    try {
        const [logs, count] = await Promise.all([
            prisma.auditLog.findMany({
                where: action ? { action: { contains: action, mode: 'insensitive' } } : {},
                orderBy: { createdAt: 'desc' },
                skip, take: parseInt(limit)
            }),
            prisma.auditLog.count({ where: action ? { action: { contains: action, mode: 'insensitive' } } : {} })
        ]);
        res.json({ success: true, count, logs });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER ACADEMIC ACCESS (Year, Branch, Section, Subsection)
// ─────────────────────────────────────────────────────────────────────────────

exports.getTeacherAccess = async (req, res) => {
    const { id } = req.params;
    try {
        const teacher = await prisma.teacher.findUnique({
            where: { id },
            include: {
                academicAccess: {
                    orderBy: [
                        { academicYear: 'asc' },
                        { branch: 'asc' },
                        { section: 'asc' },
                        { subsection: 'asc' }
                    ]
                }
            }
        });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
        res.json({ success: true, count: teacher.academicAccess.length, access: teacher.academicAccess, teacher });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.assignTeacherAccess = async (req, res) => {
    const { id } = req.params;
    const { academicYear, branch, section, subsection } = req.body;

    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

    const yr = parseInt(academicYear, 10);
    const br = (branch || '').toUpperCase().trim();
    const sec = (section || '').toUpperCase().trim();
    const sub = (subsection || 'ALL').toUpperCase().trim();

    if (!VALID_ACADEMIC_YEARS.includes(yr)) {
        return res.status(400).json({ success: false, message: 'Academic Year must be between 1 and 4' });
    }
    if (!VALID_BRANCHES.includes(br)) {
        return res.status(400).json({ success: false, message: `Branch must be one of: ${VALID_BRANCHES.join(', ')}` });
    }
    if (!VALID_SECTIONS.includes(sec)) {
        return res.status(400).json({ success: false, message: `Section must be one of: ${VALID_SECTIONS.join(', ')}` });
    }

    if (sub !== 'ALL') {
        const allowedSubs = VALID_SUBSECTIONS[sec] || [];
        if (!allowedSubs.includes(sub)) {
            return res.status(400).json({ success: false, message: `Subsection for Section ${sec} must be 'ALL' or one of: ${allowedSubs.join(', ')}` });
        }
    }

    try {
        const access = await prisma.teacherAcademicAccess.upsert({
            where: {
                teacherId_academicYear_branch_section_subsection: {
                    teacherId: id,
                    academicYear: yr,
                    branch: br,
                    section: sec,
                    subsection: sub
                }
            },
            update: {
                assignedById: req.user.id
            },
            create: {
                teacherId: id,
                academicYear: yr,
                branch: br,
                section: sec,
                subsection: sub,
                assignedById: req.user.id
            }
        });

        await createAuditLog(req.user.id, req.user.name, req.user.role, 'ASSIGN_TEACHER_ACCESS', 'TeacherAcademicAccess', access.id, {
            teacherId: id,
            teacherName: teacher.name,
            academicYear: yr,
            branch: br,
            section: sec,
            subsection: sub
        });

        res.status(201).json({ success: true, message: 'Academic access assigned successfully', access });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.revokeTeacherAccess = async (req, res) => {
    const { id, accessId } = req.params;
    const targetAccessId = accessId || id;
    try {
        const existing = await prisma.teacherAcademicAccess.findUnique({
            where: { id: targetAccessId },
            include: { teacher: true }
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Access allocation not found' });

        await prisma.teacherAcademicAccess.delete({ where: { id: targetAccessId } });

        await createAuditLog(req.user.id, req.user.name, req.user.role, 'REVOKE_TEACHER_ACCESS', 'TeacherAcademicAccess', targetAccessId, {
            teacherId: existing.teacherId,
            teacherName: existing.teacher?.name,
            academicYear: existing.academicYear,
            branch: existing.branch,
            section: existing.section,
            subsection: existing.subsection
        });

        res.json({ success: true, message: 'Academic access revoked successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
