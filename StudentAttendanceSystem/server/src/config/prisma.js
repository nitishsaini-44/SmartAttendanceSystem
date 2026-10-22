const { PrismaClient } = require('@prisma/client');

// Prevent multiple instances in development (hot-reload safe)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
