import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Read user from localStorage synchronously for instant render
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await authService.getMe();
                if (response.success) {
                    const userData = response.user || response.teacher;
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                    // backward-compat: keep 'teacher' key for existing components
                    if (userData?.role === 'teacher' || userData?.role === 'admin') {
                        localStorage.setItem('teacher', JSON.stringify(userData));
                    }
                } else {
                    clearAuth();
                }
            } else {
                clearAuth();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            clearAuth();
        } finally {
            setLoading(false);
        }
    };

    const clearAuth = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('teacher');
        setUser(null);
    };

    const login = async (email, password) => {
        const response = await authService.login(email, password);
        if (response.success) {
            const userData = response.user || response.teacher;
            setUser(userData);
            // Role-based post-login redirect
            if (userData?.role === 'admin') navigate('/admin/dashboard');
            else if (userData?.role === 'student') navigate('/student/dashboard');
            else navigate('/dashboard');
        }
        return response;
    };

    // Register is disabled — this just surfaces the 403 to the UI
    const register = async (userData) => {
        const response = await authService.register(userData);
        return response;
    };

    const logout = () => {
        clearAuth();
        navigate('/login');
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('teacher', JSON.stringify(updatedUser));
    };

    // Backward-compat alias so existing components using `teacher` still work
    const updateTeacher = updateUser;

    const value = {
        user,
        teacher: user,          // backward-compat alias
        loading,
        isAuthenticated: !!user,
        role: user?.role || null,
        isAdmin:   user?.role === 'admin',
        isTeacher: user?.role === 'teacher',
        isStudent: user?.role === 'student',
        login,
        register,
        logout,
        updateUser,
        updateTeacher,          // backward-compat
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export default AuthContext;