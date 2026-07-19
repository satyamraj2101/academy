import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'spotclm_cookie_consent';

export type CookieConsentValue = 'accepted' | 'declined' | null;

export function getStoredCookieConsent(): CookieConsentValue {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'declined' ? v : null;
}

interface CookieConsentProps {
  onDecision: (value: 'accepted' | 'declined') => void;
}

export function CookieConsentBanner({ onDecision }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getStoredCookieConsent();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  const decide = (value: 'accepted' | 'declined') => {
    window.localStorage.setItem(STORAGE_KEY, value);
    onDecision(value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[70]"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-card shadow-floating p-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-control bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Cookie className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">We use a minimal set of cookies</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Essential cookies keep the site working. Our live chat widget (Tawk.to) is optional and only loads if you accept — you can change this anytime.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => decide('accepted')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-control transition-colors cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={() => decide('declined')}
                className="flex-1 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider py-2.5 rounded-control transition-colors cursor-pointer"
              >
                Necessary only
              </button>
            </div>
            <a href="/privacy-policy" className="block text-center text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2">
              Read our Privacy Policy
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
