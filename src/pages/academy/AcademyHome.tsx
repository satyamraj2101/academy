import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { HapticButton, playPremiumHapticSound } from '../../components/HapticButton';
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Video,
  Play,
  Briefcase,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  UserPlus,
  Rocket
} from 'lucide-react';
import { BottomCTA } from '../shared';
import { ActivePage } from '../../types';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';

const JOURNEY_STEPS = [
  { icon: UserPlus, title: 'Enroll', desc: 'Pick a role-based track or a single course from the catalog.' },
  { icon: Video, title: 'Learn', desc: 'Work through live sessions, videos, and hands-on labs at your pace.' },
  { icon: CheckCircle2, title: 'Practice', desc: 'Prove your understanding with knowledge checks and graded assignments.' },
  { icon: Award, title: 'Get Certified', desc: 'Pass the certification exam and earn a verifiable, shareable credential.' },
];

export function AcademyHomeComponent({ onNavigate, onOpenProposalModal }: any) {
  const { user } = useAcademy();
  const [activeTab, setActiveTab] = useState(0);
  const [orbitHovered, setOrbitHovered] = useState(false);
  const [catalogStats, setCatalogStats] = useState<{ courses: number, categories: number } | null>(null);

  useEffect(() => {
    academyAPI.courses.list()
      .then((res: any) => {
        if (res?.success && Array.isArray(res.courses)) {
          setCatalogStats({
            courses: res.courses.length,
            categories: new Set(res.courses.map((c: any) => c.category)).size,
          });
        }
      })
      .catch(() => {});
  }, []);

  const tabs = [
    { id: 'live', title: 'Live Sessions', icon: Video, color: 'rose' },
    { id: 'job', title: 'Job Ready', icon: Briefcase, color: 'emerald' },
    { id: 'cert', title: 'Certifications', icon: Award, color: 'amber' },
    { id: 'role', title: 'Role-Based', icon: Users, color: 'indigo' },
  ];

  const activeTabData = [
    {
      title: 'Interactive Live Training Sessions',
      desc: 'Join expert-led cohorts for hands-on CLM configuration. No pre-recorded theory — build real workflows in sandbox environments with certified architects guiding you live.',
      bullets: ['Small Cohort Sizes (<15 students)', 'Live Q&A and Troubleshooting', 'Sandbox Environment Access', 'Direct feedback from Architects'],
      metrics: [
        { label: 'Avg Duration', value: '3 Days', color: '#f43f5e' },
        { label: 'Pass Rate', value: '98%', color: '#f43f5e' }
      ]
    },
    {
      title: 'Job-Ready CLM Career Paths',
      desc: 'Transition into Legal Ops or CLM Administration. Our comprehensive bootcamps teach you exactly what top enterprise employers are looking for in a platform manager.',
      bullets: ['Real-world implementation scenarios', 'Resume and interview prep', 'Direct introduction to partner network', '1-on-1 career coaching'],
      metrics: [
        { label: 'Placement Rate', value: '92%', color: '#10b981' },
        { label: 'Starting Avg', value: '$85k+', color: '#10b981' }
      ]
    },
    {
      title: 'Industry-Recognized Certifications',
      desc: 'Earn verifiable credentials that prove your expertise in deploying and managing enterprise CLM solutions like Leah, Ironclad, and Sirion.',
      bullets: ['Proctored online examinations', 'Shareable digital badges', 'Advanced Administrator tracks', 'Workflow Architect tracks'],
      metrics: [
        { label: 'Certified Pros', value: '500+', color: '#f59e0b' },
        { label: 'Exam Formats', value: '3', color: '#f59e0b' }
      ]
    },
    {
      title: 'Role-Based Team Upskilling',
      desc: 'Tailored learning paths designed specifically for End Users, Legal Administrators, and IT Workflow Architects to ensure maximum platform adoption.',
      bullets: ['Custom corporate training portals', 'Role-specific curriculum', 'Adoption tracking dashboards', 'Post-launch refresher courses'],
      metrics: [
        { label: 'User Adoption', value: '90%+', color: '#6366f1' },
        { label: 'Time-to-Value', value: 'Fast', color: '#6366f1' }
      ]
    }
  ];

  const currentData = activeTabData[activeTab];
  const activeColorHex = tabs[activeTab].color === 'rose' ? '#f43f5e' : tabs[activeTab].color === 'emerald' ? '#10b981' : tabs[activeTab].color === 'amber' ? '#f59e0b' : '#6366f1';

  return (
    <div className="w-full">
      <Helmet>
        <title>SpotCLM Academy | Master Contract Lifecycle Management</title>
        <meta name="description" content="The industry's premier training destination for enterprise CLM professionals. Live sessions, job-ready tracks, and official certifications." />
      </Helmet>

      {/* Full Width Hero Split Layout */}
      <div className="relative w-full flex flex-col min-h-[90vh] bg-surface-50 dark:bg-surface-950 overflow-hidden border-b border-slate-200 dark:border-slate-800 pt-[80px] md:pt-[100px]">
        
        <div className="relative z-10 flex-1 w-full px-4 sm:px-8 md:px-12 lg:px-16 flex flex-col lg:flex-row lg:items-center py-10">
          
          {/* Left Half - Text */}
          <div className="w-full lg:w-1/2 pr-0 lg:pr-12 flex flex-col justify-center text-left relative z-20">
            <span className="text-[11px] uppercase tracking-widest font-extrabold text-indigo-600 dark:text-indigo-400 mb-4 block">
              SpotCLM Academy
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-6">
              Master Contract <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Lifecycle Management.</span>
            </h1>
            <p className="text-sm md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-light mb-8">
              The premier training destination for enterprise professionals. Go from beginner to Certified Architect with our interactive live sessions, job-ready bootcamps, and role-based upskilling.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              <HapticButton
                onClick={() => { playPremiumHapticSound('click'); window.location.href = '/courses'; }}
                className="px-8 py-3.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-control hover:bg-indigo-700 shadow-raised shadow-indigo-500/20"
              >
                Explore Courses
              </HapticButton>
              {!user ? (
                <HapticButton
                  onClick={() => { playPremiumHapticSound('click'); window.location.href = '/login'; }}
                  className="px-8 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-control hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Student Sign In
                </HapticButton>
              ) : (
                <HapticButton
                  onClick={() => { playPremiumHapticSound('click'); window.location.href = '/dashboard'; }}
                  className="px-8 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-control hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Go to Dashboard
                </HapticButton>
              )}
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-rose-500" /> Live Cohorts</span>
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-emerald-500" /> Job Ready</span>
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" /> Certified</span>
            </div>

            {catalogStats && (
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{catalogStats.courses}</span>
                  <span className="ml-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Courses Live</span>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">{catalogStats.categories}</span>
                  <span className="ml-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Learning Tracks</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Half - Animated Knowledge Orbit */}
          <div className="w-full lg:w-1/2 py-12 lg:py-0 flex items-center justify-center relative z-10">
            <div 
              className="relative w-full max-w-[500px] aspect-square overflow-hidden rounded-full border border-slate-200/50 dark:border-slate-800/50 shadow-floating"
              onMouseEnter={() => setOrbitHovered(true)}
              onMouseLeave={() => setOrbitHovered(false)}
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
                   style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.7) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-5 h-5 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
              </motion.div>

              <div className="absolute inset-10 rounded-full border border-slate-300/40 dark:border-slate-700/40" />
              <div className="absolute inset-20 rounded-full border border-slate-300/30 dark:border-slate-700/30" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-raised shadow-indigo-500/30 z-20 cursor-pointer"
                >
                  <GraduationCap className="w-10 h-10 text-white" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works — Learner Journey Diagram */}
      <div className="py-20 px-4 sm:px-8 md:px-12 lg:px-16 w-full max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <span className="inline-block px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-100/40 dark:bg-indigo-950/30 border border-indigo-500/15">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Your Path to Certification
          </h2>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {/* Connecting line, desktop only */}
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200 dark:from-indigo-900 dark:via-indigo-700 dark:to-indigo-900" />

          {JOURNEY_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shadow-raised mb-4">
                  <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white dark:border-slate-950">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[220px]">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Interactive Tabs Section */}
      <div className="py-24 px-4 sm:px-8 md:px-12 lg:px-16 w-full max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-100/40 dark:bg-indigo-950/30 border border-indigo-500/15">
            Academy Pathways
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            How Do You Want to Learn?
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            const colorClass = tab.color === 'rose' ? 'indigo' /* Wait, using indigo for active backgrounds to keep it simple, or custom */ : 'indigo'; 
            
            return (
              <button
                key={tab.id}
                onClick={() => { playPremiumHapticSound('click'); setActiveTab(idx); }}
                className={`p-5 rounded-card flex flex-col gap-3 text-left transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-raised shadow-indigo-500/20 border-indigo-500 scale-[1.02]'
                    : 'bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:scale-[1.01]'
                }`}
              >
                <div className={`w-8 h-8 rounded-control flex items-center justify-center ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">{tab.title}</h3>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-8 md:p-12 rounded-feature bg-white/70 dark:bg-surface-900/40 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl shadow-raised flex flex-col md:flex-row gap-10 items-center justify-between w-full"
          >
            <div className="w-full md:w-7/12 space-y-5">
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">{currentData.title}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {currentData.desc}
              </p>
              <div className="space-y-3 pt-2">
                {currentData.bullets.map((b, i) => (
                  <div key={i} className="flex gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 items-start">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: activeColorHex }} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <HapticButton
                  onClick={() => window.location.href = '/courses'}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest rounded-control hover:opacity-90"
                >
                  View Catalog
                </HapticButton>
              </div>
            </div>

            <div className="w-full md:w-5/12 grid grid-cols-2 gap-4">
               {currentData.metrics.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className="p-5 rounded-card bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 items-center justify-center text-center"
                  >
                    <span className="text-2xl lg:text-3xl font-black" style={{ color: m.color }}>{m.value}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.label}</span>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomCTA onOpenProposalModal={onOpenProposalModal} />
    </div>
  );
}
