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
  <div className="w-full mt-24 mb-12 px-4 sm:px-8 md:px-12 lg:px-16">
    <div className="w-full mx-auto rounded-feature bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 p-8 md:p-16 text-center relative overflow-hidden shadow-floating">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Ready to transform your Legal Ops?</h2>
        <p className="text-slate-400 text-sm md:text-lg leading-relaxed">
          Stop struggling with generic deployments. Let our certified engineers configure a CLM environment that actually maps to your business velocity.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <HapticButton 
            onClick={() => onOpenProposalModal(serviceName)}
            className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-xs rounded-control shadow-raised shadow-white/10 transition-all hover:scale-105"
          >
            Request Custom Proposal
          </HapticButton>
          <HapticButton 
            onClick={() => window.location.href = '/contact'}
            className="px-8 py-4 bg-transparent border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-bold uppercase tracking-widest text-xs rounded-control transition-all"
          >
            Speak to an Architect
          </HapticButton>
        </div>
      </div>
    </div>
  </div>
);
