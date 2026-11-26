import React, { useState } from 'react';
import { interactiveServices } from '../data/services';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { ActivePage, FAQItem, ServiceItem, PlatformItem } from '../types';
import { translations, serviceItems, platformItems, faqItems, integrationsData } from '../data/translations';
import { HapticButton, playPremiumHapticSound } from '../components/HapticButton';
import { EnquiryForm } from '../components/EnquiryForm';
import { AssessmentTool } from '../components/AssessmentTool';
import { SubscribeForm } from '../components/SubscribeForm';
import {
  Rocket,
  Zap,
  Cable,
  Headphones,
  Users,
  Award,
  Briefcase,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Globe,
  DollarSign,
  ShieldCheck,
  Search,
  CheckCircle,
  HelpCircle,
  CloudSun,
  Terminal,
  Clock,
  Layers,
  FileCheck2,
  Calendar,
  Layers2,
  ChevronDown,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Play,
  Pause,
  GraduationCap,
  Star,
  Server,
  CheckCircle2,
  CreditCard,
  Mail,
  Shield,
  Lock,
  Link,
  Cpu,
  Combine,
  MessageSquare,
  Activity,
  Bell,
  PhoneCall,
  Video,
  FileText,
  Settings,
  Home,
  BarChart3
} from 'lucide-react';

export interface SelectedProps {
  lang: 'en' | 'es' | 'de';
  onNavigate: (page: ActivePage) => void;
  onOpenProposalModal: (service?: string) => void;
  onOpenAssessor: () => void;
  preselectedFaqId?: string | null;
  setPreselectedFaqId?: (id: string | null) => void;
  selectedPlatformId?: string | null;
  setSelectedPlatformId?: (id: string | null) => void;
}

// Icon mapper for Lucide React
export const getIconComponent = (icon: string) => {
  switch (icon) {
    case 'Rocket': return <Rocket className="w-6 h-6" />;
    case 'Cable': return <Cable className="w-6 h-6" />;
    case 'Headphones': return <Headphones className="w-6 h-6" />;
    case 'Users': return <Users className="w-6 h-6" />;
    case 'Award': return <Award className="w-6 h-6" />;
    default: return <Layers className="w-6 h-6" />;
  }
};

/* ==========================================================================
   PREMIUM REUSABLE COMPONENTS FOR SERVICE PAGES
   ========================================================================== */

export const CertifiedPartnerBanner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`w-full bg-slate-900 dark:bg-slate-950 py-4 border-y border-slate-800/50 flex flex-wrap items-center justify-center gap-6 md:gap-12 text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-500 ${className}`}>
    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Certified Leah Partner</span>
    <span className="hidden md:block text-slate-700">•</span>
    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> Ironclad Specialists</span>
    <span className="hidden md:block text-slate-700">•</span>
    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sirion Integrators</span>
    <span className="hidden md:block text-slate-700">•</span>
    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Icertis Configurers</span>
  </div>
);

export const PremiumHero: React.FC<{ 
  kicker: string; 
  title: string; 
  description: string; 
  metric?: string; 
  gradientTheme?: 'indigo' | 'emerald' | 'rose' | 'amber';
}> = ({ kicker, title, description, metric, gradientTheme = 'indigo' }) => {
  const gradients = {
    indigo: 'from-indigo-900/40 via-slate-900 to-slate-950 border-indigo-500/20',
    emerald: 'from-emerald-900/40 via-slate-900 to-slate-950 border-emerald-500/20',
    rose: 'from-rose-900/40 via-slate-900 to-slate-950 border-rose-500/20',
    amber: 'from-amber-900/40 via-slate-900 to-slate-950 border-amber-500/20'
  };
  
  return (
    <div className={`relative w-full rounded-b-feature overflow-hidden bg-gradient-to-br ${gradients[gradientTheme]} border-b mb-12`}>
      {/* Abstract Background Mesh */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent mix-blend-overlay pointer-events-none"></div>
      
      <div className="relative w-full mx-auto px-4 sm:px-8 md:px-12 lg:px-16 pt-[140px] pb-16 md:pt-[180px] md:pb-24">
        <div className="max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className={`px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] md:text-xs uppercase tracking-[0.2em] font-extrabold text-white`}>
              {kicker}
            </span>
            {metric && (
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-[11px] md:text-xs uppercase tracking-widest font-extrabold text-emerald-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {metric}
              </span>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            {title}
          </h1>
          
          <p className="text-sm md:text-xl text-slate-300 leading-relaxed font-light max-w-3xl">
            {description}
          </p>
        </div>
      </div>
      <CertifiedPartnerBanner />
    </div>
  );
};

export const BottomCTA: React.FC<{ 
  onOpenProposalModal: (service?: string) => void;
  serviceName?: string;
}> = ({ onOpenProposalModal, serviceName = '' }) => (
  <div className="w-full mx-auto max-w-[1280px] mt-24 mb-12 px-4 sm:px-6 lg:px-8">
    <div className="rounded-feature border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-8 md:p-12 grid md:grid-cols-[minmax(0,1fr)_auto] gap-8 items-center">
      <div className="max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white">Training a whole team?</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
          Our certified engineers can set up a CLM environment around how your business works, and train your people on it.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <HapticButton
          onClick={() => onOpenProposalModal(serviceName)}
          className="min-h-[48px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-control transition-colors"
        >
          Request a proposal
        </HapticButton>
        <HapticButton
          onClick={() => window.location.href = '/contact'}
          className="min-h-[48px] px-6 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-white dark:hover:bg-slate-800 text-sm font-medium rounded-control transition-colors"
        >
          Speak to an architect
        </HapticButton>
      </div>
    </div>
  </div>
);
