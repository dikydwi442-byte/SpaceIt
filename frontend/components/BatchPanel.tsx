"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "./UploadZone";
import {
    Layers,
    Loader2,
    Download,
    X,
    Eraser,
    Maximize2,
    Sliders,
    FileDown,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";

type OperationType = "remove-bg" | "upscale" | "edit" | "compress";

interface FileItem {
    file: File;
    url: string;
    status: "pending" | "processing" | "done" | "error";
}

interface ProcessedFile {
    filename: string;
    mimeType: string;
    data: string; // base64
}

const operations = [
    { id: "remove-bg" as const, label: "Remove Background", icon: Eraser },
    { id: "upscale" as const, label: "Upscale", icon: Maximize2 },
    { id: "edit" as const, label: "Edit", icon: Sliders },
    { id: "compress" as const, label: "Compress", icon: FileDown },
];

export function BatchPanel() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [operation, setOperation] = useState<OperationType>("remove-bg");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

    // Settings
    const [scale, setScale] = useState(2);
    const [quality, setQuality] = useState(85);
    const [format, setFormat] = useState("jpeg");
    const [brightness, setBrightness] = useState(1);
    const [contrast, setContrast] = useState(1);
    const [saturation, setSaturation] = useState(1);

    const handleFilesSelect = useCallback((selectedFiles: File[]) => {
        const newFiles = selectedFiles.slice(0, 20).map((file) => ({
            file,
            url: URL.createObjectURL(file),
            status: "pending" as const,
        }));
        setFiles(newFiles);
        setProcessedFiles([]);
        setError(null);
    }, []);

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const downloadFile = (processedFile: ProcessedFile) => {
        // Convert base64 to blob
        const byteCharacters = atob(processedFile.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: processedFile.mimeType });

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = processedFile.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadAllFiles = () => {
        processedFiles.forEach((file, index) => {
            // Stagger downloads to prevent browser blocking
            setTimeout(() => downloadFile(file), index * 300);
        });
    };

    const handleBatchProcess = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setProcessedFiles([]);

        const formData = new FormData();
        files.forEach((f) => {
            formData.append("files", f.file);
        });
        formData.append("operation", operation);
        formData.append("scale", scale.toString());
        formData.append("quality", quality.toString());
        formData.append("format", format);
        formData.append("brightness", brightness.toString());
        formData.append("contrast", contrast.toString());
        formData.append("saturation", saturation.toString());

        try {
            // Update file status to processing
            setFiles((prev) => prev.map((f) => ({ ...f, status: "processing" })));

            const response = await fetch(api.batch, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to process batch");

            const data = await response.json();
            setProcessedFiles(data.files);

            // Update file status to done
            setFiles((prev) => prev.map((f) => ({ ...f, status: "done" })));
            setProgress(100);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            setFiles((prev) => prev.map((f) => ({ ...f, status: "error" })));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setFiles([]);
        setProcessedFiles([]);
        setError(null);
        setProgress(0);
    };

    return (
        <div className="space-y-6">
            {files.length === 0 ? (
                <UploadZone
                    onFileSelect={() => { }}
                    onMultipleFiles={handleFilesSelect}
                    isLoading={false}
                    multiple={true}
                />
            ) : (
                <>
                    {/* File Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">
                                {files.length} file{files.length > 1 ? "s" : ""} selected
                            </h3>
                            <button
                                onClick={handleReset}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                            {files.map((item, index) => (
                                <div
                                    key={index}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group"
                                >
                                    <Image
                                        src={item.url}
                                        alt={`File ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />

                                    {/* Status overlay */}
                                    {item.status === "processing" && (
                                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                        </div>
                                    )}
                                    {item.status === "done" && (
                                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        </div>
                                    )}
                                    {item.status === "error" && (
                                        <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                        </div>
                                    )}

                                    {/* Remove button */}
                                    {!isProcessing && (
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Operation Selection */}
                    <div className="bg-muted/10 rounded-xl p-6 border border-border/30 space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">Operation</label>
                            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {operations.map((op) => (
                                    <button
                                        key={op.id}
                                        onClick={() => setOperation(op.id)}
                                        disabled={isProcessing}
                                        className={`p-4 rounded-xl text-left transition-all border flex items-center gap-3 ${operation === op.id
                                            ? "border-primary bg-primary/10"
                                            : "border-border/50 hover:border-border hover:bg-muted/20"
                                            } disabled:opacity-50`}
                                    >
                                        <op.icon className="w-5 h-5 text-primary" />
                                        <span className="font-medium text-sm">{op.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Operation-specific settings */}
                        {operation === "upscale" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Scale Factor</label>
                                    <span className="font-bold text-primary">{scale}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={scale}
                                    onChange={(e) => setScale(parseInt(e.target.value))}
                                    className="w-full h-2"
                                    disabled={isProcessing}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Uses multi-step upscaling for high quality results
                                </p>
                            </div>
                        )}

                        {operation === "compress" && (
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Quality</label>
                                        <span className="font-bold text-primary">{quality}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={quality}
                                        onChange={(e) => setQuality(parseInt(e.target.value))}
                                        className="w-full h-2"
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-medium">Format</label>
                                    <div className="flex gap-2">
                                        {["jpeg", "png", "webp"].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFormat(f)}
                                                disabled={isProcessing}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${format === f
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted/30 hover:bg-muted/50"
                                                    } disabled:opacity-50`}
                                            >
                                                {f.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {operation === "edit" && (
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium">Brightness</label>
                                        <span className="text-xs text-muted-foreground">{brightness.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="2"
                                        step="0.1"
                                        value={brightness}
                                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                                        className="w-full h-2"
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium">Contrast</label>
                                        <span className="text-xs text-muted-foreground">{contrast.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="2"
                                        step="0.1"
                                        value={contrast}
                                        onChange={(e) => setContrast(parseFloat(e.target.value))}
                                        className="w-full h-2"
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium">Saturation</label>
                                        <span className="text-xs text-muted-foreground">{saturation.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={saturation}
                                        onChange={(e) => setSaturation(parseFloat(e.target.value))}
                                        className="w-full h-2"
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Progress */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Processing...</span>
                                    <span className="font-medium">{progress}%</span>
                                </div>
                                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full progress-bar rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Processed files list */}
                        {processedFiles.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-green-500 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Processed Files ({processedFiles.length})
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {processedFiles.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                                        >
                                            <span className="text-sm truncate flex-1 mr-3">{file.filename}</span>
                                            <button
                                                onClick={() => downloadFile(file)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                <Download className="w-3 h-3" />
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            {processedFiles.length > 0 ? (
                                <button
                                    onClick={downloadAllFiles}
                                    className="flex-1 py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Download All ({processedFiles.length} files)
                                </button>
                            ) : (
                                <button
                                    onClick={handleBatchProcess}
                                    disabled={isProcessing || files.length === 0}
                                    className="flex-1 py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing {files.length} files...
                                        </>
                                    ) : (
                                        <>
                                            <Layers className="w-5 h-5" />
                                            Process {files.length} file{files.length > 1 ? "s" : ""}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
