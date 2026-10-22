import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardCheck, ClipboardList, Scan, Download, Image, ShieldCheck, ShieldAlert, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TakeAttendance from '../components/Attendance/TakeAttendance';
import AttendanceList from '../components/Attendance/AttendanceList';
import FaceAttendance from '../components/Attendance/FaceAttendance';
import DownloadAttendance from '../components/Attendance/DownloadAttendance';
import PhotoUpload from '../components/Attendance/PhotoUpload';
import Card from '../components/common/Card';

const formatAcademicYear = (yr) => {
    if (!yr) return '–';
    const num = parseInt(yr, 10);
    if (num === 1) return '1st Year';
    if (num === 2) return '2nd Year';
    if (num === 3) return '3rd Year';
    if (num === 4) return '4th Year';
    return `${num}th Year`;
};

const Attendance = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'face');
    const [refreshKey, setRefreshKey] = useState(0);
    const [teacherAccess, setTeacherAccess] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [loadingAccess, setLoadingAccess] = useState(false);

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location.state?.tab]);

    useEffect(() => {
        if (user?.role === 'teacher') {
            fetchTeacherAccess();
        } else {
            // Admin default batch
            setSelectedBatch({
                academicYear: 4,
                branch: 'CSE',
                section: 'A',
                subsection: 'A1'
            });
        }
    }, [user]);

    const fetchTeacherAccess = async () => {
        setLoadingAccess(true);
        try {
            const res = await api.get('/teacher/my-access');
            if (res.data.success && res.data.access?.length > 0) {
                setTeacherAccess(res.data.access);
                
                // If a batch was passed via navigation, pick it; otherwise pick first
                const targetFromState = location.state?.batch;
                let matched = null;
                if (targetFromState) {
                    matched = res.data.access.find(b => 
                        b.id === targetFromState.id ||
                        (b.branch === targetFromState.branch &&
                         Number(b.academicYear) === Number(targetFromState.academicYear) &&
                         b.section === targetFromState.section &&
                         b.subsection === targetFromState.subsection)
                    );
                }
                setSelectedBatch(matched || res.data.access[0]);
            }
        } catch (e) {
            console.error('Failed to load teacher academic access:', e);
        } finally {
            setLoadingAccess(false);
        }
    };

    const handleAttendanceMarked = () => {
        setRefreshKey(prev => prev + 1);
    };

    const tabs = [
        { id: 'face', label: 'Live Video', icon: Scan },
        { id: 'photo', label: 'Photo Upload', icon: Image },
        { id: 'take', label: 'Manual', icon: ClipboardCheck },
        { id: 'view', label: 'Today', icon: ClipboardList },
        { id: 'download', label: 'Download', icon: Download }
    ];

    return (
        <div className="space-y-6 page-enter">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-title">Attendance Management</h1>
                    <p className="text-subtext mt-1">Manage and record attendance with batch-scoped face recognition</p>
                </div>
            </div>

            {/* Teacher Batch Access Selector */}
            {user?.role === 'teacher' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 backdrop-blur shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-blue-400" />
                                <h3 className="text-sm font-bold text-white">Select Target Batch to Take Attendance</h3>
                                <span className="rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                                    Required
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                                Attendance and facial embedding comparisons will be strictly scoped to this batch to ensure maximum speed and 0% cross-branch false positives.
                            </p>
                        </div>

                        {loadingAccess ? (
                            <span className="text-xs text-zinc-400">Loading authorized batches...</span>
                        ) : teacherAccess.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {teacherAccess.map((batch) => {
                                    const isSelected = selectedBatch &&
                                        selectedBatch.academicYear === batch.academicYear &&
                                        selectedBatch.branch === batch.branch &&
                                        selectedBatch.section === batch.section &&
                                        selectedBatch.subsection === batch.subsection;
                                    return (
                                        <button
                                            key={batch.id}
                                            onClick={() => setSelectedBatch(batch)}
                                            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 border ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/10'
                                                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                                            }`}
                                        >
                                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                                            <span>
                                                {formatAcademicYear(batch.academicYear)} • {batch.branch}-{batch.section} ({batch.subsection})
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
                                <ShieldAlert className="h-4 w-4" />
                                No batches assigned by administration.
                            </div>
                        )}
                    </div>

                    {/* Active Selected Batch Context Banner */}
                    {selectedBatch && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-xs">
                            <div className="flex items-center gap-2 text-zinc-300">
                                <span className="text-zinc-500">Active Attendance Target:</span>
                                <span className="font-semibold text-white">
                                    {selectedBatch.branch} {formatAcademicYear(selectedBatch.academicYear)} — Section {selectedBatch.section} (Batch {selectedBatch.subsection})
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>High-Speed Biometric Scope Active</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Card className="overflow-hidden p-4 sm:p-6">
                <div className="mb-6">
                    <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex flex-1 min-w-[80px] items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'border border-zinc-700 bg-zinc-800 text-white'
                                            : 'border border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === 'face' && (
                    <FaceAttendance 
                        selectedBatch={selectedBatch} 
                        onAttendanceMarked={handleAttendanceMarked} 
                    />
                )}
                {activeTab === 'photo' && (
                    <PhotoUpload 
                        selectedBatch={selectedBatch} 
                        onAttendanceMarked={handleAttendanceMarked} 
                    />
                )}
                {activeTab === 'take' && (
                    <TakeAttendance 
                        key={`take-${refreshKey}-${selectedBatch?.academicYear}-${selectedBatch?.branch}-${selectedBatch?.section}-${selectedBatch?.subsection}`}
                        selectedBatch={selectedBatch} 
                        onAttendanceMarked={handleAttendanceMarked} 
                    />
                )}
                {activeTab === 'view' && (
                    <AttendanceList 
                        key={`view-${refreshKey}-${selectedBatch?.academicYear}-${selectedBatch?.branch}-${selectedBatch?.section}-${selectedBatch?.subsection}`}
                        selectedBatch={selectedBatch} 
                    />
                )}
                {activeTab === 'download' && <DownloadAttendance />}
            </Card>
        </div>
    );
};

export default Attendance;
