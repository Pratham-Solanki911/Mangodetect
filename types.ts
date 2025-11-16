export type Language = 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'gu';

export type Product = {
  name: string;
  usage: string;
};

export type Cure = {
  products: Product[];
  preventativeMeasures: string;
};

export interface AnalysisResult {
  objectType: 'leaf' | 'fruit' | 'other';
  isHealthy: boolean;
  diseaseName: string | null;
  commonName: string | null;
  description: string;
  cure: Cure | null;
}

export interface GroundingSource {
    web?: {
        uri: string;
        title: string;
    }
}