import React, { useState } from 'react';

export function SubscribeForm({ source = 'website' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-control bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium w-full md:w-auto">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Thanks for subscribing!
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full md:w-auto gap-1">
      <form onSubmit={handleSubmit} className="flex flex-row gap-2 w-full">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          required
          className="px-4 py-3 rounded-control text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !email}
          className="px-6 py-3 bg-blue-600 text-white rounded-control text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {status === 'loading' ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && (
        <span className="text-xs text-red-500 font-medium px-1">Something went wrong. Please try again.</span>
      )}
    </div>
  );
}
