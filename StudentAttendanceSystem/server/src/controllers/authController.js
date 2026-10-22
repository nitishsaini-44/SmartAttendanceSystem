const bcrypt    = require('bcryptjs');
const prisma    = require('../config/prisma');
const { generateToken } = require('../services/jwtService');

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/auth/login
// @access Public
// Unified login for admin, teacher, student
// ─────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { teacherProfile: true, studentProfile: true }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: 'Account is inactive or archived' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user.id, user.role, user.email);

        // Build response object based on role
        const userData = buildUserResponse(user);

        res.status(200).json({
            success: true,
            token,
            user: userData,
            teacher: userData // backward-compat alias
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/auth/me
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { teacherProfile: true, studentProfile: true }
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const userData = buildUserResponse(user);
        res.status(200).json({ success: true, user: userData, teacher: userData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/auth/register
// @access DISABLED (admin creates users via /api/admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.register = (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Self-registration is disabled. Contact your administrator to create an account.'
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route PUT /api/auth/change-password
// @access Private (all roles)
// ─────────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Both fields are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error changing password', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build consistent user response object
// ─────────────────────────────────────────────────────────────────────────────
function buildUserResponse(user) {
    const base = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
    };

    if (user.role === 'teacher' && user.teacherProfile) {
        return {
            ...base,
            subject: user.teacherProfile.subject,
            description: user.teacherProfile.description,
            profilePhoto: user.teacherProfile.profilePhoto,
            teacherId: user.teacherProfile.id
        };
    }

    if (user.role === 'student' && user.studentProfile) {
        return {
            ...base,
            studentId: user.studentProfile.studentId,
            class: user.studentProfile.class,
            section: user.studentProfile.section,
            profilePhoto: user.studentProfile.profilePhoto
        };
    }

    return base; // admin
}