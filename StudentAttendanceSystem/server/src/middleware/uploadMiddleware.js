const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Creates a multer instance with a dynamic destination folder.
 * @param {Function} getSubfolder - (req, file) => subfolder path relative to uploads/
 */
const createUploader = (getSubfolder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const subfolder = getSubfolder(req, file);
      const fullPath = path.join(__dirname, '../../uploads', subfolder);
      // Create folder if it doesn't exist
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const fileFilter = (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  };

  return multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024,    // 10MB per file
      fieldSize: 50 * 1024 * 1024    // 50MB field size (for base64)
    },
    fileFilter
  });
};

// ── Teacher uploader ──────────────────────────────────────────────────────────
// Saves to: uploads/teachers/{sanitized-teacher-name}/
const teacherUploader = createUploader((req) => {
  // req.teacher is set by authMiddleware
  const name = (req.teacher?.name || req.teacherId || 'unknown')
    .toString()
    .replace(/[^a-z0-9_\- ]/gi, '')  // strip special chars
    .trim()
    .replace(/\s+/g, '_');           // spaces → underscores
  return `teachers/${name}`;
});

// ── Student uploader ─────────────────────────────────────────────────────────
// Saves to: uploads/students/{studentId}/
// studentId is in req.body for POST, or fetched later for other routes.
const studentUploader = createUploader((req) => {
  const studentId = (req.body?.studentId || req.params?.id || 'unknown')
    .toString()
    .replace(/[^a-z0-9_\-]/gi, '');
  return `students/${studentId}`;
});

module.exports = {
  teacherUploader,
  studentUploader,
  // legacy default export — keeps old studentRoutes.js working
  single: (field) => studentUploader.single(field)
};