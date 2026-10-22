import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMessage) setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            await login(formData.email, formData.password);
            toast.success('Login successful!');
        } catch (error) {
            let msg = 'Invalid email or password. Please verify your credentials.';
            if (!error.response || error.code === 'ERR_NETWORK') {
                msg = 'Unable to connect to the backend server. Please check your network connection or verify that the API server is online.';
            } else if (error.response?.data?.message) {
                msg = error.response.data.message;
            }
            setErrorMessage(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 px-4 sm:px-6 lg:px-8 py-12 overflow-hidden selection:bg-white selection:text-black">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-[128px]" />
            <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-[128px]" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-zinc-800/20 blur-[160px]" />

            <div className="relative z-10 w-full max-w-md">
                {/* Brand Logo & Name */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-4">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Smart Attendance System</h1>
                    <p className="mt-1.5 text-xs text-zinc-400 font-medium">Autonomous Biometric & Academic Management</p>
                </div>

                {/* Login Card */}
                <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-8 sm:p-9 shadow-2xl backdrop-blur-xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">Welcome back</h2>
                        <p className="mt-1 text-xs text-zinc-400">
                            Enter your credentials to access your account
                        </p>
                    </div>

                    {/* Inline Error Alert Banner */}
                    {errorMessage && (
                        <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-300">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Institutional Email
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    className={`w-full rounded-2xl border ${
                                        errorMessage ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400' : 'border-zinc-700/80 focus:border-white focus:ring-white'
                                    } bg-zinc-950/70 px-4 py-3 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all`}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={`w-full rounded-2xl border ${
                                        errorMessage ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400' : 'border-zinc-700/80 focus:border-white focus:ring-white'
                                    } bg-zinc-950/70 px-4 py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all`}
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

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-black hover:bg-zinc-200 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                                        <span>Signing in…</span>
                                    </>
                                ) : (
                                    <span>Sign In</span>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Unified Access Badge */}
                    <div className="mt-6 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Unified Role Gateway
                        </span>
                        <span>Admin • Teacher • Student</span>
                    </div>
                </div>

                {/* Footer Note (No Register Link) */}
                <p className="mt-6 text-center text-xs text-zinc-500 leading-relaxed px-4">
                    Accounts are provisioned by campus administration. If you require access or password assistance, please contact your department coordinator.
                </p>
            </div>
        </div>
    );
};

export default Login;