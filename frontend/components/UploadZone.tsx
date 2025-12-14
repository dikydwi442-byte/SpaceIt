"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    isLoading: boolean;
    multiple?: boolean;
    onMultipleFiles?: (files: File[]) => void;
}

export function UploadZone({ onFileSelect, isLoading, multiple = false, onMultipleFiles }: UploadZoneProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            if (multiple && onMultipleFiles) {
                onMultipleFiles(acceptedFiles);
            } else {
                onFileSelect(acceptedFiles[0]);
            }
        }
    }, [onFileSelect, multiple, onMultipleFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: multiple,
        disabled: isLoading,
    });

    return (
        <div
            {...getRootProps()}
            className={twMerge(
                'border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-5 group relative overflow-hidden',
                isDragActive
                    ? 'border-primary bg-primary/10 scale-[1.02]'
                    : 'border-border/50 hover:border-primary/50 hover:bg-muted/20',
                isLoading && 'opacity-50 cursor-not-allowed'
            )}
        >
            {/* Animated gradient border on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-xl"></div>
            </div>

            <input {...getInputProps()} />

            <div className={twMerge(
                "relative p-5 rounded-2xl transition-all duration-300",
                isDragActive
                    ? "bg-primary/20 scale-110"
                    : "bg-muted/30 group-hover:bg-primary/10 group-hover:scale-105"
            )}>
                {isLoading ? (
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : isDragActive ? (
                    <UploadCloud className="w-10 h-10 text-primary animate-bounce" />
                ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
            </div>

            <div className="text-center space-y-2 relative z-10">
                <p className="text-lg font-semibold text-foreground">
                    {isLoading
                        ? 'Processing...'
                        : isDragActive
                            ? 'Drop your image here'
                            : multiple
                                ? 'Drop images here or click to upload'
                                : 'Drop your image here or click to upload'
                    }
                </p>
                <p className="text-sm text-muted-foreground">
                    {multiple
                        ? 'Supports: PNG, JPG, JPEG, WEBP • Max 20 files'
                        : 'Supports: PNG, JPG, JPEG, WEBP'
                    }
                </p>
            </div>

            {!isLoading && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <UploadCloud className="w-4 h-4" />
                    Select {multiple ? 'Files' : 'File'}
                </div>
            )}
        </div>
    );
}
