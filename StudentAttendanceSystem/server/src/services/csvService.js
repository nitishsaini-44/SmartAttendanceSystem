const { createObjectCsvStringifier } = require('csv-writer');

const generateAttendanceCSV = (attendanceRecords, date) => {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'sno', title: 'S.No' },
            { id: 'studentId', title: 'Student ID' },
            { id: 'studentName', title: 'Name' },
            { id: 'status', title: 'Status' },
            { id: 'time', title: 'Time' }
        ]
    });

    const records = attendanceRecords.map((record, index) => ({
        sno: index + 1,
        studentId: record.studentRollNo,
        studentName: record.studentName,
        status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
        time: new Date(record.markedAt).toLocaleTimeString()
    }));

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    
    return header + body;
};

// Generate CSV with ALL students (marked present or absent)
const generateFullAttendanceCSV = (allStudents, attendanceRecords, date) => {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'sno', title: 'S.No' },
            { id: 'studentId', title: 'Roll Number' },
            { id: 'studentName', title: 'Name' },
            { id: 'academicYear', title: 'Academic Year' },
            { id: 'branch', title: 'Branch' },
            { id: 'section', title: 'Section' },
            { id: 'subsection', title: 'Subsection' },
            { id: 'status', title: 'Status' },
            { id: 'time', title: 'Time Marked' }
        ]
    });

    // Create a map of attendance records by studentId for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
        attendanceMap[record.studentRollNo] = record;
    });

    const formatYear = (yr) => {
        if (!yr) return 'N/A';
        const y = Number(yr);
        if (y === 1) return '1st Year';
        if (y === 2) return '2nd Year';
        if (y === 3) return '3rd Year';
        if (y === 4) return '4th Year';
        return `${y} Year`;
    };

    // Generate records for ALL students
    const records = allStudents.map((student, index) => {
        const attendanceRecord = attendanceMap[student.studentId];
        const isPresent = attendanceRecord && attendanceRecord.status === 'present';
        
        return {
            sno: index + 1,
            studentId: student.studentId,
            studentName: student.name,
            academicYear: formatYear(student.academicYear),
            branch: student.branch || 'CSE',
            section: student.section || 'N/A',
            subsection: student.subsection || 'N/A',
            status: isPresent ? 'Present' : 'Absent',
            time: attendanceRecord ? new Date(attendanceRecord.markedAt).toLocaleTimeString() : '-'
        };
    });

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    
    return header + body;
};

const generateStudentListCSV = (students) => {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'sno', title: 'S.No' },
            { id: 'studentId', title: 'Roll Number' },
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'academicYear', title: 'Academic Year' },
            { id: 'branch', title: 'Branch' },
            { id: 'section', title: 'Section' },
            { id: 'subsection', title: 'Subsection' },
            { id: 'class', title: 'Class' }
        ]
    });

    const formatYear = (yr) => {
        if (!yr) return 'N/A';
        const y = Number(yr);
        if (y === 1) return '1st Year';
        if (y === 2) return '2nd Year';
        if (y === 3) return '3rd Year';
        if (y === 4) return '4th Year';
        return `${y} Year`;
    };

    const records = students.map((student, index) => ({
        sno: index + 1,
        studentId: student.studentId,
        name: student.name,
        email: student.email || 'N/A',
        academicYear: formatYear(student.academicYear),
        branch: student.branch || 'CSE',
        section: student.section || 'N/A',
        subsection: student.subsection || 'N/A',
        class: student.class || 'N/A'
    }));

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    
    return header + body;
};

module.exports = {
    generateAttendanceCSV,
    generateFullAttendanceCSV,
    generateStudentListCSV
};