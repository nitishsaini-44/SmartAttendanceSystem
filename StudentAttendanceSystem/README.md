# Smart Attendance System (SAS)

An enterprise-grade, AI-powered biometric attendance management platform featuring **InsightFace deep learning face recognition**, robust **3-tier Role-Based Access Control (RBAC)**, and a modern **Dark-Zinc Glassmorphic UI**.

Powered by **React 18 + Vite**, **Node.js + Express + Prisma ORM**, **PostgreSQL**, and a dedicated **Python Flask Biometric Engine**.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features by Role](#-key-features-by-role)
  - [1. Administrator Portal](#1-administrator-portal)
  - [2. Teacher Portal](#2-teacher-portal)
  - [3. Student Portal](#3-student-portal)
- [Face Biometric Engine & Batch-Scoped AI](#-face-biometric-engine--batch-scoped-ai)
- [Tech Stack](#-tech-stack)
- [Administrator Account Provisioning](#-administrator-account-provisioning)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
- [Environment Configuration](#-environment-configuration)
- [Database Schema & Prisma](#-database-schema--prisma)
- [API Reference](#-api-reference)
- [Available Scripts](#-available-scripts)
- [Production Deployment](#-production-deployment)
- [License](#-license)

---

## 🏛️ Overview & Architecture

Smart Attendance System replaces slow, error-prone roll calls and proxy attendance with instantaneous multi-face biometric scanning and automated academic records.

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                     React 18 + Vite Client (Port 5173)                 │
│               Dark-Zinc Glassmorphic UI · Tailwind CSS · Recharts       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTP / REST │ JWT Bearer
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Node.js / Express Gateway (Port 5000)                │
│             RBAC Middleware · Multer Uploads · CSV Streaming           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
       Prisma ORM   │                   HTTP / REST  │ Base64 Frame
     Connection Pool│                                │ Batch Scopes
                    ▼                                ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│      PostgreSQL Database          │ │  Python Flask Biometrics (Port 5001)│
│  (Aiven Cloud / Self-Hosted)      │ │  InsightFace Buffalo_L · ONNX    │
│  11 Relational Tables & Enums     │ │  Vectorized Cosine Similarity    │
└───────────────────────────────────┘ └──────────────────────────────────┘
```

### The Core Workflow

1. **Administration Enrolls**: Admin provisions teachers, students, academic structures (Year, Branch, Section, Subsection), and assigns batches to teachers.
2. **Biometric Registration**: High-quality portrait images are processed by the Python service; a 512-dimensional vector is normalized and stored directly in PostgreSQL (`students.faceEmbedding`).
3. **Classroom Scanning**: The teacher launches the webcam scanner. The frame is evaluated against **only the batch-scoped students enrolled in that specific class**, providing `<100ms` recognition latency while eliminating cross-department false matches.
4. **Instant Sync & Eligibility**: Records immediately reflect across the teacher's dashboard, institutional audit logs, and the individual student's portal with dynamic 75% examination eligibility calculators.

---

## 👥 Key Features by Role

### 1. Administrator Portal
*Centralized control over institution data, staff access, and compliance.*

- **Institutional Analytics**: Real-time KPI cards displaying active teacher count, total student body, today's system-wide attendance percentage, and active departments.
- **Teacher Lifecycle Management**: Create, edit, archive, and permanently remove teacher accounts. Includes quick password reset and profile management.
- **Academic Batch Allocation**: Assign fine-grained access permissions to teachers based on **Academic Year (1–4)**, **Branch (CSE, IT, ECE, ME, CE)**, **Section (A, B, C)**, and **Subsection (A1, B1, C3, ALL)**.
- **Student Master Roster**: Complete student CRUD with photo capture, student ID/roll generation, and face biometric enrollment.
- **Institution-wide Attendance Review & Correction Audit**:
  - Filter and inspect historical attendance for any date across any branch/section.
  - Correct disputed records with mandatory audit justification logging (`correctionReason`, `correctedById`, `correctionAt`).
- **Immutable System Audit Logs**: Chronological event tracking recording actor details, target models, action types, IP addresses, and JSON state changes.

### 2. Teacher Portal
*Optimized for rapid classroom attendance and roster management.*

- **Batch-Scoped Dashboard**: Instantly views students belonging strictly to their assigned academic cohorts.
- **Dual Attendance Scanner**:
  - **Live Webcam Recognition**: Auto-detects student faces from video stream with configurable confidence thresholds.
  - **Group / Bulk Classroom Photo Scan**: Upload a wide shot of the classroom to detect and mark multiple students simultaneously via parallel matrix multiplication.
  - **Manual Fallback**: Checkbox roster marking with one-click "Mark All Present" toggle.
- **Today's Session Review**: Live summary of who is present, absent, or late, with instant reset capability.
- **Reporting & CSV Exports**: Generate and download attendance records by specific single date or custom date range.
- **Teacher Profile**: Upload profile photos (stored under named directories `uploads/teachers/{name}/`) and update bio/credentials.

### 3. Student Portal
*Transparent, actionable academic insights designed for student autonomy.*

- **Actionable Student Dashboard**:
  - Personal aggregate attendance percentage badge with color-coded statutory status.
  - Total classes attended vs. total classes conducted.
- **75% Statutory Examination Eligibility Calculator**:
  - Automatically calculates if the student meets the mandatory 75% university threshold.
  - Dynamic status alerts:
    - **Safe**: Displays the margin of classes the student can safely miss without dipping below 75%.
    - **Critical / Below 75%**: Computes the exact number of consecutive upcoming classes the student must attend to regain eligibility.
- **Subject-Wise Attendance Breakdown**: View granular statistics, class counts, and individual percentages per enrolled subject.
- **Absence Log & Records**: Complete chronological record of every session missed, enabling early grievance resolution.
- **Personal Report CSV Export**: Download personal verified attendance records for official submissions.

---

## 🔬 Face Biometric Engine & Batch-Scoped AI

### Model Architecture: InsightFace `buffalo_l`
The biometric engine leverages deep convolutional face analysis using ONNX runtime and fallback to remote HuggingFace Space inference (`nitishsaini44/baffaloL_model`).

| Model Component | Neural Network | Input Resolution | Purpose |
|-----------------|----------------|------------------|---------|
| `det_10g.onnx` | RetinaFace / SCRFD | 640 × 640 dynamic | Multi-scale face detection & landmark localization |
| `w600k_r50.onnx` | Deep ResNet-50 | 112 × 112 | 512-dimensional facial feature embedding extraction |

### Vectorized Matching & Batch-Scoping Optimization
Rather than comparing detected faces against the entire university database (which scales linearly $O(N)$ and risks cross-department collisions), our system enforces **Batch-Scoped Matrix Multiplication**:

1. Client passes the current class context (`academicYear`, `branch`, `section`, `subsection`).
2. Python service queries PostgreSQL for only students enrolled in that specific cohort:
   $$\mathbf{M}_{\text{roster}} \in \mathbb{R}^{K \times 512} \quad (K \ll N)$$
3. Detected faces $\mathbf{F} \in \mathbb{R}^{M \times 512}$ are normalized ($\ell_2$-norm) and multiplied against the normalized student embeddings in a single BLAS GEMM operation:
   $$\mathbf{S} = \mathbf{F}_{\text{norm}} \cdot \mathbf{M}_{\text{norm}}^T$$
4. Matches with cosine similarity $S_{i,j} \ge 0.50$ are mapped to the student roll number in **< 100 milliseconds**.

---

## 💻 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend UI** | React 18, Vite 5, Tailwind CSS, Lucide React, Recharts, React Router v6 |
| **Backend API** | Node.js (v18+), Express.js, Prisma ORM (v5), JSON Web Tokens (JWT), Multer, Bcrypt.js |
| **Biometric AI** | Python 3.8+, Flask, NumPy, Psycopg 3, InsightFace, Gradio Client |
| **Primary Database** | PostgreSQL 15+ (Hosted on Aiven Cloud / Local PostgreSQL) |
| **Orchestration** | `concurrently` (unified developer experience running all 3 layers simultaneously) |

---

## 🔐 Administrator Account Provisioning

For privacy and security, administrative credentials are **never hardcoded** in source files or version control.

The initial Administrator account is created using the secure seeding script, which reads credentials strictly from environment variables:

```bash
# Option A: Inline execution (Linux / macOS / PowerShell)
cd StudentAttendanceSystem/server
ADMIN_EMAIL="admin@institution.edu" ADMIN_PASSWORD="your_secure_password" node scripts/seed-admin.js

# Option B: Windows PowerShell session variables
cd StudentAttendanceSystem/server
$env:ADMIN_EMAIL="admin@institution.edu"
$env:ADMIN_PASSWORD="your_secure_password"
node scripts/seed-admin.js
```

> [!NOTE]
> Public self-registration is permanently disabled. Once the Administrator account is provisioned, all teacher and student accounts are created securely through the Admin Portal.

---

## 📋 Prerequisites

Ensure your system meets the following requirements before setup:

1. **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
2. **Python**: `3.8`, `3.9`, `3.10`, or `3.11` ([Download Python](https://www.python.org/))
3. **PostgreSQL**: Cloud instance (e.g. Aiven, Supabase, Neon) or local PostgreSQL instance
4. **Webcam**: Required for live face capture and attendance taking

---

## 🚀 Quick Start Guide

### 1. Clone & Set Up Virtual Environment

```bash
git clone <repository-url>
cd SAS
```

Create and activate a Python virtual environment in the project root:

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Automated Dependency Installation

Run the unified setup script from the root folder:

```bash
npm run setup
```
*This command runs `npm install` in the root, server, and client folders, and executes `pip install -r StudentAttendanceSystem/server/python/requirements.txt` into your virtual environment.*

### 3. Initialize the Database

Push the Prisma schema to your PostgreSQL database and provision the administrator account:

```bash
cd StudentAttendanceSystem/server
npx prisma db push
ADMIN_EMAIL="admin@institution.edu" ADMIN_PASSWORD="your_secure_password" node scripts/seed-admin.js
cd ../..
```

### 4. Start the Full Application

Launch all three microservices with a single command from the root directory:

```bash
npm run dev
```

| Service | Port | Local URL |
|---------|------|-----------|
| **React Client** | `5173` | http://localhost:5173 |
| **Node.js API Server** | `5000` | http://localhost:5000 |
| **Python Biometric AI** | `5001` | http://localhost:5001 |

---

## ⚙️ Environment Configuration

### Server Configuration (`StudentAttendanceSystem/server/.env`)

```env
PORT=5000
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<dbname>?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
FACE_API_URL=http://localhost:5001/api
FRONTEND_URL=http://localhost:5173
HF_TOKEN=hf_yourOptionalHuggingFaceToken
```

### Client Configuration (`StudentAttendanceSystem/client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000
```

---

## 🗄️ Database Schema & Prisma

The PostgreSQL schema is managed via [Prisma](https://www.prisma.io/).

### Key Relational Models

- **`User`**: Base identity for all actors with `email`, hashed `password`, and `role` (`admin` | `teacher` | `student`).
- **`Teacher`**: Teacher profile details, subject specialty, and assignments.
- **`Student`**: Academic cohort (`academicYear`, `branch`, `section`, `subsection`), roll number (`studentId`), profile photo, and 512-dim `faceEmbedding` JSON vector.
- **`TeacherAcademicAccess`**: Many-to-many permission mapping granting teachers access to specific batches.
- **`Class` & `Subject`**: Institutional curriculum and credits structure.
- **`Attendance`**: Session records linked to date, teacher, class, and source (`manual` | `face`). Includes correction audit fields (`correctionReason`, `correctedById`, `correctionAt`).
- **`AttendanceRecord`**: Individual student status (`present` | `absent` | `late`) per attendance session.
- **`AuditLog`**: Tamper-evident logging of administrative actions.

### Common Prisma Commands

```bash
# Push schema changes to database without migration history
npx prisma db push

# Open visual database browser
npx prisma studio

# Re-generate Prisma Client
npx prisma generate
```

---

## 🔌 API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT bearer token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and permissions |
| `PUT` | `/api/auth/change-password` | Authenticated | Update account password |

### 🛡️ Administration (`/api/admin`) — *Requires `admin` role*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | High-level analytics and system KPIs |
| `GET` | `/api/admin/teachers` | List all registered teachers with assigned batches |
| `POST` | `/api/admin/teachers` | Provision a new teacher user account |
| `PUT` | `/api/admin/teachers/:id` | Update teacher details |
| `DELETE` | `/api/admin/teachers/:id` | Permanently remove a teacher account |
| `POST` | `/api/admin/teachers/:id/access` | Grant academic batch access to teacher |
| `DELETE` | `/api/admin/teachers/access/:id` | Revoke academic batch access |
| `GET` | `/api/admin/students` | List all students with search & filter |
| `POST` | `/api/admin/students` | Enroll student (supports multipart photo) |
| `PUT` | `/api/admin/students/:id` | Update student academic or bio information |
| `DELETE` | `/api/admin/students/:id` | Remove student record |
| `GET` | `/api/admin/attendance` | View institution-wide attendance records |
| `PUT` | `/api/admin/attendance/:id/correct` | Override attendance with mandatory audit reason |
| `GET` | `/api/admin/audit-logs` | Retrieve chronological administrative audit logs |

### 👨‍🏫 Teacher Portal (`/api/teacher` & `/api/students`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/teacher/profile` | Teacher/Admin | Fetch teacher profile |
| `PUT` | `/api/teacher/profile` | Teacher/Admin | Update name, subject, or description |
| `POST` | `/api/teacher/profile/photo` | Teacher/Admin | Upload profile photo (multipart) |
| `GET` | `/api/teacher/my-access` | Teacher | List assigned academic batches |
| `GET` | `/api/students` | Teacher/Admin | List batch-scoped students |
| `POST` | `/api/students/:id/register-face`| Teacher/Admin | Extract and save 512-dim face embedding |
| `GET` | `/api/students/download/csv` | Teacher/Admin | Export student roster CSV |

### 📋 Attendance Management (`/api/attendance`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/attendance` | Teacher/Admin | Submit manual attendance roster |
| `GET` | `/api/attendance/today` | Teacher/Admin | Fetch today's current session records |
| `DELETE`| `/api/attendance/today` | Teacher/Admin | Reset today's attendance session |
| `GET` | `/api/attendance/date/:date` | Teacher/Admin | View attendance by specific date |
| `POST` | `/api/attendance/face` | Teacher/Admin | Match single webcam frame against batch |
| `POST` | `/api/attendance/face-multiple`| Teacher/Admin | Match classroom photo with multiple faces |
| `GET` | `/api/attendance/download/today`| Teacher/Admin | Export today's attendance CSV |
| `GET` | `/api/attendance/download/range`| Teacher/Admin | Export custom date-range attendance CSV |

### 🎓 Student Portal (`/api/student`) — *Requires `student` role*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/dashboard` | Fetch personal aggregate %, class counts & 75% calculator |
| `GET` | `/api/student/attendance` | Complete attendance session history and absence log |
| `GET` | `/api/student/attendance/summary`| Subject-wise attendance distribution |
| `GET` | `/api/student/profile` | Enrolled profile information |

### 🐍 Python Biometric Service (Port 5001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Fast service and model readiness check |
| `POST` | `/api/add-student` | Extract embedding from image and save to PostgreSQL |
| `POST` | `/api/recognize` | Perform batch-scoped cosine similarity match |
| `POST` | `/api/recognize-multiple` | Detect and recognize all faces in a group frame |
| `POST` | `/api/remove-student` | Clear face embedding for student |

---

## 📜 Available Scripts

From the repository root:

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts Python AI, Node Server, and React Client concurrently |
| `npm run setup` | Installs all Node.js and Python dependencies across all workspaces |
| `npm run install:all` | Runs `npm install` for root, server, and client |
| `npm run install:python` | Installs Python packages into `.venv` |
| `npm run build` | Builds both the Prisma server query engine and client production bundle |
| `npm run build:client` | Compiles the React application into optimized production assets (`dist/`) |
| `npm run build:server` | Generates the Prisma client for PostgreSQL |
| `npm run seed:admin` | Seeds the initial administrator account in PostgreSQL |
| `npm run docker:build` | Builds all Docker containers (Face API, Backend Gateway, Nginx Client) |
| `npm run docker:up` | Runs the complete system in detached Docker containers |
| `npm run docker:down` | Stops and removes running containers |
| `npm start` | Runs the production preview with backend services |

---

## 🚢 Production Deployment

The Smart Attendance System is engineered with 100% turnkey deployment options across cloud platforms, container orchestrators, and self-hosted environments.

### 🐳 Option 1: Docker Compose (Recommended for 1-Click Self-Hosted)

Deploy the entire stack (React Nginx client, Node.js API, and Python Biometric Microservice) with a single command:

1. **Configure Environment**:
   ```bash
   cp .env.docker.example .env
   ```
   Edit `.env` with your PostgreSQL connection URL (`DATABASE_URL`) and a secure `JWT_SECRET`.

2. **Launch Containers**:
   ```bash
   docker compose up --build -d
   ```

3. **Verify Deployment**:
   - Web Client: `http://localhost:80`
   - Express API: `http://localhost:5000/health`
   - Python AI Engine: `http://localhost:5001/health`

4. **Seed Administrator**:
   ```bash
   docker compose exec backend node scripts/seed-admin.js
   ```

---

### ☁️ Option 2: Cloud PaaS (Vercel + Render + Managed PostgreSQL)

This decoupled cloud architecture provides high availability, global CDN edge delivery for the frontend, and dedicated computational resources for biometrics.

#### 1. Database (Aiven / Neon / Supabase)
1. Provision a free PostgreSQL instance.
2. Obtain the standard URI with SSL:
   ```
   postgres://<username>:<password>@<host>:<port>/<database>?sslmode=require
   ```

#### 2. Python Biometrics on Render / Railway
1. Create a **New Web Service** pointing to your repository.
2. Root Directory: `StudentAttendanceSystem/server/python`
3. Environment: `Python 3`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn --bind 0.0.0.0:$PORT --timeout 120 --workers 1 api_server:app`
6. Health Check Path: `/health`
7. Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `HF_TOKEN`: *(Optional)* Your HuggingFace Token for rate-limit protection

#### 3. Node.js Backend on Render / Railway
1. Create a **New Web Service** pointing to your repository.
2. Root Directory: `StudentAttendanceSystem/server`
3. Environment: `Node`
4. Build Command: `npm install && npx prisma generate`
5. Start Command: `node src/app.js`
6. Health Check Path: `/health`
7. Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or system `$PORT`)
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A long random secret string
   - `JWT_EXPIRES_IN`: `7d`
   - `FACE_API_URL`: URL of the Python service (e.g. `https://sas-face-api.onrender.com/api`)
   - `FRONTEND_URL`: URL of the frontend (e.g. `https://sas-app.vercel.app`)

#### 4. React Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Framework Preset: **Vite**
3. Root Directory: `StudentAttendanceSystem/client`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://sas-backend.onrender.com/api`)

*Note: SPA route rewrites are automatically handled by [`vercel.json`](file:///StudentAttendanceSystem/client/vercel.json).*

---

### 🖥️ Option 3: Traditional VPS (Ubuntu 22.04 / Nginx / PM2)

```bash
# 1. Clone repository and install dependencies
npm run setup

# 2. Configure server environment
cp StudentAttendanceSystem/server/.env.example StudentAttendanceSystem/server/.env
# (Edit database and secret values in .env)

# 3. Apply Prisma migrations and generate client
cd StudentAttendanceSystem/server
npx prisma db push
npx prisma generate

# 4. Seed initial administrator
ADMIN_NAME="Administrator" ADMIN_EMAIL="admin@institution.edu" ADMIN_PASSWORD="your_password" node scripts/seed-admin.js

# 5. Build React client
cd ../client
VITE_API_URL="https://your-domain.com/api" npm run build

# 6. Start backend daemons with PM2
pm2 start StudentAttendanceSystem/server/src/app.js --name "sas-api"
pm2 start "gunicorn -w 2 -b 127.0.0.1:5001 api_server:app" --name "sas-face" --cwd StudentAttendanceSystem/server/python
pm2 save
```

---

### ✅ Pre-Flight Production Checklist

Before onboarding active faculty and students, verify the following:

- [ ] **Database Connection**: `GET /health` on the backend returns `{ "status": "healthy", "database": "PostgreSQL connected" }`.
- [ ] **Biometric API Status**: `GET /health` on the Python service returns `{ "success": true, "message": "Face recognition API is running" }`.
- [ ] **Admin Account Provisioned**: Successfully logged in via `/login` using seeded admin credentials.
- [ ] **CORS Settings**: `FRONTEND_URL` in the backend accurately points to the frontend domain.
- [ ] **HTTPS / SSL**: SSL certificates (Let's Encrypt / Cloudflare) are active on all public endpoints.
- [ ] **Upload Permissions**: Persistent storage volume is attached to `uploads/` or media files are backed up.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).