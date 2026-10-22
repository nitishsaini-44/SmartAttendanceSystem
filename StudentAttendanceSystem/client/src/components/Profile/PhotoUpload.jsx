import React, { useState, useRef } from 'react';
import teacherService from '../../services/teacherService';
import { useAuth } from '../../context/AuthContext';
import { Camera, Upload, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const PhotoUpload = ({ onSuccess, onCancel }) => {
    const { teacher, updateTeacher } = useAuth();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error('File size must be less than 5MB');
                return;
            }

            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file) {
            toast.error('Please select a photo');
            return;
        }

        setLoading(true);
        try {
            const response = await teacherService.uploadPhoto(file);
            updateTeacher({ ...teacher, profilePhoto: response.profilePhoto });
            toast.success('Photo uploaded successfully!');
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload photo');
        } finally {
            setLoading(false);
        }
    };

    const clearSelection = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="card max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2 text-teal-700" />
                Upload Profile Photo
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center">
                    {preview ? (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
                            />
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-40 h-40 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Click to upload</p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <p className="text-xs text-gray-400 mt-2">Max file size: 5MB</p>
                </div>

                <div className="flex gap-3">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 btn-secondary"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!file || loading}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="h-5 w-5" />
                                Upload Photo
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PhotoUpload;