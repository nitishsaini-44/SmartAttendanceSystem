# 📋 Smart Attendance System — Feature Documentation

A comprehensive, developer-friendly reference for every feature in the Smart Attendance System. This document covers all flows end-to-end, including inputs, outputs, edge cases, and key interactions.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Teacher Registration](#1-teacher-registration)
3. [Teacher Login & Authentication](#2-teacher-login--authentication)
4. [Change Password](#3-change-password)
5. [Teacher Profile Management](#4-teacher-profile-management)
6. [Student Management — Add Student](#5-student-management--add-student)
7. [Student Management — View, Edit & Delete](#6-student-management--view-edit--delete)
8. [Face Registration for Existing Students](#7-face-registration-for-existing-students)
9. [Manual Attendance](#8-manual-attendance)
10. [Live Face Recognition Attendance (Single)](#9-live-face-recognition-attendance-single)
11. [Live Face Recognition Attendance (Multiple)](#10-live-face-recognition-attendance-multiple)
12. [Batch Photo Attendance Upload](#11-batch-photo-attendance-upload)
13. [Attendance List & History](#12-attendance-list--history)
14. [Download Attendance as CSV](#13-download-attendance-as-csv)
15. [Dashboard & Analytics](#14-dashboard--analytics)
16. [Face Recognition API Health Check](#15-face-recognition-api-health-check)
17. [Environment Configuration Reference](#16-environment-configuration-reference)
18. [API Route Reference](#17-api-route-reference)

---

## System Architecture Overview

The project consists of **three services** that must all be running for full functionality:

| Service | Technology | Port | Purpose |
|---|---|---|---|
| **Client** | React + Vite + TailwindCSS | `5173` | Teacher-facing UI |
| **Node Server** | Express + MongoDB (Mongoose) | `5000` | REST API, auth, data layer |
| **Python Face API** | Flask + InsightFace + OpenCV | `5001` | Face embedding & recognition |

```
Browser (React)  ──►  Node/Express API  ──►  MongoDB Atlas
                            │
                            └──►  Python Flask API (InsightFace)
```

**Key Design Decision:** The Python API stores face embeddings directly into MongoDB (the same database the Node server uses). When recognition is needed, the Python API loads all embeddings at query time and performs vectorized cosine-similarity matching.

---

## 1. Teacher Registration

**Route:** `POST /api/auth/register` | **Page:** `/register`

### Flow

1. A new teacher navigates to `/register`.
2. They fill in: **Name**, **Email**, **Password**, and optionally **Subject**.
3. On submit, the client sends a `POST` request to `/api/auth/register`.
4. The server checks if the email is already registered. If it is, a `400` error is returned.
5. A new `Teacher` document is created in MongoDB. The password is **bcrypt-hashed** (12 rounds) automatically via a pre-save hook.
6. A **JWT token** (expires in `7d`) is generated and returned.
7. The client stores the token in `localStorage`, updates `AuthContext`, and redirects to `/dashboard`.

### Inputs

| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Display name shown in the UI |
| `email` | ✅ | Must be unique; stored lowercase |
| `password` | ✅ | Minimum 6 characters |
| `subject` | ❌ | Optional; shown as a badge on the dashboard |

### Output

```json
{
  "success": true,
  "token": "<JWT>",
  "teacher": { "id", "name", "email", "subject", "profilePhoto" }
}
```

### Edge Cases

- Duplicate email → `400 Email already registered`
- Password is never returned in any API response (field has `select: false`)
- If registration succeeds but the client loses the token, the user must log in again

---

## 2. Teacher Login & Authentication

**Route:** `POST /api/auth/login` | **Page:** `/login`

### Flow

1. Teacher navigates to `/login` and enters their **email** and **password**.
2. The server fetches the teacher by email with the password field included (`select('+password')`).
3. The plain-text password is compared against the bcrypt hash using `teacher.comparePassword()`.
4. On success, a new JWT is issued and returned.
5. The client saves the JWT to `localStorage` and establishes the authenticated session via `AuthContext`.
6. All subsequent API requests include the JWT in the `Authorization: Bearer <token>` header.
7. Private routes (`/dashboard`, `/students`, `/attendance`, etc.) are protected by `PrivateRoute`, which reads `isAuthenticated` from `AuthContext`.

### JWT Middleware (Server-side)

All protected routes pass through `authMiddleware`, which:
- Extracts the Bearer token from the `Authorization` header
- Verifies the token using `JWT_SECRET`
- Attaches `req.teacherId` and `req.teacher` to the request for use in controllers

### Edge Cases

- Wrong password → `401 Invalid credentials`
- Non-existent email → `401 Invalid credentials` (same message to prevent user enumeration)
- Expired token → Requests fail with `401`; the user is redirected to `/login`

---

## 3. Change Password

**Route:** `PUT /api/teacher/change-password` | **Page:** `/change-password`

### Flow

1. Authenticated teacher navigates to `/change-password`.
2. They enter their **current password** and a **new password**.
3. The server fetches the teacher with the password field included.
4. It verifies the current password using `comparePassword()`.
5. The new password is assigned to `teacher.password`. The pre-save hook automatically bcrypt-hashes it before saving.
6. On success, a toast notification confirms the change. The user remains logged in with their existing token.

### Inputs

| Field | Required | Validation |
|---|---|---|
| `currentPassword` | ✅ | Must match stored hash |
| `newPassword` | ✅ | Minimum 6 characters |

### Edge Cases

- Incorrect current password → `401 Current password is incorrect`
- New password shorter than 6 characters → `400` validation error
- The JWT token is **not** invalidated after a password change; existing sessions remain active

---

## 4. Teacher Profile Management

**Routes:** `GET/PUT /api/teacher/profile`, `POST /api/teacher/profile/photo` | **Pages:** `/profile`, `/profile/edit`

### View Profile Flow

1. Teacher navigates to `/profile`.
2. Client fetches profile data from `GET /api/teacher/profile`.
3. Displays: name, email, subject, bio/description, profile photo, and account creation date.

### Edit Profile Flow

1. Teacher clicks **Edit Profile**, navigating to `/profile/edit`.
2. They can update: **Name**, **Subject**, and **Description/Bio**.
3. On submit, a `PUT /api/teacher/profile` request is sent with only the changed fields.
4. The `AuthContext` is updated in place so the navbar/sidebar reflect the new name immediately.

### Upload Profile Photo Flow

1. On the edit profile page, the teacher uploads an image file.
2. The file is sent as `multipart/form-data` to `POST /api/teacher/profile/photo`.
3. Multer saves the file to `uploads/profiles/` on disk.
4. If the teacher already has a profile photo, **the old file is deleted from disk** before saving the new one.
5. The stored path (e.g. `/uploads/profiles/photo.jpg`) is served statically by Express.

### Edge Cases

- Email is **not** editable through the profile endpoint
- Profile photo is stored on the server's filesystem; if the server is restarted and the `uploads/` directory is missing, photos will 404

---

## 5. Student Management — Add Student

**Route:** `POST /api/students` | **Page:** `/students/add`

### Flow

```
Teacher fills form → Server creates student in MongoDB → (Optional) Face API registers embedding
```

1. Teacher navigates to `/students/add` and fills in the form.
2. Fields: **Student ID** (roll number), **Name**, **Email** (optional), **Class**, **Section**.
3. Optionally, the teacher captures a **face image** via webcam or uploads a photo file.
4. On submit:
   - Server first checks if the Student ID already exists → `400` if duplicate.
   - The student document is **created in MongoDB first** (with an empty `faceEmbedding: []`).
   - If a face image was provided, the server calls the **Python Face API** (`POST /api/add-student`) with `studentId`, `name`, and the base64 image.
   - The Python API detects exactly one face in the image, generates a 512-dimensional embedding using InsightFace, and updates the student's `faceEmbedding` field in MongoDB.
   - If the face image was from a webcam capture, it is also saved to disk as the student's profile photo.

### Inputs

| Field | Required | Notes |
|---|---|---|
| `studentId` | ✅ | Unique roll number / ID string |
| `name` | ✅ | Full name |
| `email` | ❌ | Optional; must be unique if provided |
| `class` | ❌ | e.g., "10", "CSE-B" |
| `section` | ❌ | e.g., "A", "B" |
| `faceImage` | ❌ | Base64 JPEG; must contain exactly one face |

### Edge Cases

- If the Face API is **offline**, the student is still created in MongoDB without a face embedding. A `faceWarning` is included in the response.
- If the image has **zero faces** or **multiple faces**, face registration fails but the student record is still saved.
- Duplicate `studentId` → `400 Student ID already exists`

---

## 6. Student Management — View, Edit & Delete

**Routes:** `GET /api/students`, `GET /api/students/:id`, `PUT /api/students/:id`, `DELETE /api/students/:id` | **Page:** `/students`

### View All Students

1. The `/students` page fetches all students from `GET /api/students` (sorted newest first).
2. Each student is displayed as a card (`StudentCard`) showing their profile photo, name, Student ID, class/section, and whether a face is registered.
3. A search bar filters the list client-side by name or Student ID.
4. A **Download CSV** button exports the full student list.

### Edit Student

1. Teacher clicks **Edit** on a student card.
2. An in-place edit form allows changing: name, email, class, section.
3. Sends `PUT /api/students/:id` with the updated fields.

### Delete Student

1. Teacher clicks **Delete** on a student card.
2. The server:
   - Calls `faceRecognitionService.removeStudent(studentId)` to clear the face embedding in MongoDB via the Python API.
   - Deletes the student document from MongoDB.
3. The student list refreshes automatically.

### Edge Cases

- Deleting a student does **not** delete their historical attendance records
- If the Face API is offline during deletion, the MongoDB deletion still proceeds; the face embedding removal is a best-effort operation

---

## 7. Face Registration for Existing Students

**Route:** `POST /api/students/:id/register-face` | **UI:** Student card "Register Face" button

### Flow

1. Teacher clicks **Register Face** on a student who has no face registered (shown as "No Face" badge).
2. A webcam capture modal opens.
3. Teacher positions the student's face and clicks **Capture**.
4. The captured base64 image is sent to `POST /api/students/:id/register-face`.
5. The server calls the Python Face API, which detects and embeds the face.
6. The returned 512-dimensional embedding is saved to `student.faceEmbedding` in MongoDB.
7. If the student has no profile photo, the captured frame is also saved to disk as their profile photo.

### Edge Cases

- Image must contain **exactly one face**; zero or multiple faces → `400`
- Re-registering a face **overwrites** the previous embedding
- The Python API must be running; otherwise → `400 Face Recognition API unavailable`

---

## 8. Manual Attendance

**Route:** `POST /api/attendance` | **Tab:** Attendance page → "Manual" tab

### Flow

1. Teacher navigates to `/attendance` and selects the **Manual** tab.
2. All registered students are fetched and displayed as a scrollable list.
3. **Today's existing attendance** is also fetched and pre-populated so the form reflects any previously saved state.
4. Each student row shows their name and ID, toggling between ✅ **Present** (green) and ❌ **Absent** (red) on click.
5. **Bulk actions** available: "Mark All Present" / "Mark All Absent".
6. Teacher clicks **Save Attendance**.
7. The server receives an array of `{ studentId, status }` records.
8. If an attendance document already exists for today (same `teacherId`, `date`, `class`, `section`), existing records are **updated in place**; new students are appended.
9. If no document exists for today, a new one is **created**.

### Data Model

Each attendance session is one document:
- `teacherId`, `date`, `subject`, `class`, `section`
- `records[]` — array of `{ studentId, studentName, studentRollNo, status, markedAt }`
- Status values: `"present"`, `"absent"`, `"late"`

### Edge Cases

- If no students exist, the UI shows an empty state with a link to add students
- Attendance is scoped per teacher; one teacher's records are not visible to another
- A compound index on `{ teacherId, date, class, section }` prevents duplicate documents

---

## 9. Live Face Recognition Attendance (Single)

**Route:** `POST /api/attendance/face` | **Tab:** Attendance page → "Face Recognition" tab → "Single Face" mode

### Flow

```
Webcam → Canvas capture → Base64 → Node API → Python API → InsightFace → Cosine similarity → Mark present
```

1. Teacher selects **Single Face** mode and clicks **Start Camera**.
2. The browser requests webcam access (`getUserMedia`). Video is rendered in a `<video>` element.
3. Teacher clicks **Mark Attendance**.
4. The current video frame is drawn onto a hidden `<canvas>` and exported as a base64 JPEG (quality 0.8).
5. The Node server forwards the image to the Python API (`POST /api/recognize`).
6. The Python API:
   - Decodes the base64 image using OpenCV.
   - Runs InsightFace to detect and embed the face.
   - Loads all students with registered embeddings from MongoDB.
   - Performs **vectorized cosine similarity** between the detected embedding and all stored embeddings using NumPy matrix multiplication.
   - Returns the best match if its similarity score exceeds **threshold = 0.5**.
7. The Node server finds the matching student in MongoDB and creates/updates today's attendance record, marking the student as `"present"`.
8. If the student was **already marked present**, `alreadyMarked: true` is returned; no duplicate record is created.
9. The UI displays the recognized student's name, ID, and confidence percentage.

### Edge Cases

- No face detected in frame → `400 No face detected`
- Face detected but no match above threshold → `400 Face not recognized`
- Student recognized but not found in MongoDB → `404` (data inconsistency)
- Camera permission denied → toast error; camera never starts

---

## 10. Live Face Recognition Attendance (Multiple)

**Route:** `POST /api/attendance/face-multiple` | **Tab:** Face Recognition → "Multiple Faces" mode

### Flow

Same as single-face mode, except:

1. Teacher switches to **Multiple Faces** mode.
2. On capture, the image is sent to the Python API (`POST /api/recognize-multiple`).
3. The Python API detects **all faces** in the image simultaneously.
4. A **matrix multiplication** approach is used: all face embeddings are stacked into a `(num_faces × 512)` matrix and multiplied against all registered embeddings `(num_students × 512)`, producing a full similarity matrix in one BLAS operation.
5. Each face is matched to its best candidate above the threshold. **Duplicates** (same student appearing twice) are deduplicated, keeping the highest-confidence match.
6. The Node server marks all recognized students as present in a single batch operation.

### Response includes

- `totalFaces` — number of faces detected in the image
- `markedStudents[]` — newly marked present
- `alreadyMarkedStudents[]` — previously marked (skipped)
- `unrecognizedCount` — faces detected but below threshold

### Edge Cases

- If all detected faces are unrecognized → `400 No students recognized`
- A student appearing in multiple group photos is only marked once (idempotent)

---

## 11. Batch Photo Attendance Upload

**Route:** `POST /api/attendance/bulk-photos` | **Tab:** Attendance page → "Batch Upload" tab

### Flow

1. Teacher selects the **Batch Upload** tab on the Attendance page.
2. A drag-and-drop / click-to-upload zone accepts **multiple image files** (JPG, PNG, WEBP; max 10 MB each).
3. Image previews are shown in a grid. Individual photos can be removed before processing.
4. Teacher clicks **Process All Photos**.
5. Photos are processed **sequentially**, one at a time:
   - Each file is read as base64 using `FileReader`.
   - Sent to `POST /api/attendance/bulk-photos` which calls the Python `recognize-multiple` endpoint.
   - Recognized students from each photo are added to a running `Set` (keyed by `studentId`) to prevent duplicates across photos.
6. A progress indicator shows which photo is currently being processed (e.g., "Processing Photo 2 of 5").
7. After all photos are processed, a **results panel** lists every uniquely marked student with their confidence score.
8. The page auto-scrolls to the results section.

### Key Difference from Live Multi-Face

- No real-time camera — works with pre-taken classroom photos
- Multiple photos of the same class session are combined into one cumulative attendance result
- Does **not** filter by class/section; works globally for the teacher's attendance session

### Edge Cases

- Files larger than 10 MB are rejected client-side with a toast error
- Non-image files are filtered out before upload
- If a student appears in 3 different photos, they are only marked present once
- If the Face API is offline, all photos will fail with processing errors per-photo

---

## 12. Attendance List & History

**Route:** `GET /api/attendance`, `GET /api/attendance/today`, `GET /api/attendance/date/:date` | **Page:** `/attendance` → "Records" tab

### Flow

1. The Attendance page fetches **today's attendance** on load.
2. A date picker allows querying attendance for **any specific date**.
3. All records are displayed in a table showing: Student Name, Roll No, Status (Present/Absent/Late), and time marked.
4. A **Reset Today's Attendance** button (`DELETE /api/attendance/today`) deletes all of the teacher's attendance records for the current day.

### Edge Cases

- If no attendance has been taken on a selected date, an empty state is shown
- Records are scoped to the authenticated teacher; cross-teacher data is never returned
- Reset is **permanent** — deleted records cannot be recovered

---

## 13. Download Attendance as CSV

**Routes:**
- `GET /api/attendance/download/today` — Today's attendance
- `GET /api/attendance/download/:date` — Specific date
- `GET /api/attendance/download/range?fromDate=&toDate=` — Date range

### Single-Day CSV Format

```
S.No, Student ID, Name, Status, Marked At, Date
1, CS001, "John Doe", present, 2024-01-15T09:30:00Z, 2024-01-15
```

All registered students are included. Students without a record for that day are listed as `absent`.

### Date-Range CSV Format

```
S.No, Student ID, Name, Class, Section, 01-01-2024, 02-01-2024, 03-01-2024, ...
1, CS001, "John Doe", 10, A, P, A, P, ...
```

- Each column is a date in `DD-MM-YYYY` format
- Values are `P` (present) or `A` (absent)
- All students are included as rows, even if they had no attendance on any day in the range

### Flow

1. Teacher selects a date or date range on the Download Attendance page.
2. Client sends a GET request with the appropriate parameters and the JWT token in the Authorization header.
3. Server validates the date(s) and teacher authentication.
4. Server fetches all students and the relevant attendance records.
5. The CSV is generated in-memory and sent as a `text/csv` download response with `Content-Disposition: attachment`.
6. The browser triggers a file download.

### Edge Cases

- `fromDate` and `toDate` are both required for range CSV; missing either → `400`
- Invalid date format → `400 Invalid date format. Use YYYY-MM-DD format.`
- If no students are in the system → `404 No students found in the system`
- If attendance was never taken on a date, all students appear as `A` in the range CSV

---

## 14. Dashboard & Analytics

**Page:** `/dashboard`

### Flow

On load, three API calls are made in **parallel** (`Promise.all`):
1. `GET /api/students` — total student count
2. `GET /api/attendance/today` — today's present/absent breakdown
3. `GET /api/attendance` — all historical records (for the trend chart)

### Stats Cards

| Card | Data Source |
|---|---|
| Total Students | Count of all student documents |
| Today's Attendance | Count of records in today's session |
| Present Today | Count of `status === "present"` in today's records |
| Absent Today | Count of `status !== "present"` in today's records |

### Attendance Trend Chart

- Displays the last 7 attendance sessions as an **area chart** (using Recharts).
- X-axis: day of week (e.g., "Mon", "Tue").
- Y-axis: number of students present.
- Empty state is shown if no attendance history exists.

### Recent Attendance Panel

- Shows the **last 5 records** from today's session.
- Displays student name, ID, and present/absent badge.

---

## 15. Face Recognition API Health Check

**Routes:** `GET /api/health` (lightweight), `GET /api/health/full` (includes MongoDB ping)

### Flow

1. When the Attendance page loads, the `FaceAttendance` component immediately calls `GET /api/attendance/face-status` on the Node server.
2. The Node server proxies this to `GET /api/health` on the Python Flask server (port 5001).
3. **If the Python API is running:** the Face Recognition tabs display normally.
4. **If the Python API is offline:** a warning panel is shown with the exact command needed to start the server:
   ```
   cd student-attendance-system/server/python && python api_server.py
   ```
   A **Retry Connection** button re-runs the health check without a page refresh.

### Dependency

The Python API itself connects to MongoDB on startup. If MongoDB is unreachable, the full health check (`/api/health/full`) returns a `500`, but the lightweight `/api/health` still returns `200` as long as Flask and the InsightFace model are loaded.

---

## 16. Environment Configuration Reference

### Server (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/attendance_system
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
FACE_API_URL=http://localhost:5001/api
UPLOADS_DIR=uploads/profiles
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

### Python API

The Python server reads `MONGODB_URI` (or `MONGO_URI` as a fallback) from `server/.env` automatically via `python-dotenv`. No separate `.env` is needed for the Python service.

---

## 17. API Route Reference

### Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new teacher |
| `POST` | `/auth/login` | Public | Login and get JWT |
| `GET` | `/auth/me` | Private | Get current teacher info |

### Teacher Routes (`/api/teacher`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/teacher/profile` | Private | Get teacher profile |
| `PUT` | `/teacher/profile` | Private | Update name/subject/description |
| `POST` | `/teacher/profile/photo` | Private | Upload profile photo |
| `PUT` | `/teacher/change-password` | Private | Change password |

### Student Routes (`/api/students`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/students` | Private | Get all students |
| `GET` | `/students/:id` | Private | Get single student |
| `POST` | `/students` | Private | Add new student (with optional face) |
| `PUT` | `/students/:id` | Private | Update student details |
| `DELETE` | `/students/:id` | Private | Delete student + face embedding |
| `POST` | `/students/:id/register-face` | Private | Register/update face for student |
| `PUT` | `/students/:id/profile-photo` | Private | Update student profile photo |
| `GET` | `/students/download/csv` | Private | Download student list as CSV |

### Attendance Routes (`/api/attendance`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/attendance` | Private | Mark/update manual attendance |
| `GET` | `/attendance` | Private | Get all attendance records |
| `GET` | `/attendance/today` | Private | Get today's attendance |
| `GET` | `/attendance/date/:date` | Private | Get attendance for a specific date |
| `GET` | `/attendance/face-status` | Private | Check Python Face API status |
| `POST` | `/attendance/face` | Private | Mark attendance via single face recognition |
| `POST` | `/attendance/face-multiple` | Private | Mark attendance via multiple faces |
| `POST` | `/attendance/bulk-photos` | Private | Process batch photo for attendance |
| `GET` | `/attendance/download/today` | Private | Download today's attendance CSV |
| `GET` | `/attendance/download/range` | Private | Download date-range attendance CSV |
| `GET` | `/attendance/download/:date` | Private | Download specific date CSV |
| `DELETE` | `/attendance/today` | Private | Reset today's attendance |

### Python Face API Routes (`http://localhost:5001/api`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Lightweight health check |
| `GET` | `/health/full` | Full health check (includes MongoDB ping) |
| `POST` | `/add-student` | Extract & store face embedding for a student |
| `POST` | `/remove-student` | Clear face embedding for a student |
| `POST` | `/recognize` | Recognize a single face |
| `POST` | `/recognize-multiple` | Recognize multiple faces in one image |
| `POST` | `/get-embedding` | Extract embedding without saving |
| `GET` | `/registered-count` | Count students with registered faces |

---

## Key Technical Notes

### Face Recognition Algorithm

- **Model:** InsightFace (buffalo_l or equivalent ONNX model)
- **Embedding size:** 512 dimensions per face
- **Similarity metric:** Cosine similarity via NumPy dot product
- **Match threshold:** `0.5` (configurable in `api_server.py`)
- **Batch optimization:** All student embeddings are pre-normalized and stacked into a matrix. Recognition runs as a single matrix multiplication — `O(n)` effectively via BLAS, not `O(n)` nested loops.

### Authentication

- JWT tokens are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default: 7 days)
- Tokens are stored in `localStorage` on the client
- The `password` field on the `Teacher` model has `select: false` — it is never returned in normal queries

### File Storage

- All uploaded files (student photos, teacher profile photos) are stored on the **server's local filesystem** under `uploads/`
- Files are served as static assets by Express
- There is no cloud storage integration; if the server is moved, the `uploads/` directory must be migrated alongside

### Data Isolation

- Attendance records are always filtered by `req.teacherId`
- Student records are **shared** across all teachers (no `teacherId` filter on students)
- This means any teacher can view and mark attendance for any student in the system
