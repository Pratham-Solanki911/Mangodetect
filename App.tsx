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
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 z-40"
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
                <div className="text-center py-10">
                    <SpinnerIcon />
                    <p className="mt-4 text-lg text-gray-700 font-semibold">{t('analyzing')}</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="text-center py-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Error! </strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={handleReset} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition">
                        {t('tryAgain')}
                    </button>
                </div>
            );
        }
        if (analysisResult) {
            return (
                <>
                    <AnalysisReport result={analysisResult} sources={groundingSources} t={t} />
                    <div className="text-center mt-8">
                         <button onClick={handleReset} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition">
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
        <div className="min-h-screen flex flex-col">
            <Header language={language} setLanguage={setLanguage} t={t} />
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