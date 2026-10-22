import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/**
 * RoleRoute — wraps a route and enforces authentication + role.
 *
 * Props:
 *   allowedRoles {string[]} — e.g. ['admin'] or ['teacher', 'admin']
 *                             If omitted, any authenticated user is allowed.
 *   children     {ReactNode}
 *
 * Examples:
 *   <RoleRoute allowedRoles={['admin']}>  <AdminDashboard />  </RoleRoute>
 *   <RoleRoute allowedRoles={['student']}> <StudentDashboard /> </RoleRoute>
 *   <RoleRoute>  <Dashboard />  </RoleRoute>  ← any authenticated role
 */
const RoleRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Loader />;

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Redirect to the user's own dashboard instead of 404
        const defaultPath =
            role === 'admin'   ? '/admin/dashboard'  :
            role === 'student' ? '/student/dashboard' :
            '/dashboard';
        return <Navigate to={defaultPath} replace />;
    }

    return children;
};

export default RoleRoute;
