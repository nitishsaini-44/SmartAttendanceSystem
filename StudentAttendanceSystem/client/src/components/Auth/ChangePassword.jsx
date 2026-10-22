import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import toast from 'react-hot-toast';
import Card from '../common/Card';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const togglePassword = (field) => {
        setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await teacherService.changePassword(
                formData.currentPassword,
                formData.newPassword
            );
            toast.success('Password changed successfully');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            navigate('/profile');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-5 page-enter">
            <button 
                onClick={() => navigate('/profile')} 
                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
            </button>

            <Card className="border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 backdrop-blur shadow-2xl">
                <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-4">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-400">
                        <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Change Password</h2>
                        <p className="text-xs text-zinc-400">Keep your faculty account safe and secure</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                required
                                className="input-field pr-10"
                                placeholder="Enter your current password"
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('current')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 transition-colors"
                            >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                                className="input-field pr-10"
                                placeholder="Enter at least 6 characters"
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('new')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 transition-colors"
                            >
                                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="input-field pr-10"
                                placeholder="Re-type new password"
                            />
                            <button
                                type="button"
                                onClick={() => togglePassword('confirm')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 transition-colors"
                            >
                                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 flex items-center justify-center font-medium shadow-lg"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ChangePassword;