const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

// Ensure upload directories exist
['uploads/teachers', 'uploads/students'].forEach(dir => {
    const full = path.join(__dirname, '..', dir);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// Prisma client (PostgreSQL)
const prisma = require('./config/prisma');

const authRoutes          = require('./routes/authRoutes');
const adminRoutes         = require('./routes/adminRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const studentRoutes       = require('./routes/studentRoutes');
const attendanceRoutes    = require('./routes/attendanceRoutes');
const teacherRoutes       = require('./routes/teacherRoutes');
const errorHandler        = require('./middleware/errorHandler');

const app = express();

// Disable x-powered-by for security
app.disable('x-powered-by');

// ── Middleware ────────────────────────────────────────────────────────────────
const corsOptions = {
    origin: (origin, callback) => {
        // Dynamically reflect the requesting origin to support Vercel, localhost, and custom domains
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Root & Health check endpoints (essential for Docker, Render, Railway, AWS ALB) ──
app.get('/', (req, res) => {
    res.json({
        success: true,
        name: 'Smart Attendance System API',
        status: 'online',
        version: '2.0.0',
        health: '/health'
    });
});

app.get(['/health', '/api/health'], async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            success: true,
            status: 'healthy',
            database: 'PostgreSQL connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            database: 'disconnected',
            error: err.message
        });
    }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/student',    studentPortalRoutes);
app.use('/api/students',   studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teacher',    teacherRoutes);

app.use(errorHandler);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

const PORT = process.env.PORT || 5000;

const start = async () => {
    // Verify DB connection on startup
    await prisma.$connect();
    console.log('✅  Connected to PostgreSQL');
    const server = app.listen(PORT, () => {
        console.log(`🚀  Server running on port ${PORT}`);
    });

    // Graceful shutdown handling for Docker / PaaS orchestrators
    const shutdown = async (signal) => {
        console.log(`\n🛑  Received ${signal}, closing server gracefully...`);
        server.close(async () => {
            await prisma.$disconnect();
            console.log('🔒  Database disconnected. Server closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

if (require.main === module) {
    start().catch(err => { console.error('Server failed to start:', err); process.exit(1); });
}

module.exports = app;