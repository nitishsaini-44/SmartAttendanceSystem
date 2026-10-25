import React, { useState, useRef, useEffect } from 'react';
import attendanceService from '../../services/attendanceService';
import { Camera, CameraOff, Users, User, CheckCircle, AlertCircle, Scan, FlipHorizontal, UserCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const FaceAttendance = ({ onAttendanceMarked, selectedBatch }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [faceApiStatus, setFaceApiStatus] = useState(null);
    const [mode, setMode] = useState('single'); // 'single' or 'multiple'
    const [lastResult, setLastResult] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)

    useEffect(() => {
        checkFaceApiStatus();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const checkFaceApiStatus = async () => {
        try {
            const status = await attendanceService.checkFaceApiStatus();
            setFaceApiStatus(status.success);
        } catch (error) {
            setFaceApiStatus(false);
        }
    };

    const startCamera = async (facing = facingMode) => {
        // Stop any existing stream first
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: facing
                }
            });

            setStream(mediaStream);
            setIsCameraOn(true);

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play().catch(console.error);
                }
            }, 100);
        } catch (error) {
            toast.error('Failed to access camera. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStream(null);
        setIsCameraOn(false);
    };

    const flipCamera = async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacing);
        await startCamera(newFacing);
        toast.success(newFacing === 'user' ? 'Switched to front camera' : 'Switched to back camera');
    };

    const captureAndRecognize = async () => {
        if (!selectedBatch) {
            toast.error('Please select an authorized batch above before taking attendance.');
            return;
        }

        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;

        if (video.readyState < 2) {
            toast.error('Camera not ready. Please wait a moment and try again.');
            return;
        }

        setLoading(true);
        setLastResult(null);

        try {
            const canvas = canvasRef.current;

            const width = video.videoWidth || 1280;
            const height = video.videoHeight || 720;

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, width, height);

            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

            const batchPayload = {
                academicYear: selectedBatch.academicYear,
                branch: selectedBatch.branch,
                section: selectedBatch.section,
                subsection: selectedBatch.subsection
            };

            let result;
            if (mode === 'single') {
                result = await attendanceService.takeFaceAttendance(imageBase64, batchPayload);
            } else {
                result = await attendanceService.takeMultipleFaceAttendance(imageBase64, batchPayload);
            }

            setLastResult(result);

            if (result.success) {
                if (mode === 'single') {
                    if (result.alreadyMarked) {
                        toast.success(`${result.student.name} already marked present!`);
                    } else {
                        toast.success(`Attendance marked for ${result.student.name}`);
                    }
                } else {
                    toast.success(result.message);
                }
                if (onAttendanceMarked) onAttendanceMarked();
            } else {
                toast.error(result.message || 'Face not recognized');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to recognize face');
            setLastResult({ success: false, message: error.response?.data?.message || 'Error' });
        } finally {
            setLoading(false);
        }
    };

    if (faceApiStatus === false) {
        return (
            <div className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-amber-300" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                    Face Recognition API Not Available
                </h3>
                <p className="mb-4 text-zinc-400">
                    The Python Face Recognition server is not running.
                </p>
                <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-left">
                    <p className="mb-2 text-sm font-medium text-zinc-300">To start the Face API:</p>
                    <code className="block rounded-xl bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
                        cd student-attendance-system/server/python &amp;&amp; python api_server.py
                    </code>
                </div>
                <button onClick={checkFaceApiStatus} className="btn-primary mt-4">
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Mode toggle */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setMode('single')}
                    className={`flex-1 rounded-2xl border px-4 py-2.5 font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        mode === 'single'
                            ? 'border-zinc-700 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                >
                    <User className="h-5 w-5" />
                    <span className="hidden xs:inline">Single</span> Face
                </button>
                <button
                    onClick={() => setMode('multiple')}
                    className={`flex-1 rounded-2xl border px-4 py-2.5 font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        mode === 'multiple'
                            ? 'border-zinc-700 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                >
                    <Users className="h-5 w-5" />
                    <span className="hidden xs:inline">Multiple</span> Faces
                </button>
            </div>

            {/* Active Scoped Batch Indicator */}
            {selectedBatch ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                        <span className="font-semibold text-blue-200">
                            Biometric Scope: {selectedBatch.branch} Year {selectedBatch.academicYear} — Sec {selectedBatch.section} ({selectedBatch.subsection})
                        </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                        Comparing embeddings ONLY for this batch
                    </span>
                </div>
            ) : (
                <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300">
                    ⚠️ Please select an authorized batch above before starting recognition.
                </div>
            )}

            {/* Camera view */}
            <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                />

                {!isCameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <CameraOff className="mb-4 h-16 w-16 text-zinc-600" />
                        <p className="text-zinc-500">Camera is off</p>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center text-white">
                            <Scan className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                            <p>Scanning faces...</p>
                        </div>
                    </div>
                )}

                {/* Camera flip button — only visible on mobile when camera is on */}
                {isCameraOn && (
                    <button
                        onClick={flipCamera}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-2xl border border-zinc-600 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-200 backdrop-blur transition hover:bg-zinc-800 md:hidden"
                        aria-label="Flip camera"
                    >
                        <FlipHorizontal className="h-4 w-4" />
                        Flip
                    </button>
                )}
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Action buttons */}
            <div className="flex gap-3">
                {!isCameraOn ? (
                    <button onClick={() => startCamera()} className="flex-1 btn-primary flex items-center justify-center gap-2">
                        <Camera className="h-5 w-5" />
                        Start Camera
                    </button>
                ) : (
                    <>
                        <button onClick={stopCamera} className="btn-secondary flex items-center gap-2">
                            <CameraOff className="h-5 w-5" />
                            Stop
                        </button>
                        <button
                            onClick={captureAndRecognize}
                            disabled={loading}
                            className="flex-1 btn-success flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Scan className="h-5 w-5" />
                                    <span className="hidden sm:inline">
                                        {mode === 'single' ? 'Mark Attendance' : 'Scan All Faces'}
                                    </span>
                                    <span className="sm:hidden">Scan</span>
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Result panel */}
            {lastResult && (
                <div className={`mt-4 rounded-2xl border p-4 transition-all duration-300 ${lastResult.success ? 'border-emerald-900/60 bg-emerald-500/10' : 'border-red-900/60 bg-red-500/10'}`}>
                    <div className="flex items-start gap-3">
                        {lastResult.success ? (
                            <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-base ${lastResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                {lastResult.message || (lastResult.success ? 'Face scanning completed successfully' : 'Face recognition failed')}
                            </p>

                            {/* Single Face Result Display */}
                            {lastResult.success && mode === 'single' && lastResult.student && (
                                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-100">{lastResult.student.name}</p>
                                            <p className="text-zinc-400 font-mono">ID: {lastResult.student.studentId}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                                                {(lastResult.student.confidence * 100).toFixed(1)}% match
                                            </span>
                                            <p className="mt-1 text-[11px] font-medium text-emerald-400">
                                                {lastResult.alreadyMarked ? 'Already Present' : 'Marked Present'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Multiple Faces Result Display */}
                            {lastResult.success && mode === 'multiple' && (() => {
                                const markedList = lastResult.markedStudents || (lastResult.results ? lastResult.results.filter(r => r.status === 'marked') : []);
                                const alreadyList = lastResult.alreadyMarkedStudents || (lastResult.results ? lastResult.results.filter(r => r.status === 'already_marked') : []);
                                const totalDetected = lastResult.totalFaces !== undefined 
                                    ? lastResult.totalFaces 
                                    : (markedList.length + alreadyList.length + (lastResult.unrecognizedCount || 0));
                                const unrecognized = lastResult.unrecognizedCount || 0;

                                return (
                                    <div className="mt-3 space-y-3">
                                        {/* Status badges header */}
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="rounded-lg bg-zinc-800/90 px-2.5 py-1 font-medium text-zinc-200 border border-zinc-700">
                                                👥 Total Faces: <strong className="text-white">{totalDetected}</strong>
                                            </span>
                                            {markedList.length > 0 && (
                                                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300 border border-emerald-500/40">
                                                    ✓ Newly Marked: {markedList.length}
                                                </span>
                                            )}
                                            {alreadyList.length > 0 && (
                                                <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 border border-amber-500/40">
                                                    ⏳ Already Present: {alreadyList.length}
                                                </span>
                                            )}
                                            {unrecognized > 0 && (
                                                <span className="rounded-lg bg-zinc-800 px-2.5 py-1 font-medium text-zinc-400 border border-zinc-700">
                                                    ❓ Unrecognized: {unrecognized}
                                                </span>
                                            )}
                                        </div>

                                        {/* Newly Marked Students Cards */}
                                        {markedList.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                                                    <UserCheck className="h-4 w-4" /> Marked Present Now ({markedList.length})
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {markedList.map((s, idx) => (
                                                        <div key={idx} className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs shadow-sm">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-semibold text-zinc-100 truncate">{s.name}</p>
                                                                <p className="text-[11px] text-zinc-400 font-mono">{s.studentId || s.studentRollNo}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <span className="inline-block rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                                                                    {(s.confidence * 100).toFixed(1)}% match
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Already Marked Students Cards */}
                                        {alreadyList.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4" /> Already Marked Present Earlier ({alreadyList.length})
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {alreadyList.map((s, idx) => (
                                                        <div key={idx} className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs shadow-sm">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-semibold text-zinc-200 truncate">{s.name}</p>
                                                                <p className="text-[11px] text-zinc-400 font-mono">{s.studentId || s.studentRollNo}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <span className="inline-block rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                                                                    {(s.confidence * 100).toFixed(1)}% match
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {markedList.length === 0 && alreadyList.length === 0 && (
                                            <p className="text-xs text-zinc-400 italic">
                                                No registered students from this batch were recognized from the detected face(s). Ensure student face profiles are enrolled and lighting is clear.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceAttendance;
