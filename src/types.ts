export type ActivePage =
  | 'home'
  | 'services'
  | 'implementation'
  | 'integrations'
  | 'support'
  | 'about'
  | 'pricing'
  | 'faq'
  | 'contact'
  | 'blog'
  | 'careers'
  | 'training'
  | 'products'
  | 'academy'
  | 'courses'
  | 'certifications'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'privacy'
  | 'terms';

export type Language = 'en' | 'es' | 'de';

export type LightingMode = 'light' | 'dark';

export interface ServiceItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  bullets: string[];
  link: ActivePage;
}

export interface PlatformItem {
  id: string;
  name: string;
  specs: string;
  description: string;
  logo?: string;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface EnquiryData {
  id?: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  service: string;
  timeline: string;
  budget: string;
  howHeard: string;
  description: string;
  syncStatus: 'synced' | 'pending';
  createdAt: string;
}

export interface AssessmentResult {
  readinessScore: number;
  recommendedPlatform: string;
  summary: string;
  timelineEstimate: string;
  budgetRange: string;
  integrationPriorities: string[];
  tacticalRoadmap: string[];
}
