import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

/* ==========================================================================
   THE CONTRACT LINE — SpotCLM's signature motif.
   One flowing path representing a contract's journey (intake → review →
   signature → renewal), drawn once when it enters the viewport.

   Two treatments:
   - <HeroContractLine />  : large ambient version behind the homepage hero
   - <SectionDivider />    : thin four-node divider between major sections
   Both are decorative (aria-hidden) and inherit reduced-motion behavior from
   the global <MotionConfig reducedMotion="user">.
   ========================================================================== */

const NODE_COLORS = ['#3959aa', '#0284c7', '#0ea5e9', '#38bdf8'];

export const SectionDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  // Gentle wave through four evenly spaced nodes
  const d = 'M 10 20 C 90 4, 150 36, 250 20 S 410 4, 490 20 S 650 36, 730 20 S 890 4, 990 20';
  const nodes = [
    { cx: 250, cy: 20 },
    { cx: 490, cy: 20 },
    { cx: 730, cy: 20 },
    { cx: 990, cy: 20 },
  ];

  return (
    <div ref={ref} aria-hidden="true" className={`w-full max-w-4xl mx-auto px-6 select-none ${className}`}>
      <svg viewBox="0 0 1000 40" fill="none" className="w-full h-8 overflow-visible">
        <motion.path
          d={d}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-indigo-300 dark:text-slate-700"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r="4.5"
            fill={NODE_COLORS[i]}
            initial={{ scale: 0, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: 0.35 * (i + 1) * 0.9, duration: 0.35, ease: 'backOut' }}
          />
        ))}
        {/* origin dot */}
        <motion.circle
          cx="10" cy="20" r="3"
          className="fill-slate-300 dark:fill-slate-600"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.3 }}
        />
      </svg>
    </div>
  );
};

export const HeroContractLine: React.FC = () => {
  // Ambient, low-contrast journey line flowing behind the hero content.
  const d =
    'M -40 420 C 140 380, 200 250, 380 260 S 640 380, 820 300 S 1120 140, 1300 190 S 1520 300, 1700 240';
  const nodes = [
    { cx: 380, cy: 260 },
    { cx: 820, cy: 300 },
    { cx: 1300, cy: 190 },
  ];

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg viewBox="0 0 1600 640" preserveAspectRatio="xMidYMid slice" fill="none" className="w-full h-full">
        <motion.path
          d={d}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-indigo-400/25 dark:text-sky-400/15"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.3 }}
        />
        {/* slow flowing dash on top of the drawn line for quiet "life" */}
        <path
          d={d}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 90"
          className="text-sky-500/40 dark:text-sky-300/30 hero-line-flow"
        />
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r="5"
            fill={NODE_COLORS[i]}
            fillOpacity={0.5}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9 + i * 0.5, duration: 0.4, ease: 'backOut' }}
          />
        ))}
      </svg>
    </div>
  );
};
