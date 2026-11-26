import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { HapticButton, playPremiumHapticSound } from '../../components/HapticButton';
import { Check } from 'lucide-react';
import { BottomCTA } from '../shared';
import { academyAPI } from '../../academy/api';
import { useAcademy } from '../../academy/context';
import { CourseThumbnail } from '../../components/CourseThumbnail';
import { LifecycleLine } from '../../components/LifecycleLine';
import { CertificateSheet } from '../../components/CertificateSheet';

const JOURNEY_STEPS = [
  { title: 'Enroll', desc: 'Pick a role-based track or a single course from the catalog.' },
  { title: 'Learn', desc: 'Work through video lessons and hands-on labs at your own pace.' },
  { title: 'Practice', desc: 'Check your understanding with quizzes and graded assignments.' },
  { title: 'Get certified', desc: 'Finish the course and earn a certificate anyone can verify.' },
];

const PATHWAYS = [
  {
    id: 'live', title: 'Live sessions',
    desc: 'Expert-led cohorts for hands-on CLM configuration. Build real workflows in sandbox environments with certified architects guiding you live.',
    bullets: ['Small cohorts', 'Live Q&A and troubleshooting', 'Sandbox environment access', 'Direct feedback from architects'],
  },
  {
    id: 'job', title: 'Job ready',
    desc: 'Move into legal operations or CLM administration. The bootcamps teach what enterprise employers look for in a platform manager.',
    bullets: ['Real-world implementation scenarios', 'Resume and interview preparation', 'Introductions to our partner network', 'One-to-one career coaching'],
  },
  {
    id: 'cert', title: 'Certifications',
    desc: 'Earn verifiable credentials that show you can deploy and manage enterprise CLM platforms such as Leah, Ironclad and Sirion.',
    bullets: ['Proctored online examinations', 'Shareable digital badges', 'Administrator track', 'Workflow architect track'],
  },
  {
    id: 'role', title: 'Role based',
    desc: 'Learning paths for end users, legal administrators and IT workflow architects, so each team learns what it will actually use.',
    bullets: ['Custom corporate training portals', 'Role-specific curriculum', 'Adoption tracking dashboards', 'Post-launch refresher courses'],
  },
];

export function AcademyHomeComponent(_props: any) {
  const { user } = useAcademy();
  const [activePath, setActivePath] = useState(0);
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

  const path = PATHWAYS[activePath];
  const go = (to: string) => { playPremiumHapticSound('click'); window.location.href = to; };

  return (
    <div className="w-full">
      <Helmet>
        <title>SpotCLM Academy | Master Contract Lifecycle Management</title>
        <meta name="description" content="Contract lifecycle management training for working professionals: video lessons, quizzes, graded assignments and certificates anyone can verify." />
      </Helmet>

      {/* Hero: the copy on one side, the product on the other */}
      <section className="w-full border-b border-slate-200 dark:border-slate-800 pt-[88px] md:pt-[112px] pb-16">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-medium text-slate-900 dark:text-white leading-[1.08] max-w-[16ch]">
              Learn contract lifecycle management
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400 max-w-[36rem]">
              Video lessons, quizzes and graded assignments for legal, procurement and operations teams, from the first request to renewal. Finish a course and earn a certificate anyone can verify.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <HapticButton onClick={() => go('/courses')} className="min-h-[48px] px-6 rounded-control bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                Browse courses
              </HapticButton>
              <HapticButton onClick={() => go(user ? '/dashboard' : '/login')} className="min-h-[48px] px-6 rounded-control border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {user ? 'Go to dashboard' : 'Sign in'}
              </HapticButton>
            </div>
            {catalogStats && (
              <p className="mt-8 font-mono text-sm text-slate-500">
                {catalogStats.courses} course{catalogStats.courses === 1 ? '' : 's'} · {catalogStats.categories} track{catalogStats.categories === 1 ? '' : 's'}
              </p>
            )}
          </div>

          {/* What a learner gets: where they are in a course, and the certificate at the end */}
          <div className="relative mx-auto w-full max-w-[520px] pb-10 sm:pb-16">
            <div className="relative z-10 rounded-card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-raised overflow-hidden sm:w-[78%]">
              <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800">
                <CourseThumbnail title="Introduction to CLM World" category="CLM Fundamentals" />
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500">In progress</p>
                <h2 className="mt-1 font-medium text-slate-900 dark:text-white leading-snug">Introduction to CLM World</h2>
                <LifecycleLine percent={60} labels className="mt-5" label="Example progress through a course" />
              </div>
            </div>
            <div className="absolute z-0 right-0 bottom-0 w-[64%] hidden sm:block">
              <CertificateSheet title="Introduction to CLM World" holder="Your name" issuedAt="2026-11-26T00:00:00Z" credentialId="SPC-2026-0001" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-medium text-slate-900 dark:text-white">From enrolment to certificate</h2>
        <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-200 dark:border-slate-800">
          {JOURNEY_STEPS.map((step, i) => (
            <li key={step.title} className="pt-6 pb-8 pr-6 lg:border-r border-slate-200 dark:border-slate-800 last:border-r-0 lg:pl-6 first:lg:pl-0">
              <p className="font-mono text-sm text-slate-500">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 font-medium text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-[28ch]">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pathways */}
      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-3xl font-medium text-slate-900 dark:text-white">How do you want to learn</h2>
        <div role="tablist" aria-label="Learning pathways" className="mt-8 flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto overflow-y-hidden hide-scrollbar">
          {PATHWAYS.map((p, idx) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={activePath === idx}
              onClick={() => { playPremiumHapticSound('click'); setActivePath(idx); }}
              className={`px-4 min-h-[44px] text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${activePath === idx ? 'border-indigo-600 text-slate-900 font-medium dark:border-indigo-400 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {p.title}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 md:gap-16"
          >
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 max-w-[36rem]">{path.desc}</p>
            <ul className="space-y-3">
              {path.bullets.map(b => (
                <li key={b} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
        <HapticButton onClick={() => go('/courses')} className="mt-10 min-h-[44px] px-5 rounded-control border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          View the catalog
        </HapticButton>
      </section>

      <BottomCTA onOpenProposalModal={_props.onOpenProposalModal} />
    </div>
  );
}
