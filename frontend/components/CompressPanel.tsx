"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FileDown, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";

interface CompressPanelProps {
    file: File;
    originalUrl: string;
    onProcessed: (url: string) => void;
    processedUrl: string | null;
}

type FormatType = "jpeg" | "png" | "webp";

const formats: { id: FormatType; label: string; description: string }[] = [
    { id: "jpeg", label: "JPEG", description: "Best for photos, smaller size" },
    { id: "png", label: "PNG", description: "Lossless, supports transparency" },
    { id: "webp", label: "WebP", description: "Modern format, best compression" },
];

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function CompressPanel({ file, originalUrl, onProcessed, processedUrl }: CompressPanelProps) {
    const [quality, setQuality] = useState(85);
    const [format, setFormat] = useState<FormatType>("jpeg");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [originalSize] = useState(file.size);
    const [compressedSize, setCompressedSize] = useState<number | null>(null);

    const handleCompress = async () => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("quality", quality.toString());
        formData.append("format", format);

        try {
            const response = await fetch(api.compress, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to compress image");

            const blob = await response.blob();
            setCompressedSize(blob.size);
            const url = URL.createObjectURL(blob);
            onProcessed(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const savings = compressedSize
        ? Math.round((1 - compressedSize / originalSize) * 100)
        : null;

    return (
        <div className="space-y-6">
            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Original</h3>
                        <span className="text-xs font-mono text-muted-foreground">{formatBytes(originalSize)}</span>
                    </div>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                        <Image src={originalUrl} alt="Original" fill className="object-contain" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground">Compressed</h3>
                        {compressedSize && (
                            <span className="text-xs font-mono text-primary">
                                {formatBytes(compressedSize)}
                                {savings !== null && savings > 0 && (
                                    <span className="ml-2 text-green-500">-{savings}%</span>
                                )}
                            </span>
                        )}
                    </div>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                        {processedUrl ? (
                            <Image src={processedUrl} alt="Compressed" fill className="object-contain" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <FileDown className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Preview will appear here</p>
                                </div>
                            </div>
                        )}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-muted/10 rounded-xl p-6 border border-border/30 space-y-6">
                {/* Format Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Output Format</label>
                    <div className="grid sm:grid-cols-3 gap-3">
                        {formats.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFormat(f.id)}
                                className={`p-4 rounded-xl text-left transition-all border ${format === f.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border/50 hover:border-border hover:bg-muted/20"
                                    }`}
                            >
                                <p className="font-semibold">{f.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Quality</label>
                        <span className="text-2xl font-bold gradient-text">{quality}%</span>
                    </div>

                    <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value))}
                        className="w-full h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low (smaller file)</span>
                        <span>High (better quality)</span>
                    </div>
                </div>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "Web", quality: 75 },
                        { label: "Balanced", quality: 85 },
                        { label: "High Quality", quality: 95 },
                    ].map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setQuality(preset.quality)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${quality === preset.quality
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                }`}
                        >
                            {preset.label} ({preset.quality}%)
                        </button>
                    ))}
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <p>
                            Compression reduces file size while maintaining visual quality.
                            WebP offers the best size/quality ratio for modern browsers.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleCompress}
                    disabled={isLoading}
                    className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Compressing...
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            Compress Image
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
