"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, Loader2, Info } from "lucide-react";
import { api } from "@/lib/api";

interface UpscalePanelProps {
    file: File;
    originalUrl: string;
    onProcessed: (url: string) => void;
    processedUrl: string | null;
}

export function UpscalePanel({ file, originalUrl, onProcessed, processedUrl }: UpscalePanelProps) {
    const [scale, setScale] = useState(2);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{ original: string; upscaled: string } | null>(null);

    const handleUpscale = async () => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("scale", scale.toString());

        try {
            const response = await fetch(api.upscale, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to upscale image");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            onProcessed(url);

            // Get dimensions from original image
            const img = new window.Image();
            img.src = originalUrl;
            img.onload = () => {
                setDimensions({
                    original: `${img.width} × ${img.height}`,
                    upscaled: `${Math.round(img.width * scale)} × ${Math.round(img.height * scale)}`,
                });
            };
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Preview */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Original</h3>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                        <Image src={originalUrl} alt="Original" fill className="object-contain" />
                    </div>
                </div>
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Upscaled {scale}x {dimensions && `(${dimensions.upscaled})`}
                    </h3>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                        {processedUrl ? (
                            <Image src={processedUrl} alt="Upscaled" fill className="object-contain" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Maximize2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
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
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Scale Factor</label>
                        <span className="text-2xl font-bold gradient-text">{scale}x</span>
                    </div>

                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1x</span>
                        <span>5x</span>
                        <span>10x</span>
                    </div>
                </div>

                {/* Quick select buttons */}
                <div className="flex flex-wrap gap-2">
                    {[2, 4, 6, 8, 10].map((s) => (
                        <button
                            key={s}
                            onClick={() => setScale(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${scale === s
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                }`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <p>Higher scale factors produce larger images but may take longer to process.</p>
                        {dimensions && (
                            <p className="mt-1 text-foreground">
                                Output size: <strong>{dimensions.upscaled}</strong> pixels
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleUpscale}
                    disabled={isLoading}
                    className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Upscaling...
                        </>
                    ) : (
                        <>
                            <Maximize2 className="w-5 h-5" />
                            Upscale to {scale}x
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
