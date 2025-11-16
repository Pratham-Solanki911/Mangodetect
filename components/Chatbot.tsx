import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import type { Language, AnalysisResult } from '../types';
import { languageNames } from '../utils/translations';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    t: (key: any) => string;
    analysisResult: AnalysisResult | null;
}

// --- Audio Utility Functions ---
// These are defined inside the component module to keep file count low.

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Component ---

const MicIcon: React.FC<{isListening: boolean}> = ({ isListening }) => (
    <div className={`relative flex items-center justify-center h-20 w-20 rounded-full bg-green-500 text-white transition-transform transform hover:scale-110 ${isListening ? 'animate-pulse' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 10.12V15a.5.5 0 01-1 0v-1.121A5.002 5.002 0 015 9V7a.5.5 0 011 0v2a4 4 0 008 0V7a.5.5 0 011 0v2a5.002 5.002 0 01-4 4.908z" clipRule="evenodd" />
        </svg>
    </div>
);

type Transcription = {
    author: 'user' | 'assistant';
    text: string;
};

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, language, t, analysisResult }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    
    const sessionRef = useRef<LiveSession | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const currentInputRef = useRef('');
    const currentOutputRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [transcriptions]);

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setStatus('idle');
    }, []);

    const startSession = useCallback(async () => {
        if (!process.env.API_KEY || status !== 'idle') return;
        
        setStatus('connecting');
        setTranscriptions([]);
        currentInputRef.current = '';
        currentOutputRef.current = '';
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        let systemInstruction = `You are Mango-Mitra, a friendly and knowledgeable AI assistant for mango farmers. Converse with the user in ${languageNames[language]}. Help them with questions about mango cultivation, diseases, and interpreting the analysis results from the app. Keep your answers helpful and easy to understand.`;

        if (analysisResult) {
            const reportContext = JSON.stringify(analysisResult);
            systemInstruction = `You are Mango-Mitra, a friendly and knowledgeable AI assistant for mango farmers. Converse with the user in ${languageNames[language]}. The user has just received the following analysis report for their uploaded image: ${reportContext}. Please use this information as context for your conversation. Do not ask for the disease name or other information if it's already in the report. Greet the user and ask how you can help them understand the report or if they have any other questions.`;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        setStatus('connected');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcriptions
                        if (message.serverContent?.inputTranscription) {
                            currentInputRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputRef.current += message.serverContent.outputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            setTranscriptions(prev => {
                                const newTranscriptions = [...prev];
                                if(currentInputRef.current.trim()) newTranscriptions.push({ author: 'user', text: currentInputRef.current.trim() });
                                if(currentOutputRef.current.trim()) newTranscriptions.push({ author: 'assistant', text: currentOutputRef.current.trim() });
                                return newTranscriptions;
                            });
                            currentInputRef.current = '';
                            currentOutputRef.current = '';
                        }

                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                            const source = outputAudioContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current!.destination);
                            source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API Error:', e);
                        setStatus('error');
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: systemInstruction,
                },
            });

            sessionRef.current = await sessionPromise;

        } catch (err) {
            console.error("Failed to start session:", err);
            setStatus('error');
        }
    }, [language, status, stopSession, analysisResult]);

    useEffect(() => {
        if (isOpen) {
            startSession();
        } else {
            stopSession();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const getStatusText = () => {
        switch (status) {
            case 'connecting': return t('connecting');
            case 'connected': return t('speakNow');
            case 'error': return t('errorOccurred');
            default: return t('chatbotGreeting');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden">
                <header className="p-4 bg-green-700 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('chatbotTitle')}</h2>
                    <button onClick={onClose} className="text-2xl font-light">&times;</button>
                </header>
                <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto bg-green-50 space-y-4">
                    <div className="text-center text-gray-500 text-sm mb-4">{t('chatbotGreeting')}</div>
                    {transcriptions.map((t, i) => (
                        <div key={i} className={`flex ${t.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-xl max-w-xs ${t.author === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                {t.text}
                            </div>
                        </div>
                    ))}
                </div>
                <footer className="p-6 bg-gray-100 flex flex-col items-center justify-center border-t">
                    <MicIcon isListening={status === 'connected'} />
                    <p className="mt-4 text-gray-600 font-medium">{getStatusText()}</p>
                </footer>
            </div>
        </div>
    );
};

export default Chatbot;