import { useState } from 'react';

export function useImageProcessor() {
    const [isLoading, setIsLoading] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const processImage = async (file: File) => {
        setIsLoading(true);
        setError(null);
        setResultImage(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/remove-bg', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to process image');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setResultImage(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setResultImage(null);
        setError(null);
    };

    return {
        processImage,
        resultImage,
        isLoading,
        error,
        reset,
    };
}
