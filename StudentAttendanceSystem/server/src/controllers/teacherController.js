const path   = require('path');
const fs     = require('fs');
const prisma = require('../config/prisma');

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/teacher/profile
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        const teacher = req.teacherProfile;
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        res.json({ success: true, teacher });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route PUT /api/teacher/profile
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
    try {
        const { subject, description } = req.body;
        const updateData = {};
        if (subject !== undefined) updateData.subject = subject;
        if (description !== undefined) updateData.description = description;

        // Teachers CANNOT change their name or email (administered only)
        if (req.user.role === 'admin' && req.body.name) {
            updateData.name = req.body.name;
            await prisma.user.update({ where: { id: req.user.id }, data: { name: req.body.name } });
        }

        const teacher = await prisma.teacher.update({
            where: { id: req.teacherProfile.id },
            data: updateData
        });
        res.json({ success: true, teacher });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/teacher/profile/photo
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const photoPath = `/uploads/teachers/${req.file.filename}`;
        const teacher   = await prisma.teacher.update({
            where: { id: req.teacherProfile.id },
            data: { profilePhoto: photoPath }
        });
        res.json({ success: true, profilePhoto: photoPath, teacher });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/teacher/my-access
// Returns administration-assigned academic access for the current teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyAcademicAccess = async (req, res) => {
    try {
        const teacher = req.teacherProfile || await prisma.teacher.findFirst({ where: { userId: req.user.id } });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

        const access = await prisma.teacherAcademicAccess.findMany({
            where: { teacherId: teacher.id },
            orderBy: [
                { academicYear: 'asc' },
                { branch: 'asc' },
                { section: 'asc' },
                { subsection: 'asc' }
            ]
        });

        res.json({ success: true, count: access.length, access });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};