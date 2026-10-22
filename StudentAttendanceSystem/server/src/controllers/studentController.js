const prisma = require('../config/prisma');
const faceRecognitionService = require('../services/faceRecognitionService');

/**
 * Helper: Resolve academic access permissions for a teacher.
 * Returns null if user is not a teacher (e.g. admin has full access).
 * Returns { isBlocked: true } if teacher has zero assigned groups.
 * Returns { isBlocked: false, accessList, orConditions } if teacher has assigned groups.
 */
async function getTeacherAccessFilter(user) {
    if (!user || user.role !== 'teacher') return null;

    const teacherProfile = user.teacherProfile || await prisma.teacher.findFirst({ where: { userId: user.id } });
    if (!teacherProfile) {
        return { isBlocked: true, accessList: [] };
    }

    const accessList = await prisma.teacherAcademicAccess.findMany({
        where: { teacherId: teacherProfile.id }
    });

    if (!accessList || accessList.length === 0) {
        return { isBlocked: true, accessList: [] };
    }

    const orConditions = accessList.map(a => {
        const cond = {
            academicYear: a.academicYear,
            branch: a.branch,
            section: a.section
        };
        if (a.subsection && a.subsection !== 'ALL') {
            cond.subsection = a.subsection;
        }
        return cond;
    });

    return { isBlocked: false, accessList, orConditions };
}

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/students
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllStudents = async (req, res) => {
    try {
        const { search, class: cls, academicYear, branch, section, subsection } = req.query;

        const andClauses = [{ status: 'active' }];

        // Enforce teacher academic access assigned by administration
        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess) {
            if (teacherAccess.isBlocked) {
                return res.json({ 
                    success: true, 
                    count: 0, 
                    students: [], 
                    message: 'No student academic groups have been assigned to you by the administration.' 
                });
            }
            andClauses.push({ OR: teacherAccess.orConditions });
        }

        if (academicYear && academicYear !== 'all') {
            andClauses.push({ academicYear: parseInt(academicYear, 10) });
        }
        if (branch && branch !== 'all') {
            andClauses.push({ branch: branch.toUpperCase() });
        }
        if (section && section !== 'all') {
            andClauses.push({ section: section.toUpperCase() });
        }
        if (subsection && subsection !== 'all') {
            andClauses.push({ subsection: subsection.toUpperCase() });
        }
        if (cls) {
            andClauses.push({ class: cls });
        }
        if (search) {
            andClauses.push({
                OR: [
                    { name:      { contains: search, mode: 'insensitive' } },
                    { studentId: { contains: search, mode: 'insensitive' } },
                    { email:     { contains: search, mode: 'insensitive' } }
                ]
            });
        }

        const students = await prisma.student.findMany({
            where: { AND: andClauses },
            orderBy: [
                { academicYear: 'asc' },
                { branch: 'asc' },
                { section: 'asc' },
                { subsection: 'asc' },
                { studentId: 'asc' }
            ]
        });

        res.json({ success: true, count: students.length, students });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/students/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getStudent = async (req, res) => {
    try {
        const student = await prisma.student.findUnique({ where: { id: req.params.id } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess) {
            if (teacherAccess.isBlocked) {
                return res.status(403).json({ success: false, message: 'Access denied. No student groups assigned to you.' });
            }
            const hasAccess = teacherAccess.accessList.some(a =>
                a.academicYear === student.academicYear &&
                a.branch === student.branch &&
                a.section === student.section &&
                (a.subsection === 'ALL' || a.subsection === student.subsection)
            );
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to view this student.' });
            }
        }

        res.json({ success: true, student });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getTeacherAccessFilter = getTeacherAccessFilter;

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/students
// ─────────────────────────────────────────────────────────────────────────────
exports.addStudent = async (req, res) => {
    try {
        const { studentId, name, email, academicYear, branch, section, subsection, class: cls } = req.body;
        if (!studentId || !name) return res.status(400).json({ success: false, message: 'studentId and name required' });

        const acYear = academicYear ? parseInt(academicYear, 10) : 1;
        const acBranch = (branch || 'CSE').toUpperCase();
        const acSection = (section || 'A').toUpperCase();
        const acSubsection = (subsection || `${acSection}1`).toUpperCase();

        const profilePhoto = req.file ? `/uploads/students/${req.file.filename}` : '';
        const student = await prisma.student.create({
            data: {
                studentId: studentId.trim(),
                name: name.trim(),
                email: email ? email.toLowerCase().trim() : null,
                academicYear: acYear,
                branch: acBranch,
                section: acSection,
                subsection: acSubsection,
                class: cls || `${acBranch} - Year ${acYear}`,
                profilePhoto,
                registeredById: req.teacherProfile?.id || null,
                status: 'active'
            }
        });
        res.status(201).json({ success: true, message: 'Student added', student });
    } catch (e) {
        if (e.code === 'P2002') return res.status(409).json({ success: false, message: 'Student ID already exists' });
        res.status(500).json({ success: false, message: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route PUT /api/students/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.updateStudent = async (req, res) => {
    try {
        const { name, email, class: cls, academicYear, branch, section, subsection } = req.body;
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
        if (cls !== undefined) updateData.class = cls;
        if (academicYear) updateData.academicYear = parseInt(academicYear, 10);
        if (branch) updateData.branch = branch.toUpperCase();
        if (section) updateData.section = section.toUpperCase();
        if (subsection) updateData.subsection = subsection.toUpperCase();

        const student = await prisma.student.update({
            where:  { id: req.params.id },
            data:   updateData
        });
        res.json({ success: true, student });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route DELETE /api/students/:id   (soft-archive)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteStudent = async (req, res) => {
    try {
        await prisma.student.update({ where: { id: req.params.id }, data: { status: 'archived' } });
        res.json({ success: true, message: 'Student archived' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/students/download/csv
// ─────────────────────────────────────────────────────────────────────────────
exports.downloadStudentsCSV = async (req, res) => {
    try {
        const andClauses = [{ status: 'active' }];
        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess) {
            if (teacherAccess.isBlocked) {
                const header = 'Student ID,Name,Email,Academic Year,Branch,Section,Subsection\n';
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
                return res.send(header);
            }
            andClauses.push({ OR: teacherAccess.orConditions });
        }

        const students = await prisma.student.findMany({ 
            where: { AND: andClauses }, 
            orderBy: [
                { academicYear: 'asc' },
                { branch: 'asc' },
                { section: 'asc' },
                { subsection: 'asc' },
                { studentId: 'asc' }
            ]
        });
        const header = 'Student ID,Name,Email,Academic Year,Branch,Section,Subsection\n';
        const rows   = students.map(s => `${s.studentId},"${s.name}",${s.email || ''},${s.academicYear},${s.branch},${s.section},${s.subsection}`).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
        res.send(header + rows);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/students/:id/register-face
// ─────────────────────────────────────────────────────────────────────────────
exports.registerFace = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ success: false, message: 'Image is required' });

        const student = await prisma.student.findUnique({ where: { id: req.params.id } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        // Send to Face API to register
        const result = await faceRecognitionService.registerFace(student.studentId, student.name, image);
        if (!result.success) return res.status(400).json({ success: false, message: result.message || 'Face registration failed' });

        // Optionally store embedding if returned
        if (result.embedding) {
            await prisma.student.update({ where: { id: student.id }, data: { faceEmbedding: result.embedding } });
        }

        res.json({ success: true, message: `Face registered for ${student.name}` });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route PUT /api/students/:id/profile-photo
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const profilePhoto = `/uploads/students/${req.file.filename}`;
        const student = await prisma.student.update({ where: { id: req.params.id }, data: { profilePhoto } });
        res.json({ success: true, profilePhoto, student });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};