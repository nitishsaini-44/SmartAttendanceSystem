import React, { useState, useRef } from 'react';
import attendanceService from '../../services/attendanceService';
import {
    Upload,
    X,
    CheckCircle,
    AlertCircle,
    Loader,
    User
} from 'lucide-react';
import toast from 'react-hot-toast';

const PhotoUpload = ({ onAttendanceMarked, selectedBatch }) => {
    const fileInputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviewers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingIndex, setProcessingIndex] = useState(null);
    const [markedStudents, setMarkedStudents] = useState([]);
    const [showResults, setShowResults] = useState(false);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        
        // Validate files
        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image`);
                return false;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 10MB limit`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setSelectedFiles(prev => [...prev, ...validFiles]);

        // Generate previews
        for (const file of validFiles) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreviewers(prev => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
        }

        toast.success(`${validFiles.length} image(s) selected`);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewers(prev => prev.filter((_, i) => i !== index));
    };

    const clearAll = () => {
        setSelectedFiles([]);
        setPreviewers([]);
        setMarkedStudents([]);
        setShowResults(false);
    };

    const processAllPhotos = async () => {
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one image');
            return;
        }

        setLoading(true);
        const allMarkedStudents = new Set(); // Use Set to avoid duplicates
        let totalPhotosProcessed = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            setProcessingIndex(i);

            try {
                const file = selectedFiles[i];
                const reader = new FileReader();

                const imageBase64 = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const payload = {
                    image: imageBase64
                };
                if (selectedBatch) {
                    payload.academicYear = selectedBatch.academicYear;
                    payload.branch = selectedBatch.branch;
                    payload.section = selectedBatch.section;
                    payload.subsection = selectedBatch.subsection;
                }

                const response = await attendanceService.bulkPhotoAttendance(payload);

                if (response.success && response.recognized) {
                    response.recognized.forEach(student => {
                        // Add to set with unique key to avoid duplicates
                        allMarkedStudents.add(JSON.stringify(student));
                    });
                    totalPhotosProcessed++;
                    toast.success(`Photo ${i + 1}/${selectedFiles.length}: Processed`);
                } else if (response.recognized) {
                    // Even if response.success is false, if students were recognized, add them
                    response.recognized.forEach(student => {
                        allMarkedStudents.add(JSON.stringify(student));
                    });
                    totalPhotosProcessed++;
                    toast.success(`Photo ${i + 1}/${selectedFiles.length}: Processed`);
                } else {
                    totalPhotosProcessed++;
                    toast.info(`Photo ${i + 1}/${selectedFiles.length}: No new students found`);
                }
            } catch (error) {
                totalPhotosProcessed++;
                toast.error(`Photo ${i + 1}: Error processing`);
            }
        }

        setLoading(false);
        setProcessingIndex(null);
        
        // Convert Set back to array and remove duplicates by studentId
        const uniqueStudents = Array.from(allMarkedStudents)
            .map(s => JSON.parse(s))
            .reduce((acc, student) => {
                const exists = acc.find(s => s.studentId === student.studentId);
                if (!exists) {
                    acc.push(student);
                }
                return acc;
            }, []);

        setMarkedStudents(uniqueStudents);
        setShowResults(true);

        if (onAttendanceMarked) {
            onAttendanceMarked();
        }

        // Auto-scroll to results
        setTimeout(() => {
            document.querySelector('#results-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="space-y-6 py-4">
            {/* Active Scoped Batch Indicator */}
            {selectedBatch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
                        <span className="font-semibold text-blue-200">
                            Biometric Scope: {selectedBatch.branch} Year {selectedBatch.academicYear} — Sec {selectedBatch.section} ({selectedBatch.subsection})
                        </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                        Photos matched strictly against students in this batch
                    </span>
                </div>
            ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
                    ⚠️ Please select an authorized batch above before uploading photos.
                </div>
            )}

            {/* File Upload Section */}
            <div
                className="relative cursor-pointer rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center transition-all hover:border-blue-500 hover:bg-zinc-900/50"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <Upload className="mx-auto mb-3 h-12 w-12 text-green-400" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                    Click to upload classroom photos
                </h3>
                <p className="text-sm text-zinc-400">
                    Supports JPG, PNG, WEBP • Max 10MB per image
                </p>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-zinc-100">
                            {selectedFiles.length} Photo(s) Selected
                        </h3>
                        <button
                            onClick={clearAll}
                            disabled={loading}
                            className="text-sm text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                            Clear All
                        </button>
                    </div>

                    {/* Image Previews Grid */}
                    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {previews.map((preview, index) => (
                            <div key={index} className="group relative overflow-hidden rounded-lg bg-zinc-800">
                                <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="h-32 w-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                                            const newPreviews = previews.filter((_, i) => i !== index);
                                            setSelectedFiles(newFiles);
                                            setPreviewers(newPreviews);
                                        }}
                                        disabled={loading}
                                        className="rounded-full bg-red-500 p-2 hover:bg-red-600 disabled:opacity-50"
                                    >
                                        <X className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                                {processingIndex === index && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                        <Loader className="h-6 w-6 animate-spin text-green-400" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Process Button */}
                    <button
                        onClick={processAllPhotos}
                        disabled={loading || selectedFiles.length === 0}
                        className="w-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 font-semibold text-zinc-950 transition-all hover:from-green-400 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader className="h-5 w-5 animate-spin" />
                                Processing Photo {processingIndex + 1} of {selectedFiles.length}
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                Process All Photos
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Results Section - Only Marked Students */}
            {showResults && markedStudents.length > 0 && (
                <div id="results-section" className="rounded-2xl border border-green-900/30 bg-green-950/20 p-6">
                    <div className="mb-6">
                        <div className="mb-4 flex items-center gap-2">
                            <CheckCircle className="h-6 w-6 text-green-400" />
                            <h3 className="text-xl font-semibold text-green-400">
                                Students Marked ({markedStudents.length})
                            </h3>
                        </div>

                        <div className="space-y-2">
                            {markedStudents.map((student, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-lg border border-green-800/50 bg-green-900/10 px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-green-400" />
                                        <div>
                                            <p className="font-medium text-green-300">{student.name}</p>
                                            <p className="text-xs text-green-200">ID: {student.studentId}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-green-400">
                                            {Math.round(student.confidence * 100)}%
                                        </p>
                                        <p className="text-xs text-green-300">Confidence</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showResults && markedStudents.length === 0 && (
                <div id="results-section" className="rounded-2xl border border-green-900/30 bg-green-950/20 p-6 text-center">
                    <AlertCircle className="mx-auto mb-3 h-8 w-8 text-green-400" />
                    <p className="text-green-300">No students recognized in the photos</p>
                </div>
            )}
        </div>
    );
};

export default PhotoUpload;
