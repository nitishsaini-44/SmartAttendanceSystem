const { verifyToken } = require('../services/jwtService');
const prisma = require('../config/prisma');

/**
 * authenticate
 * Verifies Bearer JWT and loads req.user (User row from PostgreSQL).
 * Also loads req.teacherProfile / req.studentProfile when applicable.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
                teacherProfile: true,
                studentProfile: true
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: 'Account is inactive or archived' });
        }

        req.user           = user;
        req.userId         = user.id;
        req.teacherId      = user.teacherProfile?.id || null; // backward-compat
        req.teacherProfile = user.teacherProfile || null;
        req.studentProfile = user.studentProfile || null;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * authorizeRoles(...roles)
 * Usage: authorizeRoles('admin') or authorizeRoles('teacher', 'admin')
 */
const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
        });
    }
    next();
};

/**
 * requireTeacherAssignment
 * Checks that the authenticated teacher has an active assignment for the
 * classId + subjectId provided in req.body or req.query.
 * Admins are always allowed through.
 */
const requireTeacherAssignment = async (req, res, next) => {
    try {
        if (req.user.role === 'admin') return next();

        const classId   = req.body?.classId   || req.query?.classId;
        const subjectId = req.body?.subjectId || req.query?.subjectId;

        if (!classId || !subjectId) return next(); // legacy mode — no class/subject

        const assignment = await prisma.teacherAssignment.findFirst({
            where: {
                teacherId: req.user.id,
                classId,
                subjectId,
                status: 'active'
            }
        });

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this class/subject.'
            });
        }

        req.assignment = assignment;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Assignment check failed', error: error.message });
    }
};

module.exports = { authenticate, authorizeRoles, requireTeacherAssignment };