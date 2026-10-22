const jwt = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT for any user role.
 * @param {string} id     - User UUID (PostgreSQL)
 * @param {string} role   - 'admin' | 'teacher' | 'student'
 * @param {string} email
 */
const generateToken = (id, role, email) => {
    return jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT and return decoded payload or throw.
 */
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken };