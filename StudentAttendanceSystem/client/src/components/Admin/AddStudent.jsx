import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import studentService from '../../services/studentService';
import api from '../../services/api';
import { User, Mail, Hash, BookOpen, Users, ArrowLeft, Upload, Camera, X, Check, ImagePlus, FlipHorizontal, Lock, ShieldCheck, GraduationCap, GitBranch, Layers, Grid } from 'lucide-react';
import toast from 'react-hot-toast';

const ACADEMIC_YEARS = [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' },
];

const BRANCHES = ['CSE', 'ECE', 'AIDE'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const SUBSECTIONS = {
    A: ['A1', 'A2', 'A3'],
    B: ['B1', 'B2', 'B3'],
    C: ['C1', 'C2', 'C3'],
    D: ['D1', 'D2', 'D3'],
};

const AddStudent = () => {
    const [formData, setFormData] = useState({
        studentId: '',
        name: '',
        email: '',
        password: '',
        academicYear: 1,
        branch: 'CSE',
        section: 'A',
        subsection: 'A1',
        class: ''
    });
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [previewUrl, setPreviewUrl]   = useState(null);
    const [faceImage, setFaceImage]     = useState(null);
    const [facePreview, setFacePreview] = useState(null);
    const [loading, setLoading]         = useState(false);
    const [showCamera, setShowCamera]   = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [facingMode, setFacingMode]   = useState('user');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSectionChange = (e) => {
        const sec = e.target.value;
        const validSubs = SUBSECTIONS[sec] || [];
        setFormData(prev => ({
            ...prev,
            section: sec,
            subsection: validSubs[0] || ''
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const startCamera = useCallback(async (facing = facingMode) => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }
            });
            setCameraStream(stream);
            setShowCamera(true);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (error) {
            toast.error('Failed to access camera. Please allow camera permissions.');
            console.error('Camera error:', error);
        }
    }, [cameraStream, facingMode]);

    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    }, [cameraStream]);

    const flipCamera = async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacing);
        await startCamera(newFacing);
        toast.success(newFacing === 'user' ? 'Switched to front camera' : 'Switched to back camera');
    };

    const captureFace = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState < 2) {
            toast.error('Camera not ready. Please wait a moment and try again.');
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setFaceImage(imageData);
        setFacePreview(imageData);
        stopCamera();
        toast.success('Face captured successfully!');
    }, [stopCamera]);

    const clearFaceImage = () => {
        setFaceImage(null);
        setFacePreview(null);
    };

    const handleFaceImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                setFaceImage(imageData);
                setFacePreview(imageData);
                toast.success('Face image uploaded successfully!');
            };
            reader.onerror = () => {
                toast.error('Failed to read image file');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = { ...formData };
            if (profilePhoto) {
                data.profilePhoto = profilePhoto;
            }
            if (faceImage) {
                data.faceImage = faceImage;
            }

            const result = await studentService.addStudent(data);

            if (result.faceWarning) {
                toast.success('Student registered successfully in administration!');
                toast.error(`Face biometric notice: ${result.faceWarning}`, { duration: 6000 });
            } else {
                toast.success(result.message || 'Student created successfully with face biometric data!');
            }
            navigate('/admin/students');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Link to="/admin/students" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Students
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Administrator Enrollment
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8 shadow-xl">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Add New Student</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Register a new student account, configure class assignments, and enroll facial biometric data.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Top Row: Profile Photo + Face Biometric Registration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
                        {/* Profile Photo */}
                        <div className="flex flex-col items-center justify-center p-4">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                Profile Avatar
                            </label>
                            <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden mb-3 shadow-inner">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-zinc-500" />
                                )}
                            </div>
                            <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all shadow-sm">
                                <Upload className="h-3.5 w-3.5" />
                                <span>{profilePhoto ? 'Change Photo' : 'Upload Avatar'}</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>

                        {/* Face Recognition Registration */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-emerald-400" />
                                    Face Biometric Recognition
                                </h3>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Capture or upload a clear frontal face image for AI attendance recognition.
                                </p>
                            </div>

                            {showCamera ? (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden bg-black">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-44 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={flipCamera}
                                            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-xs text-white backdrop-blur hover:bg-zinc-800"
                                            aria-label="Flip camera"
                                        >
                                            <FlipHorizontal className="h-3.5 w-3.5" />
                                            Flip
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={captureFace}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                                        >
                                            <Camera className="h-3.5 w-3.5" />
                                            Capture Face
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : facePreview ? (
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/30">
                                        <img
                                            src={facePreview}
                                            alt="Captured face"
                                            className="w-full h-44 object-cover"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 shadow">
                                                <Check className="h-3 w-3" />
                                                Biometric Ready
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startCamera()}
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                                        >
                                            <Camera className="h-3.5 w-3.5" />
                                            Retake
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearFaceImage}
                                            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startCamera()}
                                            className="flex-1 py-4 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/60 transition flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white"
                                        >
                                            <Camera className="h-6 w-6 text-zinc-400" />
                                            <span className="text-xs font-medium">Use Camera</span>
                                        </button>
                                        <label className="flex-1 py-4 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-600 hover:bg-emerald-900/10 transition flex flex-col items-center gap-1.5 text-zinc-400 hover:text-emerald-400 cursor-pointer">
                                            <ImagePlus className="h-6 w-6" />
                                            <span className="text-xs font-medium">Upload Image</span>
                                            <input type="file" accept="image/*" onChange={handleFaceImageUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Student ID / Roll Number *
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    name="studentId"
                                    value={formData.studentId}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                                    placeholder="e.g., 2023KUEC2080"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Student Name *
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                                    placeholder="e.g., Nitish Saini"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Email (Optional, for portal access)
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                                    placeholder="student@school.edu"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Password (Optional, default is student ID)
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none"
                                    placeholder="Leave blank to use student ID"
                                />
                            </div>
                        </div>

                        {/* Academic Year */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Academic Year *
                            </label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <select
                                    name="academicYear"
                                    value={formData.academicYear}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {ACADEMIC_YEARS.map(y => (
                                        <option key={y.value} value={y.value}>{y.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Branch */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Branch *
                            </label>
                            <div className="relative">
                                <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <select
                                    name="branch"
                                    value={formData.branch}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {BRANCHES.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Section */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Section *
                            </label>
                            <div className="relative">
                                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <select
                                    name="section"
                                    value={formData.section}
                                    onChange={handleSectionChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {SECTIONS.map(s => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subsection (Dependent dropdown) */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Subsection * (For Section {formData.section})
                            </label>
                            <div className="relative">
                                <Grid className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <select
                                    name="subsection"
                                    value={formData.subsection}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 pl-10 pr-4 py-2.5 text-sm text-white focus:border-white focus:outline-none"
                                >
                                    {(SUBSECTIONS[formData.section] || []).map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/students')}
                            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Register Student'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudent;
