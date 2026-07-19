import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EnquiryData } from '../types';
import { HapticButton, playPremiumHapticSound } from './HapticButton';
import { ShieldCheck, CloudLightning, Wifi, WifiOff, RefreshCw, Sparkles } from 'lucide-react';

interface EnquiryFormProps {
  onSuccess?: () => void;
  preselectedService?: string;
  lang: string;
  isInModal?: boolean;
}

export const EnquiryForm: React.FC<EnquiryFormProps> = ({ onSuccess, preselectedService = '', lang, isInModal = false }) => {
  // Offline State variables
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [submitting, setLoading] = useState<boolean>(false);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Form Fields State
  const [fullName, setFullName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [interest, setInterest] = useState<string>(preselectedService || '');
  const [timeline, setTimeline] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [howHeard, setHowHeard] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [agree, setAgree] = useState<boolean>(false);
  const [showOptional, setShowOptional] = useState<boolean>(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Setup online/offline listeners
    if (typeof window === 'undefined') return;
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial count of queued items
    updateQueueCount();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Sync queued items automatically when coming online
  useEffect(() => {
    if (isOnline && queuedCount > 0) {
      triggerSynchronization();
    }
  }, [isOnline]);

  const updateQueueCount = () => {
    try {
      const stored = localStorage.getItem('spotclm_queued_enquiries');
      if (stored) {
        const queue: EnquiryData[] = JSON.parse(stored);
        setQueuedCount(queue.filter(q => q.syncStatus === 'pending').length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const validateForm = (): boolean => {
    const freshErrors: Record<string, string> = {};
    if (!fullName.trim()) freshErrors.fullName = 'Full Name is required';
    if (!email.trim() || !email.includes('@')) freshErrors.email = 'Valid Email is required';
    if (!agree) freshErrors.agree = 'You must agree to be contacted';

    setErrors(freshErrors);
    return Object.keys(freshErrors).length === 0;
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const enquiryRecord: EnquiryData = {
      fullName,
      companyName,
      email,
      phone,
      service: interest,
      timeline,
      budget,
      howHeard,
      description: desc,
      syncStatus: isOnline ? 'synced' : 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      if (isOnline) {
        // Submit directly to express backend
        const response = await fetch('/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enquiryRecord),
        });

        if (!response.ok) {
          throw new Error('API server failed');
        }
      } else {
        // Offline capability: Queue into localStorage
        const stored = localStorage.getItem('spotclm_queued_enquiries');
        const queue: EnquiryData[] = stored ? JSON.parse(stored) : [];
        queue.push(enquiryRecord);
        localStorage.setItem('spotclm_queued_enquiries', JSON.stringify(queue));
        updateQueueCount();

        // Trigger offline message info
        setSyncMessage('Saved locally in pending sync list.');
      }

      playPremiumHapticSound('success');
      setFormSubmitted(true);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.warn('Backend server failed. Falling back to local queue storage.');
      // Auto queue fallback
      const stored = localStorage.getItem('spotclm_queued_enquiries');
      const queue = stored ? JSON.parse(stored) : [];
      enquiryRecord.syncStatus = 'pending';
      queue.push(enquiryRecord);
      localStorage.setItem('spotclm_queued_enquiries', JSON.stringify(queue));
      updateQueueCount();
      setFormSubmitted(true);
      if (onSuccess) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const triggerSynchronization = async () => {
    const stored = localStorage.getItem('spotclm_queued_enquiries');
    if (!stored) return;

    const queue: EnquiryData[] = JSON.parse(stored);
    const pendings = queue.filter(q => q.syncStatus === 'pending');
    if (pendings.length === 0) return;

    setLoading(true);
    let successfullySynced = 0;

    for (const record of pendings) {
      try {
        const response = await fetch('/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        if (response.ok) {
          record.syncStatus = 'synced';
          successfullySynced++;
        }
      } catch (e) {
        console.warn('Sync attempt failed for ' + record.fullName);
      }
    }

    // Update state and persistence
    const updatedQueue = queue.filter(q => q.syncStatus === 'pending');
    localStorage.setItem('spotclm_queued_enquiries', JSON.stringify(updatedQueue));
    updateQueueCount();
    setLoading(false);

    if (successfullySynced > 0) {
      playPremiumHapticSound('success');
      setSyncMessage(`Seamless synchronization completed! ${successfullySynced} queued enquiries sent to SpotCLM global servers.`);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div className="relative">
      {/* Synchronization Notification alert */}
      <AnimatePresence>
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 p-3 rounded-control bg-indigo-600 text-white font-medium text-xs flex items-center justify-between border border-transparent shadow-rest shadow-indigo-500/10"
          >
            <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 shrink-0" /> {syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="font-bold text-[11px] uppercase cursor-pointer hover:opacity-80">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={isInModal ? "w-full" : "w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-feature p-6 md:p-10 shadow-raised"}>

        {/* Connection status rail indicator */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
            {isOnline ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Link Secured & Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-bounce" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Offline Queue Guard On</span>
              </span>
            )}
          </div>
          {queuedCount > 0 && (
            <HapticButton
              onClick={triggerSynchronization}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-100/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-control font-bold text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${submitting ? 'animate-spin' : ''}`} />
              <span>Sync Queued ({queuedCount})</span>
            </HapticButton>
          )}
        </div>

        {formSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center p-8 space-y-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-feature"
          >
            <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-1">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === 'de' ? 'Anfrage erhalten' : lang === 'es' ? 'Consulta Recibida' : 'Thank you for connecting with us!'}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 text-xs max-w-md mx-auto leading-relaxed">
              {lang === 'de'
                ? 'Unsere Berater prüfen Ihr Projekt und melden sich innerhalb von 24-72 Stunden.'
                : lang === 'es'
                ? 'Nuestros asesores estratégicos revisarán su consulta y se comunicarán en 24-72 horas.'
                : 'Our strategic advisors are reviewing your inquiry and will follow up within 24 to 72 hours.'}
            </p>
            <div className="pt-3">
              <HapticButton
                onClick={() => {
                  setFormSubmitted(false);
                  setFullName('');
                  setCompanyName('');
                  setEmail('');
                  setPhone('');
                  setDesc('');
                  setAgree(false);
                }}
                className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] uppercase tracking-wider rounded-control shadow-rest cursor-pointer hover:opacity-90"
              >
                Submit New Inquiry
              </HapticButton>
            </div>
          </motion.div>
        )}
          <form onSubmit={handleEnquirySubmit} className={`space-y-4 ${formSubmitted ? 'opacity-30 pointer-events-none blur-[2px]' : ''}`}>
            
            {/* Row 1: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">{lang === 'es' ? 'Nombre Completo' : 'Full Name'} *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' })); }}
                  className={`w-full bg-white dark:bg-slate-800 border-2 rounded-control px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${
                    errors.fullName ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {errors.fullName && <span className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1 block">{errors.fullName}</span>}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">{lang === 'es' ? 'Correo' : 'Work Email'} *</label>
                <input
                  type="email"
                  required
                  placeholder="client@organization.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                  className={`w-full bg-white dark:bg-slate-800 border-2 rounded-control px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${
                    errors.email ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {errors.email && <span className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1 block">{errors.email}</span>}
              </div>
            </div>

            {/* Row 2: Phone & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">{lang === 'de' ? 'Telefon' : 'Mobile (with country code)'}</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-control px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{lang === 'es' ? 'SITUACIÓN / DETALLES' : 'Project Description'} *</label>
                  <span className={`text-[11px] font-bold ${desc.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{desc.length}/500</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Details of legacy volume, current CRM..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-control px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase hover:underline cursor-pointer">
              {showOptional ? '- Hide Optional Details' : '+ Add Optional Details (Company, Budget, Timeline)'}
            </button>

            <AnimatePresence>
              {showOptional && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Optional Row 1: Company Name & Service of Interest */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">{lang === 'de' ? 'Firmenname' : 'Company Name'}</label>
                      <input
                        type="text"
                        placeholder="Enterprise Operations"
                        value={companyName}
                        onChange={(e) => { setCompanyName(e.target.value); if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' })); }}
                        className={`w-full bg-white dark:bg-slate-800 border-2 rounded-control px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${
                          errors.companyName ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                      {errors.companyName && <span className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1 block">{errors.companyName}</span>}
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">Service of Interest</label>
                      <select
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-control px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                      >
                        <option value="" disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400">Please select...</option>
                        <option value="Implementation" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">CLM Implementation</option>
                        <option value="Integrations" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Integrations & API</option>
                        <option value="Support" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Professional Support</option>
                        <option value="Corporate Training" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Corporate Team Training</option>
                        <option value="Individual Training" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Individual Certification</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Row 2: Timeline & Budget */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">Expected Timeline</label>
                      <select
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-control px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                      >
                        <option value="" disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400">Please select...</option>
                        <option value="ASAP" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ASAP (Immediate kick-off)</option>
                        <option value="1-3 Months" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">1 - 3 Months</option>
                        <option value="3-6 Months" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">3 - 6 Months</option>
                        <option value="Flexible" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Flexible / Reviewing</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wider">Approximate Budget</label>
                      <select
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-control px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                      >
                        <option value="" disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400">Please select...</option>
                        <option value="<$25K" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">&lt; $25,000</option>
                        <option value="25-50K" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">$25,000 - $50,000</option>
                        <option value="50-100K" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">$50,000 - $100,000</option>
                        <option value=">100K" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">$100,000+</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Row 6: Agreement Tik & Button */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agree}
                  onChange={(e) => { setAgree(e.target.checked); if (errors.agree) setErrors(prev => ({ ...prev, agree: '' })); }}
                  className="mt-0.5 cursor-pointer w-4 h-4 accent-indigo-600 focus:ring-2 focus:ring-indigo-500/30 border-2 border-slate-400 dark:border-slate-500 rounded"
                />
                <label htmlFor="agree" className="text-xs font-medium text-slate-600 dark:text-slate-300 select-none leading-normal">
                  {lang === 'de' ? (
                    <>Ich stimme zu, dass SpotCLM meine Kontaktdaten gemäß der <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Datenschutzerklärung</a> speichert und verarbeitet.</>
                  ) : lang === 'es' ? (
                    <>Acepto recibir comunicaciones de estrategia confidencial de acuerdo con nuestra <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Política de Privacidad</a>.</>
                  ) : (
                    <>I consent to receiving confidential strategy communications in compliance with SpotCLM's <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Privacy Policy</a>.</>
                  )}
                </label>
              </div>
              {errors.agree && <span className="text-[11px] text-red-600 dark:text-red-400 font-bold block">{errors.agree}</span>}

              <HapticButton
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-control shadow-raised text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {lang === 'de' ? 'Wird gesendet...' : 'Processing...'}
                  </>
                ) : (
                  <span>{lang === 'de' ? 'Anfrage absenden' : lang === 'es' ? 'Enviar Consulta' : 'Send Project Enquiry'}</span>
                )}
              </HapticButton>
            </div>
          </form>
      </div>
    </div>
  );
};
