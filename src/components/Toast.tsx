import { Toaster as SonnerToaster } from 'sonner';

export function Toast() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: 'premium-glass-card rounded-card border border-slate-700/50 shadow-floating',
        style: {
          background: 'rgba(6, 8, 16, 0.95)',
          backdropFilter: 'blur(12px)',
          color: '#fff',
        },
        classNames: {
          toast: 'premium-glass-card',
          title: 'text-sm font-bold text-white',
          description: 'text-xs text-slate-400',
          success: 'text-emerald-400',
          error: 'text-red-400',
          warning: 'text-amber-400',
          info: 'text-indigo-400',
        },
      }}
    />
  );
}
