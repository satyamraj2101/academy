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
import { SelectedProps, getIconComponent, PremiumHero, CertifiedPartnerBanner, BottomCTA } from './shared';
import { Button } from '../components/Button';

import { useNavigate } from 'react-router-dom';

/* ==========================================================================
   404 — NOT FOUND (replaces the old silent homepage catch-all, which served
   soft-404s at every unknown URL)
   ========================================================================== */
export const NotFoundComponent: React.FC<Partial<SelectedProps>> = ({ onNavigate }) => {
  const navigate = useNavigate();
  
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      // In the academy app, map these to actual routes
      const routeMap: Record<string, string> = {
        'home': '/',
        'services': '/courses',
        'contact': '/contact' // Or perhaps just mailto
      };
      navigate(routeMap[path] || '/');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[70vh] px-6 pt-[120px] pb-16 text-center">
      <Helmet>
        <title>Page Not Found | SpotCLM</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <span className="text-[80px] md:text-[120px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-600 to-sky-400 select-none">
        404
      </span>
      <h1 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        This page doesn't exist
      </h1>
      <p className="mt-3 max-w-md text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
        The link may be outdated, or the address was mistyped. Here's where you probably want to go:
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button onClick={() => handleNavigate('home')}>
          <Home className="w-4 h-4" /> Back to Home
        </Button>
        <Button variant="secondary" onClick={() => handleNavigate('services')}>
          <Search className="w-4 h-4" /> Explore Catalog
        </Button>
      </div>

      <button
        onClick={() => handleNavigate('contact')}
        className="mt-8 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Mail className="w-3.5 h-3.5" /> Think this is a broken link? Tell us <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
};
