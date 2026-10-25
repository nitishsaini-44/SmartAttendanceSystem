const prisma = require('../config/prisma');
const { generateAttendanceCSV, generateFullAttendanceCSV } = require('../services/csvService');
const faceRecognitionService = require('../services/faceRecognitionService');
const { getTeacherAccessFilter } = require('./studentController');

// ─── helpers ──────────────────────────────────────────────────────────────────

function canTeacherAccessStudent(accessList, student) {
    if (!accessList || !student) return false;
    return accessList.some(a => {
        if (Number(a.academicYear) !== Number(student.academicYear)) return false;
        if ((a.branch || '').toUpperCase() !== (student.branch || '').toUpperCase()) return false;
        const aSec = (a.section || '').toUpperCase();
        const sSec = (student.section || '').toUpperCase();
        if (aSec !== 'ALL' && aSec !== sSec) return false;

        const aSub = (a.subsection || '').toUpperCase();
        const sSub = (student.subsection || '').toUpperCase();
        if (aSub !== 'ALL' && aSub !== sSub) return false;

        return true;
    });
}

const dayRange = (d = new Date()) => {
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    return { gte: s, lte: e };
};

// Build Set of student roll-numbers enrolled in a given class+subject.
// Returns null if classId/subjectId not provided (legacy mode — no restriction).
async function buildRosterSet(classId, subjectId) {
    if (!classId || !subjectId) return null;
    const enrollments = await prisma.enrollment.findMany({
        where: { classId, subjectId, status: 'active' },
        include: { student: { select: { studentId: true } } }
    });
    return new Set(enrollments.map(e => e.student.studentId).filter(Boolean));
}

// Upsert a session (find-or-create today's attendance for this teacher+class+subject).
async function getOrCreateSession(teacherId, { className, section, subsection, subject, classId, subjectId, academicSession, sessionLabel, source, academicYear }) {
    let finalSubject = subject || '';
    if (!finalSubject && teacherId) {
        try {
            const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { subject: true } });
            if (t?.subject) finalSubject = t.subject;
        } catch {}
    }

    let finalSessionLabel = sessionLabel || '';
    if (!finalSessionLabel && academicYear) {
        finalSessionLabel = `Year ${academicYear}`;
    }

    let finalAcademicSession = academicSession || '';
    if (!finalAcademicSession && academicYear) {
        finalAcademicSession = `Year ${academicYear}`;
    }

    // Determine targetSectionTag and search conditions
    let targetSectionTag = section || '';
    let sectionWhere = undefined;

    if (classId && subjectId) {
        // Class/Subject mode
        sectionWhere = section || '';
    } else {
        const isSub = subsection && subsection.toUpperCase() !== 'ALL';
        const cleanSec = (section || '').toUpperCase().trim();
        const cleanSub = (subsection || '').toUpperCase().trim();

        if (isSub) {
            targetSectionTag = cleanSub;
            // Search for existing subsection session (e.g. 'C3' or 'C-C3')
            sectionWhere = { in: [cleanSub, `${cleanSec}-${cleanSub}`].filter(Boolean) };
        } else {
            targetSectionTag = cleanSec ? `${cleanSec}-ALL` : 'ALL';
            // Search for existing complete section session (e.g. 'C-ALL', 'ALL', or 'C')
            sectionWhere = { in: [targetSectionTag, 'ALL', cleanSec].filter(Boolean) };
        }
    }

    const existing = await prisma.attendance.findFirst({
        where: {
            teacherId,
            date: dayRange(),
            ...(classId   ? { classId }               : { className: className || '' }),
            ...(subjectId ? { subjectId }              : (sectionWhere ? { section: sectionWhere } : {}))
        }
    });

    if (existing) {
        if ((!existing.subjectName && finalSubject) || (!existing.className && className) || (!existing.section && targetSectionTag) || (!existing.sessionLabel && finalSessionLabel)) {
            return prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    ...(finalSubject && !existing.subjectName ? { subjectName: finalSubject } : {}),
                    ...(className && !existing.className ? { className } : {}),
                    ...(targetSectionTag && !existing.section ? { section: targetSectionTag } : {}),
                    ...(finalSessionLabel && !existing.sessionLabel ? { sessionLabel: finalSessionLabel } : {}),
                    ...(finalAcademicSession && !existing.academicSession ? { academicSession: finalAcademicSession } : {})
                }
            });
        }
        return existing;
    }

    return prisma.attendance.create({
        data: {
            teacherId,
            date:           new Date(),
            className:      className      || '',
            section:        targetSectionTag || section || '',
            subjectName:    finalSubject,
            classId:        classId        || null,
            subjectId:      subjectId      || null,
            academicSession: finalAcademicSession,
            sessionLabel:   finalSessionLabel,
            source:         source || 'manual'
        }
    });
}

// Ensure all students matching this batch exist in the session (defaulting to 'absent')
async function ensureBatchStudentsInSession(sessionId, batchScope = {}) {
    try {
        const { academicYear, branch, section, subsection, classId, subjectId } = batchScope;

        let batchStudents = [];
        if (classId && subjectId) {
            const enrollments = await prisma.enrollment.findMany({
                where: { classId, subjectId, status: 'active' },
                include: { student: true }
            });
            batchStudents = enrollments.map(e => e.student).filter(Boolean);
        }

        if (batchStudents.length === 0) {
            const yr = academicYear ? parseInt(academicYear, 10) : undefined;
            const br = branch ? branch.toUpperCase().trim() : undefined;
            const targetSec = section ? section.toUpperCase().trim() : undefined;
            const targetSub = subsection ? subsection.toUpperCase().trim() : undefined;

            const all = await prisma.student.findMany({ where: { status: 'active' } });
            batchStudents = all.filter(s => {
                if (yr && s.academicYear !== yr) return false;
                if (br && (s.branch || '').toUpperCase() !== br) return false;
                if (targetSec && targetSec !== 'ALL') {
                    if ((s.section || '').toUpperCase() !== targetSec) return false;
                }
                if (targetSub && targetSub !== 'ALL') {
                    if ((s.subsection || '').toUpperCase() !== targetSub) return false;
                }
                return true;
            });
        }

        for (const s of batchStudents) {
            await prisma.attendanceRecord.upsert({
                where: { attendanceId_studentId: { attendanceId: sessionId, studentId: s.id } },
                update: {}, // Keep existing status if already present
                create: {
                    attendanceId: sessionId,
                    studentId: s.id,
                    studentName: s.name,
                    studentRollNo: s.studentId,
                    status: 'absent',
                    markedAt: new Date()
                }
            });
        }
    } catch (err) {
        console.error('Error ensuring batch students in session:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/attendance
// @access Private (teacher, admin)
// Manual bulk attendance
// ─────────────────────────────────────────────────────────────────────────────
exports.takeAttendance = async (req, res) => {
    try {
        const { records, subject, class: className, section, subsection, branch, academicYear, classId, subjectId, academicSession, sessionLabel } = req.body;
        if (!records || !records.length) return res.status(400).json({ success: false, message: 'records array is required' });

        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess && teacherAccess.isBlocked) {
            return res.status(403).json({ success: false, message: 'Access denied. You have not been assigned any student batches by the administration.' });
        }

        const teacherId = req.teacherId;
        const session   = await getOrCreateSession(teacherId, { 
            className: className || branch || '', 
            section: section || '', 
            subsection: subsection || '',
            subject, 
            classId, 
            subjectId, 
            academicSession, 
            sessionLabel, 
            academicYear,
            source: 'manual' 
        });

        await ensureBatchStudentsInSession(session.id, {
            academicYear,
            branch: branch || className,
            section: section || '',
            subsection: subsection || '',
            classId,
            subjectId
        });

        let markedCount = 0;
        for (const r of records) {
            const student = await prisma.student.findUnique({ where: { id: r.studentId } });
            if (!student) continue;

            if (teacherAccess && !canTeacherAccessStudent(teacherAccess.accessList, student)) {
                continue; // Skip student if teacher not assigned this academic group
            }

            await prisma.attendanceRecord.upsert({
                where: { attendanceId_studentId: { attendanceId: session.id, studentId: student.id } },
                update: { status: r.status || 'absent', markedAt: new Date() },
                create: {
                    attendanceId:  session.id,
                    studentId:     student.id,
                    studentName:   student.name,
                    studentRollNo: student.studentId,
                    status:        r.status || 'absent',
                    markedAt:      new Date()
                }
            });
            markedCount++;
        }

        res.status(201).json({ success: true, message: `Attendance recorded for ${markedCount} student(s)`, attendanceId: session.id });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error marking attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/today
// ─────────────────────────────────────────────────────────────────────────────
exports.getTodayAttendance = async (req, res) => {
    try {
        const { class: className, section, branch, subsection, classId, subjectId } = req.query;
        const targetClass = className || branch;
        let sectionFilter = undefined;
        if (section || subsection) {
            const isSub = subsection && subsection.toUpperCase() !== 'ALL';
            const cleanSec = (section || '').toUpperCase().trim();
            const cleanSub = (subsection || '').toUpperCase().trim();
            sectionFilter = isSub 
                ? { in: [cleanSub, `${cleanSec}-${cleanSub}`].filter(Boolean) } 
                : { in: [`${cleanSec}-ALL`, 'ALL', cleanSec].filter(Boolean) };
        }

        const sessions = await prisma.attendance.findMany({
            where: {
                teacherId: req.teacherId,
                date: dayRange(),
                ...(classId   ? { classId }               : (targetClass ? { className: targetClass } : {})),
                ...(subjectId ? { subjectId }              : (sectionFilter ? { section: sectionFilter } : {}))
            },
            include: { records: { include: { student: { select: { id: true, name: true, studentId: true, profilePhoto: true, academicYear: true, branch: true, section: true, subsection: true } } } } }
        });
        res.json({ success: true, sessions, attendance: sessions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error fetching attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/date/:date
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendanceByDate = async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const sessions = await prisma.attendance.findMany({
            where: { teacherId: req.teacherId, date: dayRange(date) },
            include: { records: { include: { student: { select: { id: true, name: true, studentId: true, academicYear: true, branch: true, section: true, subsection: true } } } } }
        });
        res.json({ success: true, sessions, attendance: sessions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error fetching attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance
// All attendance for this teacher, optional date filter
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllAttendance = async (req, res) => {
    try {
        const { fromDate, toDate, classId, subjectId, class: className } = req.query;
        const dateFilter = {};
        if (fromDate) { const d = new Date(fromDate); d.setHours(0,0,0,0);       dateFilter.gte = d; }
        if (toDate)   { const d = new Date(toDate);   d.setHours(23,59,59,999);  dateFilter.lte = d; }

        const sessions = await prisma.attendance.findMany({
            where: {
                teacherId: req.teacherId,
                ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
                ...(classId   ? { classId }   : (className ? { className } : {})),
                ...(subjectId ? { subjectId } : {})
            },
            include: { records: true },
            orderBy: { date: 'desc' }
        });
        res.json({ success: true, count: sessions.length, attendance: sessions });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error fetching attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route DELETE /api/attendance/today
// ─────────────────────────────────────────────────────────────────────────────
exports.resetTodayAttendance = async (req, res) => {
    try {
        const { classId, subjectId, class: className, section, branch, subsection } = req.query;
        const targetClass = className || branch;
        let targetSection = undefined;
        if (section || subsection) {
            const isSub = subsection && subsection.toUpperCase() !== 'ALL';
            const cleanSec = (section || '').toUpperCase().trim();
            const cleanSub = (subsection || '').toUpperCase().trim();
            targetSection = isSub 
                ? { in: [cleanSub, `${cleanSec}-${cleanSub}`].filter(Boolean) } 
                : { in: [`${cleanSec}-ALL`, 'ALL', cleanSec].filter(Boolean) };
        }

        const sessions = await prisma.attendance.findMany({
            where: {
                teacherId: req.teacherId,
                date: dayRange(),
                ...(classId     ? { classId }               : (targetClass   ? { className: targetClass }   : {})),
                ...(subjectId   ? { subjectId }              : (targetSection ? { section: targetSection }     : {}))
            }
        });
        for (const s of sessions) {
            await prisma.attendanceRecord.deleteMany({ where: { attendanceId: s.id } });
            await prisma.attendance.delete({ where: { id: s.id } });
        }
        res.json({ success: true, message: "Today's attendance reset" });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error resetting attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/download/today
// ─────────────────────────────────────────────────────────────────────────────
exports.downloadTodayAttendanceCSV = async (req, res) => {
    try {
        const { classId, subjectId, class: className, section, branch, subsection, academicYear } = req.query;
        const targetClass = className || branch;
        let targetSection = undefined;
        if (section || subsection) {
            const isSub = subsection && subsection.toUpperCase() !== 'ALL';
            const cleanSec = (section || '').toUpperCase().trim();
            const cleanSub = (subsection || '').toUpperCase().trim();
            targetSection = isSub 
                ? { in: [cleanSub, `${cleanSec}-${cleanSub}`].filter(Boolean) } 
                : { in: [`${cleanSec}-ALL`, 'ALL', cleanSec].filter(Boolean) };
        }

        const sessions = await prisma.attendance.findMany({
            where: {
                teacherId: req.teacherId,
                date: dayRange(),
                ...(classId   ? { classId }               : (targetClass   ? { className: targetClass }   : {})),
                ...(subjectId ? { subjectId }              : (targetSection ? { section: targetSection }     : {}))
            },
            include: { records: { include: { student: true } } }
        });
        let allRecords = sessions.flatMap(s => s.records.map(r => ({
            ...r,
            date: s.date,
            subject: s.subjectName,
            class: s.className,
            section: s.section,
            student: r.student
        })));

        if (academicYear) {
            allRecords = allRecords.filter(r => !r.student?.academicYear || Number(r.student.academicYear) === Number(academicYear));
        }

        const csv = await generateAttendanceCSV(allRecords);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (e) {
        res.status(500).json({ success: false, message: 'CSV generation failed', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/download/:date
// ─────────────────────────────────────────────────────────────────────────────
exports.downloadAttendanceCSV = async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const sessions = await prisma.attendance.findMany({
            where: { teacherId: req.teacherId, date: dayRange(date) },
            include: { records: true }
        });
        const allRecords = sessions.flatMap(s => s.records.map(r => ({ ...r, date: s.date, subject: s.subjectName, class: s.className, section: s.section })));
        const csv = await generateAttendanceCSV(allRecords);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${req.params.date}.csv"`);
        res.send(csv);
    } catch (e) {
        res.status(500).json({ success: false, message: 'CSV generation failed', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/download/range
// ─────────────────────────────────────────────────────────────────────────────
exports.downloadAttendanceCSVRange = async (req, res) => {
    try {
        const { fromDate, toDate, classId, subjectId } = req.query;
        const dateFilter = {};
        if (fromDate) { const d = new Date(fromDate); d.setHours(0,0,0,0); dateFilter.gte = d; }
        if (toDate)   { const d = new Date(toDate);   d.setHours(23,59,59,999); dateFilter.lte = d; }

        const sessions = await prisma.attendance.findMany({
            where: {
                teacherId: req.teacherId,
                ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
                ...(classId   ? { classId }   : {}),
                ...(subjectId ? { subjectId } : {})
            },
            include: { records: true },
            orderBy: { date: 'asc' }
        });

        const allRecords = sessions.flatMap(s => s.records.map(r => ({ ...r, date: s.date, subject: s.subjectName, class: s.className, section: s.section })));
        const csv = await generateFullAttendanceCSV(allRecords);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-range.csv"');
        res.send(csv);
    } catch (e) {
        res.status(500).json({ success: false, message: 'CSV generation failed', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/attendance/face
// Face recognition — single face
// ─────────────────────────────────────────────────────────────────────────────
exports.takeFaceAttendance = async (req, res) => {
    try {
        const { image, subject, class: className, section, subsection, academicYear, branch, classId, subjectId, academicSession, sessionLabel } = req.body;
        if (!image) return res.status(400).json({ success: false, message: 'Image is required' });

        // Roster enforcement
        const rosterSet = await buildRosterSet(classId, subjectId);

        // Scoped batch filter to speed up embedding comparisons significantly
        const batchScope = {
            academicYear: academicYear ? parseInt(academicYear, 10) : undefined,
            branch: branch || undefined,
            section: section || undefined,
            subsection: subsection || undefined
        };

        const faceResult = await faceRecognitionService.recognizeFace(image, batchScope);
        console.log('Face recognition result:', JSON.stringify(faceResult, null, 2));

        if (!faceResult.success) {
            return res.status(400).json({ success: false, message: faceResult.message || 'Face not recognized' });
        }

        const recognized = faceResult.students[0];

        // Roster check
        if (rosterSet && !rosterSet.has(recognized.studentId)) {
            return res.status(403).json({ success: false, message: `Student ${recognized.studentId} is not enrolled in this class/subject.`, notInRoster: true });
        }

        const student = await prisma.student.findUnique({ where: { studentId: recognized.studentId } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found in database' });

        // Enforce teacher academic access assigned by administration
        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess) {
            if (teacherAccess.isBlocked) {
                return res.status(403).json({ success: false, message: 'Access denied. You have not been assigned any student batches by the administration.' });
            }
            if (!canTeacherAccessStudent(teacherAccess.accessList, student)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Student ${student.studentId} (${student.name}) belongs to Year ${student.academicYear} ${student.branch}-${student.section}${student.subsection ? ' ' + student.subsection : ''}, which is not assigned to you by the administration.`
                });
            }
        }

        const session = await getOrCreateSession(req.teacherId, { 
            className: className || branch || '', 
            section: section || '', 
            subsection: subsection || '',
            subject, 
            classId, 
            subjectId, 
            academicSession, 
            sessionLabel, 
            academicYear,
            source: 'face' 
        });

        await ensureBatchStudentsInSession(session.id, {
            academicYear,
            branch: branch || className,
            section: section || '',
            subsection: subsection || '',
            classId,
            subjectId
        });

        // Check if already marked
        const existing = await prisma.attendanceRecord.findUnique({ where: { attendanceId_studentId: { attendanceId: session.id, studentId: student.id } } });
        if (existing) {
            if (existing.status === 'present') {
                return res.status(200).json({ 
                    success: true, 
                    message: `${student.name} already marked present`, 
                    alreadyMarked: true, 
                    student: { name: student.name, studentId: student.studentId, confidence: recognized.confidence } 
                });
            }
            await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { status: 'present', markedAt: new Date() }
            });
            return res.status(200).json({ 
                success: true, 
                message: `Attendance marked for ${student.name}`, 
                alreadyMarked: false, 
                student: { name: student.name, studentId: student.studentId, confidence: recognized.confidence } 
            });
        }

        await prisma.attendanceRecord.create({
            data: { attendanceId: session.id, studentId: student.id, studentName: student.name, studentRollNo: student.studentId, status: 'present', markedAt: new Date() }
        });

        res.status(201).json({ success: true, message: `Attendance marked for ${student.name}`, alreadyMarked: false, student: { name: student.name, studentId: student.studentId, confidence: recognized.confidence } });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error marking face attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/attendance/face-multiple
// Face recognition — multiple faces in one frame
// ─────────────────────────────────────────────────────────────────────────────
exports.takeMultipleFaceAttendance = async (req, res) => {
    try {
        const { image, subject, class: className, section, subsection, academicYear, branch, classId, subjectId, academicSession, sessionLabel } = req.body;
        if (!image) return res.status(400).json({ success: false, message: 'Image is required' });

        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess && teacherAccess.isBlocked) {
            return res.status(403).json({ success: false, message: 'Access denied. You have not been assigned any student batches by the administration.' });
        }

        const rosterSet  = await buildRosterSet(classId, subjectId);

        // Scoped batch filter
        const batchScope = {
            academicYear: academicYear ? parseInt(academicYear, 10) : undefined,
            branch: branch || undefined,
            section: section || undefined,
            subsection: subsection || undefined
        };

        const faceResult = await faceRecognitionService.recognizeMultipleFaces(image, batchScope);
        if (!faceResult.success) return res.status(400).json({ success: false, message: faceResult.message || 'Face recognition failed' });

        const session = await getOrCreateSession(req.teacherId, { 
            className: className || branch || '', 
            section: section || '', 
            subsection: subsection || '',
            subject, 
            classId, 
            subjectId, 
            academicSession, 
            sessionLabel, 
            academicYear,
            source: 'face' 
        });

        await ensureBatchStudentsInSession(session.id, {
            academicYear,
            branch: branch || className,
            section: section || '',
            subsection: subsection || '',
            classId,
            subjectId
        });

        const detectedStudents = faceResult.recognizedStudents || faceResult.students || [];
        const results = [];
        const markedStudents = [];
        const alreadyMarkedStudents = [];

        for (const recognized of detectedStudents) {
            if (rosterSet && !rosterSet.has(recognized.studentId)) {
                results.push({ studentId: recognized.studentId, status: 'not_in_roster', confidence: recognized.confidence });
                continue;
            }
            const student = await prisma.student.findUnique({ where: { studentId: recognized.studentId } });
            if (!student) { results.push({ studentId: recognized.studentId, status: 'not_found' }); continue; }

            if (teacherAccess && !canTeacherAccessStudent(teacherAccess.accessList, student)) {
                results.push({
                    studentId: student.studentId,
                    name: student.name,
                    status: 'access_denied',
                    message: 'Not in teacher assigned academic groups',
                    confidence: recognized.confidence
                });
                continue;
            }

            const existing = await prisma.attendanceRecord.findUnique({ where: { attendanceId_studentId: { attendanceId: session.id, studentId: student.id } } });
            if (existing) { 
                if (existing.status === 'present') {
                    alreadyMarkedStudents.push({ studentId: student.studentId, name: student.name, confidence: recognized.confidence });
                    results.push({ studentId: student.studentId, name: student.name, status: 'already_marked', confidence: recognized.confidence }); 
                    continue; 
                }

                // Student was seeded as absent -> mark present now!
                await prisma.attendanceRecord.update({
                    where: { id: existing.id },
                    data: { status: 'present', markedAt: new Date() }
                });
                markedStudents.push({ studentId: student.studentId, name: student.name, confidence: recognized.confidence });
                results.push({ studentId: student.studentId, name: student.name, status: 'marked', confidence: recognized.confidence });
                continue;
            }

            await prisma.attendanceRecord.create({
                data: { attendanceId: session.id, studentId: student.id, studentName: student.name, studentRollNo: student.studentId, status: 'present', markedAt: new Date() }
            });
            markedStudents.push({ studentId: student.studentId, name: student.name, confidence: recognized.confidence });
            results.push({ studentId: student.studentId, name: student.name, status: 'marked', confidence: recognized.confidence });
        }

        const totalFaces = faceResult.totalFaces !== undefined 
            ? faceResult.totalFaces 
            : (detectedStudents.length + (faceResult.unrecognizedCount || 0));
        const unrecognizedCount = faceResult.unrecognizedCount || 0;

        let message = `Scan complete: detected ${totalFaces} face(s)`;
        if (markedStudents.length > 0) {
            message = `Attendance marked for ${markedStudents.length} student(s)`;
        } else if (alreadyMarkedStudents.length > 0) {
            message = `All ${alreadyMarkedStudents.length} recognized student(s) already marked present`;
        } else if (unrecognizedCount > 0) {
            message = `Detected ${totalFaces} face(s), but faces could not be recognized`;
        }

        res.status(201).json({ 
            success: true, 
            message,
            totalFaces,
            markedStudents,
            alreadyMarkedStudents,
            unrecognizedCount,
            results 
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error marking face attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route POST /api/attendance/bulk-photos
// Bulk photo upload attendance
// ─────────────────────────────────────────────────────────────────────────────
exports.bulkPhotoAttendance = async (req, res) => {
    try {
        const { images, image, subject, class: className, section, subsection, academicYear, branch, classId, subjectId, academicSession } = req.body;
        const photoList = images && images.length ? images : (image ? [image] : []);
        if (!photoList.length) return res.status(400).json({ success: false, message: 'images array or image is required' });

        const teacherAccess = await getTeacherAccessFilter(req.user);
        if (teacherAccess && teacherAccess.isBlocked) {
            return res.status(403).json({ success: false, message: 'Access denied. You have not been assigned any student batches by the administration.' });
        }

        const rosterSet = await buildRosterSet(classId, subjectId);
        const session   = await getOrCreateSession(req.teacherId, { 
            className: className || branch || '', 
            section: section || '', 
            subsection: subsection || '',
            subject, 
            classId, 
            subjectId, 
            academicSession, 
            academicYear,
            source: 'face' 
        });

        await ensureBatchStudentsInSession(session.id, {
            academicYear,
            branch: branch || className,
            section: section || '',
            subsection: subsection || '',
            classId,
            subjectId
        });

        // Scoped batch filter
        const batchScope = {
            academicYear: academicYear ? parseInt(academicYear, 10) : undefined,
            branch: branch || undefined,
            section: section || undefined,
            subsection: subsection || undefined
        };

        const results     = [];
        const markedIds   = new Set();

        for (const img of photoList) {
            const faceResult = await faceRecognitionService.recognizeMultipleFaces(img, batchScope);
            if (!faceResult.success) { results.push({ error: faceResult.message }); continue; }

            const recognizedList = faceResult.recognizedStudents || faceResult.students || [];
            for (const recognized of recognizedList) {
                if (markedIds.has(recognized.studentId)) continue;
                if (rosterSet && !rosterSet.has(recognized.studentId)) continue;

                const student = await prisma.student.findUnique({ where: { studentId: recognized.studentId } });
                if (!student) continue;

                if (teacherAccess && !canTeacherAccessStudent(teacherAccess.accessList, student)) {
                    continue;
                }

                const existing = await prisma.attendanceRecord.findUnique({ where: { attendanceId_studentId: { attendanceId: session.id, studentId: student.id } } });
                if (!existing) {
                    await prisma.attendanceRecord.create({
                        data: { attendanceId: session.id, studentId: student.id, studentName: student.name, studentRollNo: student.studentId, status: 'present', markedAt: new Date() }
                    });
                } else if (existing.status !== 'present') {
                    await prisma.attendanceRecord.update({
                        where: { id: existing.id },
                        data: { status: 'present', markedAt: new Date() }
                    });
                }
                markedIds.add(recognized.studentId);
                results.push({ studentId: student.studentId, name: student.name, confidence: recognized.confidence });
            }
        }

        res.status(201).json({ success: true, markedCount: markedIds.size, results });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Error in bulk photo attendance', error: e.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route GET /api/attendance/face-status
// ─────────────────────────────────────────────────────────────────────────────
exports.checkFaceApiStatus = async (req, res) => {
    try {
        const status = await faceRecognitionService.checkStatus();
        res.json({ success: true, ...status });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Face API check failed', error: e.message });
    }
};