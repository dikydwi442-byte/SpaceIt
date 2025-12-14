"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Sliders,
    Loader2,
    Sun,
    Contrast,
    Palette,
    Sparkles,
    RotateCcw,
    RotateCw,
    FlipHorizontal,
    FlipVertical,
    RefreshCcw
} from "lucide-react";
import { api } from "@/lib/api";

interface EditPanelProps {
    file: File;
    originalUrl: string;
    onProcessed: (url: string) => void;
    processedUrl: string | null;
}

interface EditSettings {
    brightness: number;
    contrast: number;
    saturation: number;
    sharpness: number;
    rotate: number;
    flipHorizontal: boolean;
    flipVertical: boolean;
}

const defaultSettings: EditSettings = {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    sharpness: 1,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
};

export function EditPanel({ file, originalUrl, onProcessed, processedUrl }: EditPanelProps) {
    const [settings, setSettings] = useState<EditSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEdit = async () => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("brightness", settings.brightness.toString());
        formData.append("contrast", settings.contrast.toString());
        formData.append("saturation", settings.saturation.toString());
        formData.append("sharpness", settings.sharpness.toString());
        formData.append("rotate", settings.rotate.toString());
        formData.append("flip_horizontal", settings.flipHorizontal.toString());
        formData.append("flip_vertical", settings.flipVertical.toString());

        try {
            const response = await fetch(api.edit, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Failed to edit image");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            onProcessed(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSettings(defaultSettings);
    };

    const updateSetting = (key: keyof EditSettings, value: number | boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const sliders = [
        { key: "brightness" as const, label: "Brightness", icon: Sun, min: 0.2, max: 2, step: 0.1 },
        { key: "contrast" as const, label: "Contrast", icon: Contrast, min: 0.2, max: 2, step: 0.1 },
        { key: "saturation" as const, label: "Saturation", icon: Palette, min: 0, max: 2, step: 0.1 },
        { key: "sharpness" as const, label: "Sharpness", icon: Sparkles, min: 0, max: 2, step: 0.1 },
    ];

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
                    <h3 className="text-sm font-medium text-muted-foreground">Edited</h3>
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                        {processedUrl ? (
                            <Image src={processedUrl} alt="Edited" fill className="object-contain" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Sliders className="w-10 h-10 mx-auto mb-2 opacity-50" />
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
                {/* Sliders */}
                <div className="grid sm:grid-cols-2 gap-6">
                    {sliders.map((slider) => (
                        <div key={slider.key} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <slider.icon className="w-4 h-4 text-primary" />
                                    {slider.label}
                                </label>
                                <span className="text-sm font-mono text-muted-foreground">
                                    {(settings[slider.key] as number).toFixed(1)}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                value={settings[slider.key] as number}
                                onChange={(e) => updateSetting(slider.key, parseFloat(e.target.value))}
                                className="w-full h-2"
                            />
                        </div>
                    ))}
                </div>

                {/* Rotation & Flip */}
                <div className="space-y-3">
                    <label className="text-sm font-medium">Transform</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => updateSetting("rotate", (settings.rotate - 90 + 360) % 360)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Rotate Left
                        </button>
                        <button
                            onClick={() => updateSetting("rotate", (settings.rotate + 90) % 360)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors"
                        >
                            <RotateCw className="w-4 h-4" />
                            Rotate Right
                        </button>
                        <button
                            onClick={() => updateSetting("flipHorizontal", !settings.flipHorizontal)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${settings.flipHorizontal
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 hover:bg-muted/50"
                                }`}
                        >
                            <FlipHorizontal className="w-4 h-4" />
                            Flip H
                        </button>
                        <button
                            onClick={() => updateSetting("flipVertical", !settings.flipVertical)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${settings.flipVertical
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 hover:bg-muted/50"
                                }`}
                        >
                            <FlipVertical className="w-4 h-4" />
                            Flip V
                        </button>
                    </div>
                    {settings.rotate !== 0 && (
                        <p className="text-xs text-muted-foreground">
                            Current rotation: {settings.rotate}°
                        </p>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 py-3 px-6 border border-border rounded-xl font-medium hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={handleEdit}
                        disabled={isLoading}
                        className="flex-[2] py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Sliders className="w-5 h-5" />
                                Apply Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
