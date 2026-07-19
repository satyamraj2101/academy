import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Award, Settings, LifeBuoy, X, Home, Command } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [open]);

  const items = [
    { title: 'Home', path: '/', icon: Home, category: 'Navigation' },
    { title: 'Course Catalog', path: '/courses', icon: BookOpen, category: 'Navigation' },
    { title: 'Student Dashboard', path: '/dashboard', icon: Command, category: 'Navigation' },
    { title: 'Certifications', path: '/certifications', icon: Award, category: 'Navigation' },
    { title: 'Settings & Profile', path: '/settings', icon: Settings, category: 'Account' },
    { title: 'Help & Support', path: '/support', icon: LifeBuoy, category: 'Account' },
  ];

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search courses, certs, or settings..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white text-lg placeholder-slate-400"
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 dark:group-hover:text-indigo-400 transition-colors">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-400">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] border border-slate-300 dark:border-slate-700">↑↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] border border-slate-300 dark:border-slate-700">Enter</kbd> to select</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] border border-slate-300 dark:border-slate-700">Esc</kbd> to close</span>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
