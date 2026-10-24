import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import RoleRoute from './components/common/RoleRoute';
import PrivateRoute from './components/common/PrivateRoute';
import { useAuth } from './context/AuthContext';
import PageSkeleton from './components/common/PageSkeleton';

// ── Landing page ──────────────────────────────────────────────────────────────
const LandingPage    = lazy(() => import('./components/Landing/LandingPage'));

// ── Shared / Auth pages ───────────────────────────────────────────────────────
const Login          = lazy(() => import('./components/Auth/Login'));
const ChangePassword = lazy(() => import('./components/Auth/ChangePassword'));

// ── Teacher pages (existing) ──────────────────────────────────────────────────
const Dashboard      = lazy(() => import('./components/Dashboard/Dashboard'));
const StudentList    = lazy(() => import('./components/Students/StudentList'));
const Attendance     = lazy(() => import('./pages/Attendance'));
const TeacherProfile = lazy(() => import('./components/Profile/TeacherProfile'));
const EditProfile    = lazy(() => import('./components/Profile/EditProfile'));

// ── Admin pages ───────────────────────────────────────────────────────────────
const AdminDashboard       = lazy(() => import('./components/Admin/AdminDashboard'));
const TeacherManagement    = lazy(() => import('./components/Admin/TeacherManagement'));
const StudentManagement    = lazy(() => import('./components/Admin/StudentManagement'));
const AdminAddStudent      = lazy(() => import('./components/Admin/AddStudent'));
const AdminAttendance      = lazy(() => import('./components/Admin/AdminAttendance'));
const AuditLogs            = lazy(() => import('./components/Admin/AuditLogs'));

// ── Student portal pages ──────────────────────────────────────────────────────
const StudentDashboard     = lazy(() => import('./components/Student/StudentDashboard'));
const StudentAttendanceView = lazy(() => import('./components/Student/StudentAttendanceView'));
const StudentReports        = lazy(() => import('./components/Student/StudentReports'));
const StudentProfile       = lazy(() => import('./components/Student/StudentProfile'));

const App = () => {
    const location = useLocation();
    const { isAuthenticated, role } = useAuth();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    const isLandingPage = location.pathname === '/';
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {!isAuthPage && !isLandingPage && isAuthenticated && (
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            )}
            <div className={!isAuthPage && !isLandingPage && isAuthenticated ? 'lg:pl-72' : ''}>
                {!isAuthPage && !isLandingPage && isAuthenticated && (
                    <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
                )}
                <main className={isAuthPage || isLandingPage ? 'min-h-screen' : 'px-4 py-4 sm:px-6 sm:py-6'}>
                    <Suspense fallback={<PageSkeleton />}>
                        <Routes>
                            {/* ── Public Routes ── */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Navigate to="/login" replace />} />

                            {/* ── Shared Protected Routes (any role) ── */}
                            <Route path="/change-password" element={
                                <PrivateRoute><ChangePassword /></PrivateRoute>
                            } />

                            {/* ── Teacher Routes ── */}
                            <Route path="/dashboard" element={
                                <RoleRoute allowedRoles={['teacher', 'admin']}>
                                    <Dashboard />
                                </RoleRoute>
                            } />
                            <Route path="/students" element={
                                <RoleRoute allowedRoles={['teacher', 'admin']}>
                                    <StudentList />
                                </RoleRoute>
                            } />
                            <Route path="/attendance" element={
                                <RoleRoute allowedRoles={['teacher', 'admin']}>
                                    <Attendance />
                                </RoleRoute>
                            } />
                            <Route path="/profile" element={
                                <RoleRoute allowedRoles={['teacher', 'admin']}>
                                    <TeacherProfile />
                                </RoleRoute>
                            } />
                            <Route path="/profile/edit" element={
                                <RoleRoute allowedRoles={['teacher', 'admin']}>
                                    <EditProfile />
                                </RoleRoute>
                            } />

                            {/* ── Admin Routes ── */}
                            <Route path="/admin/dashboard" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </RoleRoute>
                            } />
                            <Route path="/admin/teachers" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <TeacherManagement />
                                </RoleRoute>
                            } />
                            <Route path="/admin/students" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <StudentManagement />
                                </RoleRoute>
                            } />
                            <Route path="/admin/students/add" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <AdminAddStudent />
                                </RoleRoute>
                            } />
                            <Route path="/admin/classes" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/subjects" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/enrollments" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/assignments" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/attendance" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <AdminAttendance />
                                </RoleRoute>
                            } />
                            <Route path="/admin/audit-logs" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <AuditLogs />
                                </RoleRoute>
                            } />
                            <Route path="/admin/profile" element={
                                <RoleRoute allowedRoles={['admin']}>
                                    <TeacherProfile />
                                </RoleRoute>
                            } />

                            {/* ── Student Portal Routes ── */}
                            <Route path="/student/dashboard" element={
                                <RoleRoute allowedRoles={['student']}>
                                    <StudentDashboard />
                                </RoleRoute>
                            } />
                            <Route path="/student/attendance" element={
                                <RoleRoute allowedRoles={['student']}>
                                    <StudentAttendanceView />
                                </RoleRoute>
                            } />
                            <Route path="/student/reports" element={
                                <RoleRoute allowedRoles={['student']}>
                                    <StudentReports />
                                </RoleRoute>
                            } />
                            <Route path="/student/profile" element={
                                <RoleRoute allowedRoles={['student']}>
                                    <StudentProfile />
                                </RoleRoute>
                            } />

                            {/* ── Public landing page / smart root redirect by role ── */}
                            <Route path="/" element={<LandingPage />} />

                            {/* ── 404 fallback ── */}
                            <Route path="*" element={
                                <PrivateRoute>
                                    {role === 'admin'   ? <Navigate to="/admin/dashboard"   replace /> :
                                     role === 'student' ? <Navigate to="/student/dashboard" replace /> :
                                                          <Navigate to="/dashboard"          replace />}
                                </PrivateRoute>
                            } />
                        </Routes>
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

export default App;