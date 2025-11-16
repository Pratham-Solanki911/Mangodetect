import { GoogleGenAI } from "@google/genai";
import type { Language, AnalysisResult, GroundingSource } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function cleanJsonString(jsonStr: string): string {
    return jsonStr.replace(/^```json\s*|```\s*$/g, '');
}

export const analyzeImageWithGemini = async (
    base64Image: string,
    mimeType: string,
    language: Language
): Promise<{ result: AnalysisResult; sources: GroundingSource[] }> => {
    
    const prompt = `You are an expert agricultural botanist specializing in mango diseases. Analyze the provided image. Your entire response MUST be a single, valid JSON object and nothing else. Do not wrap the JSON in markdown backticks.

The user's preferred language for all text in the response is "${language}".

The JSON object must strictly adhere to the following schema:
{
  "objectType": "leaf" | "fruit" | "other",
  "isHealthy": boolean,
  "diseaseName": string | null, // Scientific name
  "commonName": string | null, // Common name in the user's language
  "description": string, // Detailed description in the user's language
  "cure": {
    "products": [
      {
        "name": string, // Product name
        "usage": string // Usage instructions in the user's language
      }
    ],
    "preventativeMeasures": string // Preventative measures in the user's language
  } | null
}

Instructions:
1. Identify the main object in the image (mango leaf, mango fruit, or other).
2. Determine if the object is healthy.
3. If it is diseased, identify the disease by its scientific name and its common name in "${language}".
4. Provide a detailed description of the disease's symptoms visible in the image, written in "${language}".
5. Use your search capabilities to find and recommend at least two modern, effective treatment products. Provide their names and usage instructions in "${language}".
6. Suggest general preventative measures for the identified disease, also in "${language}".
7. If the object is healthy or not a mango leaf/fruit, the "cure" field should be null.`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = { text: prompt };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    try {
        const cleanedJson = cleanJsonString(response.text);
        const result: AnalysisResult = JSON.parse(cleanedJson);
        const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { result, sources };
    } catch (e) {
        console.error("Failed to parse Gemini response:", e);
        console.error("Raw response text:", response.text);
        throw new Error("Failed to parse AI response. The format was invalid.");
    }
};
