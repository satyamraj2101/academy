import React from 'react';
import { HapticButton } from './HapticButton';

/* ==========================================================================
   Button — the one true CTA.
   Three variants, two sizes. Primary = navy→sky gradient (the brand action
   color), secondary = outline, ghost = text-level. All share the control
   radius, elevation behavior, and focus treatment from the design tokens.
   ========================================================================== */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider rounded-control transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white shadow-raised hover:shadow-floating',
  secondary:
    'border-2 border-indigo-600 text-indigo-600 dark:text-indigo-300 dark:border-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-500 dark:hover:text-white',
  ghost:
    'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
};

const sizes: Record<Size, string> = {
  md: 'px-6 py-3 text-xs',
  lg: 'px-8 py-4 text-xs',
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => (
  <HapticButton className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
    {children}
  </HapticButton>
);
