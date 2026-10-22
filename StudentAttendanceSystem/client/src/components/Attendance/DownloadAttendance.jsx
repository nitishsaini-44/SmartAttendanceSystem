import React, { useState } from 'react';
import attendanceService from '../../services/attendanceService';
import { Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const DownloadAttendance = () => {
    const [activeTab, setActiveTab] = useState('single');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            let responseData;
            let filename;

            if (activeTab === 'single') {
                responseData = await attendanceService.downloadAttendanceCSV(date);
                filename = `attendance_${date}.csv`;
            } else {
                responseData = await attendanceService.downloadAttendanceCSVRange(fromDate, toDate);
                filename = `attendance_${fromDate}_to_${toDate}.csv`;
            }

            // Check if response data is valid
            if (!responseData) {
                toast.error('Failed to retrieve attendance data');
                setLoading(false);
                return;
            }

            // Ensure we have a proper Blob
            let blob;
            if (responseData instanceof Blob) {
                blob = responseData;
            } else {
                // Convert ArrayBuffer, string, or other types to Blob
                blob = new Blob([responseData], { type: 'text/csv' });
            }

            // Read the text to check if it's a JSON error response
            const text = await blob.text();
            
            if (text.startsWith('{') && text.includes('success')) {
                try {
                    const errorData = JSON.parse(text);
                    if (errorData.success === false) {
                        toast.error(errorData.message || 'Failed to download attendance');
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    // Not JSON, continue with download
                }
            }

            // Download the file
            const downloadBlob = new Blob([text], { type: 'text/csv' });
            const url = window.URL.createObjectURL(downloadBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Attendance CSV downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            if (error.message) {
                toast.error(error.message);
            } else {
                toast.error('Failed to download attendance');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <h2 className="text-section mb-4 flex items-center text-zinc-100">
                <Download className="h-5 w-5 mr-2 text-zinc-100" />
                Download Attendance
            </h2>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 mb-6">
                <button
                    onClick={() => setActiveTab('single')}
                    className={`flex-1 py-3 text-center font-medium transition-colors ${
                        activeTab === 'single'
                            ? 'text-zinc-100 border-b-2 border-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Single Date
                </button>
                <button
                    onClick={() => setActiveTab('range')}
                    className={`flex-1 py-3 text-center font-medium transition-colors ${
                        activeTab === 'range'
                            ? 'text-zinc-100 border-b-2 border-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date Range
                </button>
            </div>

            <div className="space-y-4">
                {/* Single Date Tab */}
                {activeTab === 'single' && (
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Select Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>
                )}

                {/* Date Range Tab */}
                {activeTab === 'range' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                From Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                To Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                    </>
                )}

                <button onClick={handleDownload} disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2">
                    {loading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Download className="h-5 w-5" />
                            Download CSV
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default DownloadAttendance;