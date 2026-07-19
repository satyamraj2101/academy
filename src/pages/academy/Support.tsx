import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, MessageCircle, FileText, Search, ChevronDown } from 'lucide-react';
import { HapticButton } from '../../components/HapticButton';
import { BottomCTA } from '../shared';

const SUPPORT_EMAIL = 'info@spotclm.com';

export function SupportComponent({ onOpenProposalModal }: { onOpenProposalModal: (service?: string) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const faqSectionRef = useRef<HTMLDivElement>(null);

  const faqs = [
    { q: 'How do I access my certificates?', a: 'Once you complete a course or pass an exam, your certificate will automatically appear on the Certifications tab of your Student Dashboard. From there, you can download a PDF or share a direct verification link.' },
    { q: 'Can I retake a certification exam?', a: 'Yes. If you fail an exam, you can retake it after a 24-hour waiting period. Some premium exams may require an additional fee for retakes after the 3rd attempt.' },
    { q: 'How long do I have access to course materials?', a: 'You have lifetime access to the materials for any course you have enrolled in, including future updates to those materials.' },
    { q: 'I encountered a technical issue in the Course Player.', a: 'Please clear your browser cache and disable any ad-blockers that might be interfering with our video delivery network. If the issue persists, submit a ticket below.' }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(search.toLowerCase()) || faq.a.toLowerCase().includes(search.toLowerCase())
  );

  const scrollToFaqs = () => faqSectionRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet><title>Support Portal | SpotCLM Academy</title></Helmet>

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">How can we help?</h1>
          <div className="relative max-w-xl mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for answers..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-lg outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2">Knowledge Base</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">Read our comprehensive guides and documentation.</p>
            <HapticButton onClick={scrollToFaqs} className="text-indigo-600 text-sm font-bold">Browse FAQs &rarr;</HapticButton>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2">Community Forum</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">Ask questions and learn from other CLM professionals.</p>
            <HapticButton disabled title="Coming soon" className="text-slate-400 text-sm font-bold cursor-not-allowed">Coming Soon</HapticButton>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2">Contact Support</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">Can't find what you need? Send us a ticket.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-rose-600 text-sm font-bold hover:underline">Email Us &rarr;</a>
          </div>
        </div>

        <div ref={faqSectionRef} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 scroll-mt-24">
          <h2 className="text-2xl font-black mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {filteredFaqs.map((faq) => {
              const i = faqs.indexOf(faq);
              return (
                <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-bold bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {faq.q}
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ml-3 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 py-4 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredFaqs.length === 0 && (
              <p className="text-center text-slate-400 py-8">No FAQs match "{search}" — try a different search, or <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 hover:underline">email us</a> directly.</p>
            )}
          </div>
        </div>
      </div>
      <BottomCTA onOpenProposalModal={onOpenProposalModal} />
    </div>
  );
}
