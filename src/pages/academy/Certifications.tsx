import { useState, useEffect, useCallback, MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACADEMY_CERTIFICATIONS } from '../../academy-data';
import { Award, ShieldCheck, Search, Loader2, CheckCircle2, XCircle, ChevronRight, Milestone } from 'lucide-react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { HapticButton } from '../../components/HapticButton';

interface VerifyResult {
  valid: boolean;
  credentialId?: string;
  studentName?: string;
  courseTitle?: string;
  issuedAt?: string;
}

// 3D Tilt Card Component
function TiltCard({ cert }: { cert: any }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" style={{ transform: "translateZ(-50px)" }} />
      <div className="flex flex-col h-full" style={{ transform: "translateZ(50px)" }}>
        <div className="h-48 relative overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <img src={cert.image} alt={cert.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-widest font-black rounded-lg shadow-sm">
              Official Credential
            </span>
          </div>
        </div>
        <div className="p-8 flex flex-col flex-1 bg-white dark:bg-slate-900">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">{cert.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed flex-1">{cert.description}</p>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prerequisites</div>
            <ul className="text-xs font-semibold text-slate-700 dark:text-slate-300 space-y-2">
              {cert.prerequisites.map((prereq: string) => (
                <li key={prereq} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> <span className="leading-tight">{prereq}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exam Fee</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">${cert.price}</span>
            </div>
            <button
              disabled
              title="Exam registration is being finalized - check back soon"
              className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm cursor-not-allowed border border-slate-200 dark:border-slate-700"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CertificationsComponent() {
  const [searchParams] = useSearchParams();
  const [credentialId, setCredentialId] = useState(searchParams.get('verify') || '');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | 'not_found' | null>(null);

  const runVerify = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(id.trim())}`);
      if (res.status === 404) {
        setResult('not_found');
        return;
      }
      const data = await res.json() as VerifyResult;
      setResult(data);
    } catch {
      setResult('not_found');
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get('verify');
    if (fromUrl) runVerify(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    runVerify(credentialId);
  };

  return (
    <div className="pt-24 pb-24 min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-100/40 dark:bg-indigo-950/30 border border-indigo-500/15 mb-4">
            SpotCLM Credentials
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Stand Out With <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-sky-500">Official Certifications</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Validate your expertise and advance your career with industry-recognized credentials from SpotCLM Academy.
          </p>
        </div>

        {/* 1. Available Certifications (Top Priority) */}
        <div className="mb-24 perspective-1000">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {ACADEMY_CERTIFICATIONS.map((cert) => (
              <TiltCard key={cert.id} cert={cert} />
            ))}
          </div>
        </div>

        {/* 2. Certification Roadmap */}
        <div className="mb-24 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-12 text-slate-900 dark:text-white">The Path to Mastery</h2>
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-indigo-500 to-sky-400 dark:from-indigo-900 dark:via-indigo-600 dark:to-sky-600 -translate-y-1/2 z-0 hidden md:block" />
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-4 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl mb-4">
                  <span className="font-black text-xl">1</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Learn</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Complete the required course pathways and bootcamps.</p>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-4 border-indigo-300 dark:border-indigo-700/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl mb-4">
                  <span className="font-black text-xl">2</span>
                </div>
                <h3 className="font-bold text-lg mb-2">Practice</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Build real workflows in our sandbox environments.</p>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 border-4 border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">Get Certified</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pass the proctored exam and earn your digital badge.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Verification Tool (Moved Below) */}
        <div className="bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-12 max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center mb-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-600 dark:text-slate-400 shadow-inner mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Verify a Credential</h2>
            <p className="text-sm text-slate-500 max-w-md">
              Enter a certificate ID below to confirm its authenticity and view the details of the credential holder.
            </p>
          </div>
          
          <form onSubmit={handleVerify} className="relative z-10 max-w-lg mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={credentialId}
                  onChange={e => setCredentialId(e.target.value)}
                  placeholder="CERT-A1B2C3D4E5"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-base font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="px-8 py-3.5 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 text-white dark:text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </form>

          {result === 'not_found' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 rounded-xl px-4 py-3 max-w-lg mx-auto">
              <XCircle className="w-5 h-5 shrink-0" /> No certificate found for that credential ID.
            </div>
          )}
          {result && result !== 'not_found' && (
            <div className={`mt-6 flex items-start gap-4 text-sm rounded-xl px-6 py-5 border max-w-lg mx-auto shadow-sm ${
              result.valid
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40'
            }`}>
              {result.valid ? <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500" /> : <XCircle className="w-6 h-6 mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" />}
              <div>
                <p className={`font-black text-lg mb-1 ${result.valid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {result.valid ? 'Official Credential Verified' : 'Unverified Credential'}
                </p>
                {result.valid && (
                  <div className="text-slate-600 dark:text-slate-400 mt-2 space-y-1">
                    <p>Awarded to: <span className="font-bold text-slate-900 dark:text-white">{result.studentName}</span></p>
                    <p>Course: <span className="font-bold text-slate-900 dark:text-white">{result.courseTitle}</span></p>
                    {result.issuedAt && <p>Date: <span className="font-medium">{new Date(result.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
