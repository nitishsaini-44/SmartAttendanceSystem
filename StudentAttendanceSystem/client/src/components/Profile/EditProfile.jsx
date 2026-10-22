import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import teacherService from '../../services/teacherService';
import { User, Mail, BookOpen, FileText, Camera, Save, ArrowLeft, Lock, Key, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../common/Loader';
import Card from '../common/Card';

const EditProfile = () => {
    const { teacher, updateTeacher, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        subject: '',
        description: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (teacher) {
            setFormData({
                subject: teacher.subject || '',
                description: teacher.description || '',
            });
            if (teacher.profilePhoto) {
                setPhotoPreview(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${teacher.profilePhoto}`);
            }
        }
    }, [teacher]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Upload photo if selected
            if (photoFile) {
                await teacherService.uploadPhoto(photoFile);
            }

            // Update profile (only subject & description sent)
            const response = await teacherService.updateProfile({
                subject: formData.subject,
                description: formData.description
            });
            updateTeacher(response.teacher);
            toast.success('Profile updated successfully!');
            navigate('/profile');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <Loader />;
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto page-enter">
            {/* Header & Back Button */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/profile')} 
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </button>
                <Link
                    to="/change-password"
                    className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-sm font-medium text-amber-300 transition-all duration-200 hover:bg-amber-500/20"
                >
                    <Key className="h-4 w-4" />
                    Change Password
                </Link>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 backdrop-blur">
                <div className="mb-6 border-b border-zinc-800 pb-5">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Edit Profile Details</h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                        Manage your faculty subject, profile photo, and biography.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Photo Upload Section */}
                    <div className="flex flex-col items-center justify-center py-2">
                        <div className="relative group">
                            {photoPreview ? (
                                <img 
                                    src={photoPreview} 
                                    alt="Profile Preview" 
                                    className="w-28 h-28 rounded-2xl object-cover border-4 border-zinc-800 shadow-xl group-hover:border-zinc-700 transition-all" 
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-2xl bg-zinc-800 flex items-center justify-center border-4 border-zinc-800 shadow-xl text-zinc-400">
                                    <User className="h-12 w-12" />
                                </div>
                            )}
                            <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()} 
                                title="Click to upload new photo"
                                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-500 shadow-lg border border-blue-400/30 transition-all"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </div>
                        <p className="text-xs text-zinc-400 mt-3">Click the camera button to upload a profile photo</p>
                    </div>

                    {/* Notice: Name and Email Locked */}
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-200/90 leading-relaxed">
                            <span className="font-semibold text-white">Administrator Restricted Fields:</span> Your official 
                            faculty name and login email are managed directly by college administration. Teachers can only 
                            change their password and personal subject/bio.
                        </div>
                    </div>

                    {/* Full Name (Read-Only) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                Full Name
                            </label>
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400 border border-zinc-700/60">
                                <Lock className="h-3 w-3 text-amber-400" /> Read-only (Managed by Admin)
                            </span>
                        </div>
                        <input 
                            type="text" 
                            value={teacher?.name || ''} 
                            disabled 
                            className="input-field bg-zinc-950/60 text-zinc-400 border-zinc-800 cursor-not-allowed select-none opacity-80" 
                        />
                    </div>

                    {/* Email (Read-Only) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                Official Email Address
                            </label>
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400 border border-zinc-700/60">
                                <Lock className="h-3 w-3 text-amber-400" /> Read-only (Managed by Admin)
                            </span>
                        </div>
                        <input 
                            type="email" 
                            value={teacher?.email || ''} 
                            disabled 
                            className="input-field bg-zinc-950/60 text-zinc-400 border-zinc-800 cursor-not-allowed select-none opacity-80" 
                        />
                    </div>

                    {/* Department / Subject (Editable) */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            <BookOpen className="inline h-3.5 w-3.5 mr-1.5 text-blue-400" />
                            Department / Teaching Subject
                        </label>
                        <input 
                            type="text" 
                            name="subject" 
                            value={formData.subject} 
                            onChange={handleChange} 
                            className="input-field" 
                            placeholder="e.g., Computer Networks, Operating Systems, Mathematics" 
                        />
                    </div>

                    {/* About Me (Editable) */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            <FileText className="inline h-3.5 w-3.5 mr-1.5 text-blue-400" />
                            About Me / Bio
                        </label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows={4} 
                            className="input-field resize-none leading-relaxed" 
                            placeholder="Share your academic interests, office hours, or contact notes..." 
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => navigate('/profile')} 
                            className="btn-secondary flex-1 justify-center py-2.5"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Profile Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Card>

            {/* Password security callout */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-400 flex-shrink-0">
                        <Key className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-zinc-100">Need to change your login password?</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Teachers can securely update their personal password at any time.
                        </p>
                    </div>
                </div>
                <Link
                    to="/change-password"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white flex-shrink-0"
                >
                    Change Password
                </Link>
            </div>
        </div>
    );
};

export default EditProfile;