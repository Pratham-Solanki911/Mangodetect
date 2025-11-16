import type { Language, AnalysisResult, GroundingSource } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const analyzeImageWithGemini = async (
    base64Image: string,
    mimeType: string,
    language: Language
): Promise<{ result: AnalysisResult; sources: GroundingSource[] }> => {

    try {
        const response = await fetch(`${API_URL}/api/analyze-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Image,
                mimeType,
                language,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        return { result: data.result, sources: data.sources };
    } catch (error) {
        console.error("Failed to analyze image:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to connect to the analysis server. Please ensure the backend is running.");
    }
};
