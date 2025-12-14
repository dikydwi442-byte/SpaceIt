"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MoveHorizontal, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageComparisonSliderProps {
    imageBefore: string;
    imageAfter: string;
    isLoading?: boolean;
}

export function ImageComparisonSlider({
    imageBefore,
    imageAfter,
    isLoading = false,
}: ImageComparisonSliderProps) {
    const [isResizing, setIsResizing] = useState(false);
    const [comparisonPosition, setComparisonPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback(() => setIsResizing(true), []);
    const handleMouseUp = useCallback(() => setIsResizing(false), []);

    const handleMove = useCallback(
        (clientX: number) => {
            if (!isResizing || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = clientX - rect.left;
            const newPosition = (x / rect.width) * 100;
            setComparisonPosition(Math.min(100, Math.max(0, newPosition)));
        },
        [isResizing]
    );

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
        const handleEnd = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleEnd);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("touchend", handleEnd);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleEnd);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleEnd);
        };
    }, [isResizing, handleMove]);

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border/50 select-none group cursor-ew-resize bg-muted/20"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Processing image...</p>
                    </div>
                </div>
            )}

            {/* Before Image (Background/Original) */}
            <div className="absolute inset-0">
                <Image
                    src={imageBefore}
                    alt="Original"
                    fill
                    className="object-contain"
                    priority
                />
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm z-10">
                    Original
                </div>
            </div>

            {/* After Image (Foreground/Processed) - clipped via width */}
            <div
                className="absolute inset-0 overflow-hidden"
                style={{
                    clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)`
                }}
            >
                {/* Checkerboard pattern for transparency */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#1a1a2e_25%,transparent_25%,transparent_75%,#1a1a2e_75%,#1a1a2e),linear-gradient(45deg,#1a1a2e_25%,transparent_25%,transparent_75%,#1a1a2e_75%,#1a1a2e)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-30"></div>
                <Image
                    src={imageAfter}
                    alt="Processed"
                    fill
                    className="object-contain"
                    priority
                />
                <div className="absolute top-4 right-4 bg-primary/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm z-10">
                    Processed
                </div>
            </div>

            {/* Handle */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
                style={{ left: `${comparisonPosition}%` }}
            >
                <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center -ml-5 border-2 border-primary/50">
                    <MoveHorizontal className="w-5 h-5 text-primary" />
                </div>
            </div>
        </div>
    );
}
