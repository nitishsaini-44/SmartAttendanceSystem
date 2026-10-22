const prisma = require('../config/prisma');

/**
 * Helper to resolve all attendance sessions, records, and subjects
 * for a student (from direct records, batch sessions, and formal enrollments).
 */
async function resolveStudentAttendanceGroups(student, { fromDate, toDate } = {}) {
    // 1. Fetch formal enrollments if any
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: 'active' },
        include: { class: true, subject: true }
    });

    // Date filtering if provided
    const dateFilter = {};
    if (fromDate) { const d = new Date(fromDate); d.setHours(0,0,0,0);       dateFilter.gte = d; }
    if (toDate)   { const d = new Date(toDate);   d.setHours(23,59,59,999);  dateFilter.lte = d; }

    // 2. Fetch all attendance sessions where student has a direct record
    const studentRecords = await prisma.attendanceRecord.findMany({
        where: { 
            studentId: student.id,
            ...(Object.keys(dateFilter).length ? { attendance: { date: dateFilter } } : {})
        },
        include: {
            attendance: {
                include: {
                    teacher: { select: { name: true, subject: true } },
                    class: true,
                    subject: true
                }
            }
        },
        orderBy: { attendance: { date: 'desc' } }
    });

    // 3. Also fetch all attendance sessions conducted for student's class & section
    const classConditions = [];
    if (student.branch) {
        classConditions.push({
            className: { equals: student.branch, mode: 'insensitive' },
            section: { in: [student.section, student.subsection, 'ALL'].filter(Boolean) }
        });
    }
    if (student.class) {
        classConditions.push({ className: { equals: student.class, mode: 'insensitive' } });
    }

    let classSectionSessions = [];
    if (classConditions.length > 0) {
        classSectionSessions = await prisma.attendance.findMany({
            where: {
                OR: classConditions,
                ...(Object.keys(dateFilter).length ? { date: dateFilter } : {})
            },
            include: {
                teacher: { select: { name: true, subject: true } },
                class: true,
                subject: true,
                records: { where: { studentId: student.id } }
            },
            orderBy: { date: 'desc' }
        });
    }

    // Merge sessions uniquely by attendance.id
    const sessionMap = new Map();

    for (const rec of studentRecords) {
        if (!sessionMap.has(rec.attendance.id)) {
            sessionMap.set(rec.attendance.id, {
                session: rec.attendance,
                record: rec
            });
        }
    }

    for (const s of classSectionSessions) {
        if (!sessionMap.has(s.id)) {
            const hasStudentRec = s.records && s.records.length > 0;
            sessionMap.set(s.id, {
                session: s,
                record: hasStudentRec ? s.records[0] : null
            });
        }
    }

    // Group by Subject
    const subjectGroups = new Map();

    for (const [sessionId, { session, record }] of sessionMap.entries()) {
        const subjectName = session.subject?.name || session.subjectName || session.teacher?.subject || 'General Studies';
        const subjectKey = (session.subjectId || subjectName).toLowerCase();

        if (!subjectGroups.has(subjectKey)) {
            subjectGroups.set(subjectKey, {
                subjectId: session.subjectId || 'subj-' + subjectKey.replace(/[^a-z0-9]/g, '-'),
                subjectName: subjectName,
                subjectCode: session.subject?.code || subjectName.slice(0, 4).toUpperCase(),
                className: session.className ? (session.section ? `${session.className} - ${session.section}` : session.className) : (student.branch ? `${student.branch} - ${student.subsection || student.section}` : 'Class'),
                academicSession: session.academicSession || session.sessionLabel || (student.academicYear ? `Year ${student.academicYear}` : '2026-27'),
                threshold: session.subject?.attendanceThreshold ?? 75,
                records: [],
                attended: 0,
                conducted: 0
            });
        }

        const group = subjectGroups.get(subjectKey);
        const status = record?.status || 'absent';
        group.conducted++;
        if (status === 'present') group.attended++;
        group.records.push({
            date: session.date,
            status: status,
            sessionLabel: session.sessionLabel || `Sec ${session.section || student.section || 'A'}`,
            source: session.source || 'manual',
            teacherName: session.teacher?.name || 'Teacher'
        });
    }

    // Merge in formal enrollments for subjects with 0 sessions
    for (const enr of enrollments) {
        const subjectKey = (enr.subjectId || enr.subject?.name || '').toLowerCase();
        if (!subjectGroups.has(subjectKey)) {
            subjectGroups.set(subjectKey, {
                subjectId: enr.subjectId,
                subjectName: enr.subject?.name || 'Subject',
                subjectCode: enr.subject?.code || 'SUBJ',
                className: enr.class?.name || student.class || 'Class',
                academicSession: enr.academicSession || '2026-27',
                threshold: enr.subject?.attendanceThreshold ?? 75,
                records: [],
                attended: 0,
                conducted: 0
            });
        }
    }

    return subjectGroups;
}

exports.getProfile = async (req, res) => {
    try {
        const student = req.studentProfile;
        if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

        const fullStudent = await prisma.student.findUnique({
            where: { id: student.id }
        }) || student;

        res.json({
            success: true,
            student: {
                id: fullStudent.id,
                studentId: fullStudent.studentId,
                name: fullStudent.name,
                email: fullStudent.email,
                class: fullStudent.class || `${fullStudent.branch || ''} - Year ${fullStudent.academicYear || ''}`.trim() || '–',
                section: fullStudent.section || '–',
                subsection: fullStudent.subsection || '–',
                branch: fullStudent.branch || '–',
                academicYear: fullStudent.academicYear || '–',
                profilePhoto: fullStudent.profilePhoto,
                status: fullStudent.status
            }
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getEnrollments = async (req, res) => {
    try {
        const student = req.studentProfile;
        if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

        const groups = await resolveStudentAttendanceGroups(student);
        const enrollments = Array.from(groups.values()).map(g => ({
            id: g.subjectId,
            studentId: student.id,
            classId: g.className,
            subjectId: g.subjectId,
            academicSession: g.academicSession,
            status: 'active',
            class: { name: g.className, code: g.className },
            subject: { id: g.subjectId, name: g.subjectName, code: g.subjectCode, attendanceThreshold: g.threshold }
        }));

        res.json({ success: true, count: enrollments.length, enrollments });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getAttendanceSummary = async (req, res) => {
    try {
        const student = req.studentProfile;
        if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

        const groups = await resolveStudentAttendanceGroups(student);

        let totalConducted = 0, totalAttended = 0;
        const subjects = [];

        for (const group of groups.values()) {
            const conducted = group.conducted;
            const attended = group.attended;
            const missed = conducted - attended;
            const percentage = conducted > 0 ? Math.round((attended / conducted) * 100) : null;
            totalConducted += conducted;
            totalAttended  += attended;

            subjects.push({
                subjectId:       group.subjectId,
                subjectName:     group.subjectName,
                subjectCode:     group.subjectCode,
                className:       group.className,
                classCode:       group.subjectCode,
                academicSession: group.academicSession,
                conducted,
                attended,
                missed,
                percentage,
                belowThreshold:  percentage !== null && percentage < group.threshold,
                threshold:       group.threshold
            });
        }

        res.json({
            success: true,
            summary: {
                overallPercentage: totalConducted > 0 ? Math.round((totalAttended / totalConducted) * 100) : null,
                totalConducted,
                totalAttended,
                totalMissed: totalConducted - totalAttended,
                subjects
            }
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getAttendance = async (req, res) => {
    try {
        const student = req.studentProfile;
        if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
        const { fromDate, toDate } = req.query;

        const groups = await resolveStudentAttendanceGroups(student, { fromDate, toDate });
        const result = [];

        for (const group of groups.values()) {
            const total = group.conducted;
            const attended = group.attended;
            const missed = total - attended;
            const pct = total > 0 ? Math.round((attended / total) * 100) : null;

            result.push({
                enrollment: {
                    id: group.subjectId,
                    subject: {
                        id: group.subjectId,
                        name: group.subjectName,
                        code: group.subjectCode
                    },
                    class: {
                        name: group.className,
                        code: group.subjectCode
                    },
                    academicSession: group.academicSession
                },
                totalSessions: total,
                attended,
                missed,
                percentage: pct,
                belowThreshold: pct !== null && pct < group.threshold,
                threshold: group.threshold,
                records: group.records
            });
        }

        res.json({ success: true, attendance: result });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSubjectAttendance = async (req, res) => {
    try {
        const student  = req.studentProfile;
        if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
        const { subjectId } = req.params;

        const groups = await resolveStudentAttendanceGroups(student);
        const targetGroup = Array.from(groups.values()).find(g => 
            g.subjectId === subjectId || 
            g.subjectId.toLowerCase() === subjectId.toLowerCase() ||
            g.subjectName.toLowerCase() === subjectId.toLowerCase()
        );

        if (!targetGroup) return res.status(404).json({ success: false, message: 'Subject attendance not found' });

        const total = targetGroup.conducted;
        const attended = targetGroup.attended;
        const missed = total - attended;
        const pct = total > 0 ? Math.round((attended / total) * 100) : null;

        res.json({
            success: true,
            subject: { id: targetGroup.subjectId, name: targetGroup.subjectName, code: targetGroup.subjectCode },
            class: { name: targetGroup.className },
            totalSessions: total,
            attended,
            missed,
            percentage: pct,
            belowThreshold: pct !== null && pct < targetGroup.threshold,
            threshold: targetGroup.threshold,
            records: targetGroup.records
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
