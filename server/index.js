import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Console styling for better visibility
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const log = {
    info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    request: (msg) => console.log(`${colors.magenta}[REQUEST]${colors.reset} ${msg}`),
};

console.log('\n' + '='.repeat(60));
log.info('Starting Mango Guard Backend Server...');
console.log('='.repeat(60) + '\n');

// Validate API key on startup
if (!process.env.GEMINI_API_KEY) {
    log.error('GEMINI_API_KEY environment variable is not set');
    log.warning('Please create a .env file with GEMINI_API_KEY=your_api_key');
    process.exit(1);
}

log.success('GEMINI_API_KEY found and loaded');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
log.success('Google GenAI client initialized');

// Middleware
app.use(cors());
log.info('CORS enabled for all origins');

app.use(express.json({ limit: '10mb' }));
log.info('JSON body parser configured (limit: 10mb)');

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    log.request(`${req.method} ${req.path} - ${timestamp}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    log.success('Health check requested');
    res.json({ status: 'ok', message: 'Server is running' });
});

// Image analysis endpoint
app.post('/api/analyze-image', async (req, res) => {
    const requestId = Date.now().toString(36);
    log.info(`[${requestId}] Starting image analysis...`);

    try {
        const { base64Image, mimeType, language } = req.body;

        if (!base64Image || !mimeType || !language) {
            log.error(`[${requestId}] Missing required fields`);
            log.error(`[${requestId}] base64Image: ${!!base64Image}, mimeType: ${!!mimeType}, language: ${!!language}`);
            return res.status(400).json({
                error: 'Missing required fields: base64Image, mimeType, or language'
            });
        }

        log.info(`[${requestId}] Request validated - Language: ${language}, MIME: ${mimeType}`);
        log.info(`[${requestId}] Image size: ${(base64Image.length / 1024).toFixed(2)} KB`);

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

        log.info(`[${requestId}] Sending request to Gemini AI...`);
        const startTime = Date.now();

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.success(`[${requestId}] Received response from Gemini AI (${duration}s)`);

        // Clean and parse the response
        log.info(`[${requestId}] Parsing AI response...`);
        const cleanedJson = response.text.replace(/^```json\s*|```\s*$/g, '');

        let result;
        try {
            result = JSON.parse(cleanedJson);
            log.success(`[${requestId}] Successfully parsed JSON response`);
        } catch (parseError) {
            log.error(`[${requestId}] Failed to parse JSON response`);
            log.error(`[${requestId}] Raw response: ${response.text.substring(0, 200)}...`);
            throw new Error(`JSON parsing failed: ${parseError.message}`);
        }

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        log.info(`[${requestId}] Found ${sources.length} grounding sources`);

        log.success(`[${requestId}] Analysis complete - Disease: ${result.diseaseName || 'None'}`);
        res.json({ result, sources });
    } catch (error) {
        log.error(`[${requestId}] Error during image analysis`);
        log.error(`[${requestId}] Error type: ${error.constructor.name}`);
        log.error(`[${requestId}] Error message: ${error.message}`);

        if (error.stack) {
            log.error(`[${requestId}] Stack trace:`);
            console.error(error.stack);
        }

        res.status(500).json({
            error: 'Failed to analyze image',
            message: error.message,
            type: error.constructor.name
        });
    }
});

// Error handling for unhandled routes
app.use((req, res) => {
    log.warning(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        availableEndpoints: [
            'GET /health',
            'POST /api/analyze-image'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    log.error('Unhandled error in Express:');
    log.error(err.message);
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    log.success(`Backend server running on http://localhost:${PORT}`);
    log.success('API Key configured: Yes');
    console.log('\n' + colors.cyan + 'Available endpoints:' + colors.reset);
    console.log(`  ${colors.green}GET${colors.reset}  http://localhost:${PORT}/health`);
    console.log(`  ${colors.green}POST${colors.reset} http://localhost:${PORT}/api/analyze-image`);
    console.log('\n' + '='.repeat(60) + '\n');
    log.info('Server is ready to accept requests');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        log.error(`Port ${PORT} is already in use`);
        log.warning('Please try one of the following:');
        console.log('  1. Stop the other process using this port');
        console.log('  2. Use a different port: PORT=3002 npm run server');
    } else {
        log.error('Server error:');
        console.error(error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        log.success('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log.info('\nSIGINT signal received: closing HTTP server');
    server.close(() => {
        log.success('HTTP server closed');
        process.exit(0);
    });
});
