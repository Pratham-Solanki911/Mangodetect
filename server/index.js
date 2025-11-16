import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for images

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Image analysis endpoint
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { base64Image, mimeType, language } = req.body;

        if (!base64Image || !mimeType || !language) {
            return res.status(400).json({
                error: 'Missing required fields: base64Image, mimeType, or language'
            });
        }

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
                tools: [{ googleSearch: {} }],
            },
        });

        // Clean and parse the response
        const cleanedJson = response.text.replace(/^```json\s*|```\s*$/g, '');
        const result = JSON.parse(cleanedJson);
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        res.json({ result, sources });
    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({
            error: 'Failed to analyze image',
            message: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});
