import React from 'react';
import type { Language } from '../types';
import { languageNames } from '../utils/translations';

interface HeaderProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: any) => string;
}

// Self-contained SVG Logo component
const Logo = () => (
    <svg className="h-10 w-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Mango Guard Logo">
        <defs>
            <linearGradient id="mangoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#FFC107', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FF9800', stopOpacity: 1 }} />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#4CAF50" stroke="#388E3C" strokeWidth="4" />
        <g transform="rotate(30 50 50) scale(0.9) translate(5, 5)">
          <path 
              d="M50,20 C75,20 85,40 75,65 C65,90 35,90 25,65 C15,40 25,20 50,20 Z" 
              fill="url(#mangoGradient)"
          />
          <path 
              d="M62,38 C60,30 50,28 50,28 C55,35 60,37 62,38 Z"
              fill="#66BB6A"
              stroke="#388E3C"
              strokeWidth="2.5"
          />
        </g>
    </svg>
);


const Header: React.FC<HeaderProps> = ({ language, setLanguage, t }) => {
    return (
        <header className="gradient-bg shadow-lg p-6">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="float-animation">
                        <Logo />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white drop-shadow-md">{t('title')}</h1>
                        <p className="text-sm text-white/90 font-medium">{t('subtitle')}</p>
                    </div>
                </div>
                <div className="relative">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="appearance-none bg-white/95 backdrop-blur-sm border-2 border-white/50 rounded-lg py-2.5 pl-4 pr-10 text-gray-800 font-medium hover:bg-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition shadow-md"
                    >
                        {(Object.keys(languageNames) as Language[]).map(lang => (
                            <option key={lang} value={lang}>{languageNames[lang]}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                         <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;