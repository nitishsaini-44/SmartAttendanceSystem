import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    GraduationCap, Mail, Lock, Eye, EyeOff, Loader2,
    ShieldCheck, AlertCircle, ArrowLeft, ArrowRight,
    Sparkles, CheckCircle2, Fingerprint, Scan,
    Info, Users, Shield, Cpu, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const emailInputRef = useRef(null);

    const { login, isAuthenticated, role } = useAuth();
    const navigate = useNavigate();

    // Auto-redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && role) {
            if (role === 'admin') navigate('/admin/dashboard', { replace: true });
            else if (role === 'student') navigate('/student/dashboard', { replace: true });
            else navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, role, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errorMessage) setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            await login(formData.email, formData.password);
            toast.success('Authentication verified. Welcome back!');
        } catch (error) {
            let msg = 'Invalid credentials. Please verify your institutional email and password.';
            if (!error.response || error.code === 'ERR_NETWORK') {
                msg = 'Unable to connect to the backend server. Please verify that the API server is online.';
            } else if (error.response?.data?.message) {
                msg = error.response.data.message;
            }
            setErrorMessage(msg);
            toast.error(msg);
            // Clear BOTH email and password fields if credentials are wrong
            setFormData({ email: '', password: '' });
            setTimeout(() => {
                emailInputRef.current?.focus();
            }, 50);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-white selection:text-black">
            {/* Ambient Background Glows & Grid (strictly clipped to prevent scroll overflow) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]" />
                <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[160px]" />
                <div className="absolute inset-0 hero-grid opacity-20" />
            </div>

            {/* Top Navigation Bar */}
            <header className="relative z-20 w-full border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group" aria-label="Smart Attendance System home">
                        <div className="p-2 rounded-xl bg-white/5 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold leading-none">Smart</span>
                            <span className="text-sm font-bold text-white leading-tight">Attendance System</span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all duration-200"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Home</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 my-auto">
                <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">

                    {/* Left Column: Visual Showcase & Brand Highlights (Hidden on small mobile, visible on tablet/desktop) */}
                    <div className="lg:col-span-5 space-y-5 hidden sm:block">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Institutional Portal Gateway</span>
                        </div>

                        <div className="space-y-2.5">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                                Access your campus <br />
                                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                                    smart attendance
                                </span>
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                Sign in with institutional credentials to launch AI face recognition sessions, manage class rosters, or monitor live biometric logs.
                            </p>
                        </div>

                        {/* Interactive Biometric Micro-Card */}
                        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 backdrop-blur-xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                        <Scan className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-white">InsightFace Buffalo_L</div>
                                        <div className="text-[11px] text-zinc-400">512-D Biometric Vectors</div>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    99.8% Match
                                </span>
                            </div>

                            {/* 3 Core Roles pill bar */}
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                                    <div className="font-semibold text-zinc-200">Admin</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">Control</div>
                                </div>
                                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                                    <div className="font-semibold text-zinc-200">Faculty</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">Scanning</div>
                                </div>
                                <div className="p-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
                                    <div className="font-semibold text-zinc-200">Student</div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">Reports</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Zero-Trust Tokenized Access</span>
                                </span>
                                <span className="text-zinc-500">Latency &lt; 200ms</span>
                            </div>
                        </div>

                        {/* Feature bullets */}
                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-start gap-2.5">
                                <div className="p-1 rounded-full bg-blue-500/10 text-blue-400 mt-0.5 flex-shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-zinc-200 block">Unified Role Redirection</span>
                                    <span className="text-[11px] text-zinc-500 leading-tight">One secure login automatically routes you to your specific dashboard.</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <div className="p-1 rounded-full bg-blue-500/10 text-blue-400 mt-0.5 flex-shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-zinc-200 block">Encrypted Biometric Security</span>
                                    <span className="text-[11px] text-zinc-500 leading-tight">Vector embeddings stored mathematically without retaining raw webcam images.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Premium Login Form Card */}
                    <div className="lg:col-span-7">
                        <div className="relative rounded-3xl border border-zinc-800/90 bg-zinc-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                            {/* Card Accent Glow (clipped by overflow-hidden) */}
                            <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-[80px]" />

                            {/* Header */}
                            <div className="mb-5 sm:mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md mb-3">
                                        <Shield className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowHelpModal(!showHelpModal)}
                                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-800/60 border border-transparent hover:border-zinc-800"
                                        aria-label="Login assistance"
                                    >
                                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>Need help?</span>
                                    </button>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to portal</h2>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Authenticate using your institutionally provisioned credentials
                                </p>
                            </div>

                            {/* Help Info Box (Collapsible) */}
                            {showHelpModal && (
                                <div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-zinc-300 space-y-1.5 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 font-semibold text-blue-300">
                                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <span>Institutional Access Guidelines</span>
                                    </div>
                                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                                        Accounts are provisioned by campus administration. If you do not have an active institutional login or require a password reset, please contact your IT Department or Academic Coordinator.
                                    </p>
                                </div>
                            )}

                            {/* Inline Error Banner */}
                            {errorMessage && (
                                <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
                                    <span className="leading-relaxed">{errorMessage}</span>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Institutional Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                        <input
                                            ref={emailInputRef}
                                            type="email"
                                            name="email"
                                            id="login-email-input"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            autoComplete="off"
                                            placeholder="User@institution.edu"
                                            className={`w-full rounded-2xl border bg-zinc-950 px-4 py-2.5 sm:py-3 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all ${
                                                errorMessage
                                                    ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/30'
                                                    : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/30'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowHelpModal(true)}
                                            className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            id="login-password-input"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            autoComplete="new-password"
                                            placeholder="••••••••••••"
                                            className={`w-full rounded-2xl border bg-zinc-950 px-4 py-2.5 sm:py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all ${
                                                errorMessage
                                                    ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/30'
                                                    : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/30'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember device checkbox */}
                                <div className="flex items-center justify-between pt-0.5">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-300 select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded-md border-zinc-700 bg-zinc-950 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span>Remember this workstation</span>
                                    </label>
                                    <span className="text-[11px] text-zinc-500">TLS 1.3 Verified</span>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-1.5 sm:pt-2">
                                    <button
                                        type="submit"
                                        id="login-submit-btn"
                                        disabled={loading}
                                        className="w-full rounded-2xl bg-white py-3 sm:py-3.5 text-sm font-bold text-black hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-50 shadow-xl shadow-white/10 flex items-center justify-center gap-2.5 group"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin text-black" />
                                                <span>Authenticating session…</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Sign In to Dashboard</span>
                                                <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Card Security Footer */}
                            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-zinc-500">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>256-Bit End-to-End Encryption</span>
                                </span>
                                <span>Single Sign-On (SSO) Ready</span>
                            </div>
                        </div>

                        {/* Mobile back link */}
                        <div className="mt-4 text-center sm:hidden">
                            <Link to="/" className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Back to homepage</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Footer */}
            <footer className="relative z-20 w-full border-t border-zinc-900 bg-zinc-950/80 py-3.5 sm:py-4 text-center text-xs text-zinc-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p>© {new Date().getFullYear()} Smart Attendance System. Enterprise Biometric Platform.</p>
                    <p className="text-[11px] text-zinc-600">
                        Administered institutionally. Self-registration is restricted.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Login;
