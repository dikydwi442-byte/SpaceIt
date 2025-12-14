"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ImageComparisonSlider } from "@/components/ImageComparisonSlider";
import { UpscalePanel } from "@/components/UpscalePanel";
import { EditPanel } from "@/components/EditPanel";
import { CompressPanel } from "@/components/CompressPanel";
import { BatchPanel } from "@/components/BatchPanel";
import { api } from "@/lib/api";
import {
  Eraser,
  Maximize2,
  Sliders,
  FileDown,
  Layers,
  Rocket,
  Download,
  RefreshCw,
  XCircle
} from "lucide-react";

type TabType = "remove-bg" | "upscale" | "edit" | "compress" | "batch";

const tabs = [
  { id: "remove-bg" as const, label: "Remove BG", icon: Eraser },
  { id: "upscale" as const, label: "Upscale", icon: Maximize2 },
  { id: "edit" as const, label: "Edit", icon: Sliders },
  { id: "compress" as const, label: "Compress", icon: FileDown },
  { id: "batch" as const, label: "Batch", icon: Layers },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("remove-bg");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setCurrentFile(file);
    setProcessedImage(null);
    setError(null);

    // Auto-process for remove-bg tab
    if (activeTab === "remove-bg") {
      processRemoveBg(file);
    }
  }, [activeTab]);

  const processRemoveBg = async (file: File) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(api.removeBg, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process image");

      const blob = await response.blob();
      setProcessedImage(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setCurrentFile(null);
    setError(null);
  };

  const handleProcessed = (url: string) => {
    setProcessedImage(url);
  };

  return (
    <main className="min-h-screen space-bg">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight gradient-text mb-3">
            SpaceIT
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Professional image processing tools powered by AI.
            Remove backgrounds, upscale, edit, compress, and batch process your images.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setProcessedImage(null);
              }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 border
                ${activeTab === tab.id
                  ? "tab-active text-white"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="glass rounded-2xl p-6 sm:p-8">
          {activeTab === "batch" ? (
            <BatchPanel />
          ) : !originalImage ? (
            <div className="max-w-2xl mx-auto">
              <UploadZone onFileSelect={handleFileSelect} isLoading={isLoading} />
              {error && (
                <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Result Area */}
              {activeTab === "remove-bg" && (
                <>
                  <ImageComparisonSlider
                    imageBefore={originalImage}
                    imageAfter={processedImage || originalImage}
                    isLoading={isLoading}
                  />
                  {error && (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              )}

              {activeTab === "upscale" && currentFile && (
                <UpscalePanel
                  file={currentFile}
                  originalUrl={originalImage}
                  onProcessed={handleProcessed}
                  processedUrl={processedImage}
                />
              )}

              {activeTab === "edit" && currentFile && (
                <EditPanel
                  file={currentFile}
                  originalUrl={originalImage}
                  onProcessed={handleProcessed}
                  processedUrl={processedImage}
                />
              )}

              {activeTab === "compress" && currentFile && (
                <CompressPanel
                  file={currentFile}
                  originalUrl={originalImage}
                  onProcessed={handleProcessed}
                  processedUrl={processedImage}
                />
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-xl border border-border/30">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Upload New Image
                </button>
                {processedImage && (
                  <div className="flex gap-3">
                    <a
                      href={originalImage}
                      download="original.png"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-background/50 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      Original
                    </a>
                    <a
                      href={processedImage}
                      download="spaceit-processed.png"
                      className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-muted-foreground text-sm">
          <p>SpaceIT • Advanced Image Processing Platform</p>
        </footer>
      </div>
    </main>
  );
}
