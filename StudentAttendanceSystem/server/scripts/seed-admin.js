/**
 * seed-admin.js — Creates the initial admin User in PostgreSQL.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@school.edu ADMIN_PASSWORD=Secret!123 node scripts/seed-admin.js
 *
 * Or set in .env temporarily, then remove.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma  = require('../src/config/prisma');
const bcrypt  = require('bcryptjs');

async function run() {
    const rawEmail = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name     = (process.env.ADMIN_NAME || 'Administrator').trim();

    if (!rawEmail || !password) {
        console.error('\n❌ ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be provided via environment variables.');
        console.error('Usage:');
        console.error('  ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=your_secure_password node scripts/seed-admin.js\n');
        process.exit(1);
    }

    const email = rawEmail.toLowerCase().trim();

    if (password.length < 8) {
        console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters.\n');
        process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        if (existing.role === 'admin') {
            console.log(`Admin account already exists for ${email}. Skipping.`);
        } else {
            console.error(`ERROR: ${email} is already registered with role '${existing.role}'.`);
        }
        await prisma.$disconnect();
        return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin  = await prisma.user.create({
        data: { name, email, password: hashed, role: 'admin', status: 'active' }
    });

    console.log('\n✅  Admin account created!');
    console.log(`    ID:    ${admin.id}`);
    console.log(`    Name:  ${admin.name}`);
    console.log(`    Email: ${admin.email}`);
    console.log('\n⚠️   Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env immediately.\n');

    await prisma.$disconnect();
}

run().catch(err => { console.error('Seed failed:', err); process.exit(1); });
