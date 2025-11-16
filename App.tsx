import React, { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import ImageInput from './components/ImageInput';
import AnalysisReport from './components/AnalysisReport';
import Chatbot from './components/Chatbot';
import { analyzeImageWithGemini } from './services/geminiService';
import type { Language, AnalysisResult, GroundingSource } from './types';
import { translations } from './utils/translations';

const SpinnerIcon = () => (
    <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const MicFAB = ({ onClick, t }: { onClick: () => void, t: (key: any) => string }) => (
    <button
        onClick={onClick}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-green-600 to-emerald-600 text-white p-5 rounded-full shadow-2xl hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-green-300 z-40 glow-button"
        aria-label={t('askAssistant')}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 10.12V15a.5.5 0 01-1 0v-1.121A5.002 5.002 0 015 9V7a.5.5 0 011 0v2a4 4 0 008 0V7a.5.5 0 011 0v2a5.002 5.002 0 01-4 4.908z" clipRule="evenodd" />
        </svg>
    </button>
);


const App: React.FC = () => {
    const [language, setLanguage] = useState<Language>('en');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const t = useCallback((key: keyof typeof translations['en']) => {
        return translations[language][key] || translations['en'][key];
    }, [language]);

    const handleReset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setAnalysisResult(null);
        setGroundingSources([]);
        setImageFile(null);
    }, []);

    const handleAnalyze = useCallback(async (file: File) => {
        setImageFile(file);
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setGroundingSources([]);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Image = (reader.result as string).split(',')[1];
            try {
                const { result, sources } = await analyzeImageWithGemini(base64Image, file.type, language);
                setAnalysisResult(result);
                setGroundingSources(sources);
            } catch (err: any) {
                setError(`${t('errorOccurred')} ${t('tryAgain')}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError(t('errorOccurred'));
            setIsLoading(false);
        };
    }, [language, t]);
    
    const MainContent = useMemo(() => {
        if (isLoading) {
            return (
                <div className="text-center py-16 modern-card rounded-3xl max-w-2xl mx-auto p-12">
                    <div className="flex justify-center mb-6">
                        <SpinnerIcon />
                    </div>
                    <p className="text-2xl text-gray-800 font-bold mb-2">{t('analyzing')}</p>
                    <p className="text-gray-600">Our AI is examining your mango image...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-center py-12 max-w-2xl mx-auto">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 text-red-800 px-8 py-8 rounded-3xl shadow-xl" role="alert">
                        <div className="text-5xl mb-4">⚠️</div>
                        <strong className="font-bold text-xl block mb-2">Error!</strong>
                        <span className="block text-base mb-6">{error}</span>
                        <button onClick={handleReset} className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all transform hover:scale-105 shadow-lg">
                            {t('tryAgain')}
                        </button>
                    </div>
                </div>
            );
        }
        if (analysisResult) {
            return (
                <>
                    <AnalysisReport result={analysisResult} sources={groundingSources} t={t} />
                    <div className="text-center mt-10">
                         <button onClick={handleReset} className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all transform hover:scale-105 glow-button text-lg">
                            {t('analyzeAnotherImage')}
                        </button>
                    </div>
                </>
            );
        }
        if (!imageFile) {
            return <ImageInput onAnalyze={handleAnalyze} t={t} />;
        }
        return null;
    }, [isLoading, error, analysisResult, imageFile, groundingSources, t, handleAnalyze, handleReset]);

    return (
        <div className="min-h-screen flex flex-col hero-gradient">
            <Header language={language} setLanguage={setLanguage} t={t} />

            {/* Hero Section - Only show when no image is uploaded */}
            {!imageFile && !analysisResult && !isLoading && (
                <section className="py-12 px-4">
                    <div className="container mx-auto text-center">
                        <h2 className="text-5xl md:text-6xl font-extrabold gradient-text mb-4 fade-in-up">
                            {t('title')}
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-700 mb-8 fade-in-up delay-100 max-w-3xl mx-auto">
                            Advanced AI-powered disease detection for healthier mango crops
                        </p>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                            <div className="modern-card rounded-2xl p-6 card-hover fade-in-up delay-200">
                                <div className="text-4xl mb-3">🔍</div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Instant Detection</h3>
                                <p className="text-gray-600 text-sm">Upload or capture an image for immediate AI analysis</p>
                            </div>
                            <div className="modern-card rounded-2xl p-6 card-hover fade-in-up delay-300">
                                <div className="text-4xl mb-3">🎯</div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Accurate Results</h3>
                                <p className="text-gray-600 text-sm">Powered by Google's Gemini AI for precise disease identification</p>
                            </div>
                            <div className="modern-card rounded-2xl p-6 card-hover fade-in-up delay-400">
                                <div className="text-4xl mb-3">💊</div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Treatment Advice</h3>
                                <p className="text-gray-600 text-sm">Get actionable recommendations for disease management</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <main className="flex-grow container mx-auto p-4 md:p-8">
                {MainContent}
            </main>

            <MicFAB onClick={() => setIsChatOpen(true)} t={t}/>
            <Chatbot
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                language={language}
                t={t}
                analysisResult={analysisResult}
            />
        </div>
    );
};

export default App;