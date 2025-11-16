import React from 'react';
import type { AnalysisResult, GroundingSource } from '../types';

interface AnalysisReportProps {
    result: AnalysisResult;
    sources: GroundingSource[];
    t: (key: any) => string;
}

const InfoCard: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-green-800 border-b pb-2 mb-3">{title}</h3>
        {children}
    </div>
);

const AnalysisReport: React.FC<AnalysisReportProps> = ({ result, sources, t }) => {
    
    const getStatusChip = (isHealthy: boolean) => {
        return isHealthy
            ? <span className="px-3 py-1 bg-green-200 text-green-800 text-sm font-semibold rounded-full">{t('healthy')}</span>
            : <span className="px-3 py-1 bg-red-200 text-red-800 text-sm font-semibold rounded-full">{t('diseased')}</span>;
    };

    const getObjectType = (type: 'leaf' | 'fruit' | 'other') => {
        const text = { leaf: t('leaf'), fruit: t('fruit'), other: t('other') }[type];
        return <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-sm font-semibold rounded-full">{text}</span>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center text-gray-800">{t('analysisReport')}</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
                 <InfoCard title={t('objectType')}>
                    {getObjectType(result.objectType)}
                </InfoCard>
                <InfoCard title={t('status')}>
                    {getStatusChip(result.isHealthy)}
                </InfoCard>
            </div>

            {!result.isHealthy && result.diseaseName && (
                 <InfoCard title={t('diseaseName')}>
                    <p className="text-lg font-medium text-gray-700">{result.commonName} <span className="italic text-gray-500">({result.diseaseName})</span></p>
                </InfoCard>
            )}

            <InfoCard title={t('description')}>
                <p className="text-gray-600 leading-relaxed">{result.description}</p>
            </InfoCard>

            {!result.isHealthy && result.cure && (
                 <InfoCard title={t('recommendedTreatments')}>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-700">{t('products')} &amp; {t('usageGuidelines')}</h4>
                            <ul className="mt-2 space-y-3 list-disc list-inside text-gray-600">
                                {result.cure.products.map((p, i) => (
                                    <li key={i}>
                                        <span className="font-medium">{p.name}:</span> {p.usage}
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold text-gray-700">{t('preventativeMeasures')}</h4>
                            <p className="mt-2 text-gray-600">{result.cure.preventativeMeasures}</p>
                        </div>
                    </div>
                </InfoCard>
            )}

            {sources.length > 0 && (
                 <InfoCard title={t('dataSources')}>
                    <ul className="space-y-2">
                        {sources.filter(s => s.web?.uri).map((source, index) => (
                            <li key={index} className="truncate">
                                <a href={source.web!.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline hover:text-blue-800 transition">
                                    {source.web!.title || source.web!.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
            )}
        </div>
    );
};

export default AnalysisReport;
