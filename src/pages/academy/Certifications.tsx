import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ACADEMY_CERTIFICATIONS } from '../../academy-data';
import { Search, Loader2, Check, XCircle } from 'lucide-react';
import { CertificateSheet } from '../../components/CertificateSheet';

interface VerifyResult {
  valid: boolean;
  credentialId?: string;
  studentName?: string;
  courseTitle?: string;
  issuedAt?: string;
}

const STEPS = [
  { title: 'Learn', desc: 'Complete the required course pathways and bootcamps.' },
  { title: 'Practice', desc: 'Build real workflows in our sandbox environments.' },
  { title: 'Get certified', desc: 'Pass the proctored exam and earn your digital badge.' },
];

function CertificationCard({ cert }: { cert: any }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-48 shrink-0 bg-slate-100 dark:bg-slate-800">
        <img src={cert.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <h3 className="text-xl font-medium leading-snug text-slate-900 dark:text-white">{cert.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{cert.description}</p>

        <div className="mt-6">
          <p className="text-sm text-slate-500">Prerequisites</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {cert.prerequisites.map((prereq: string) => (
              <li key={prereq} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.5} aria-hidden="true" /> <span>{prereq}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div>
            <p className="text-sm text-slate-500">Exam fee</p>
            <p className="tabular mt-1 text-2xl font-medium text-slate-900 dark:text-white">${cert.price}</p>
          </div>
          <button
            disabled
            title="Exam registration is being finalized. Check back soon."
            className="min-h-[44px] cursor-not-allowed rounded-control border border-slate-200 bg-slate-100 px-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800"
          >
            Coming soon
          </button>
        </div>
      </div>
    </article>
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
    <div className="min-h-screen pb-24 pt-24">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <header className="mb-12 max-w-3xl">
          <h1 className="text-4xl font-medium leading-tight text-slate-900 dark:text-white md:text-5xl">Certifications</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Credentials that show you can deploy and manage CLM. Anyone can check a certificate by its code.
          </p>
        </header>

        <div className="mb-20 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {ACADEMY_CERTIFICATIONS.map((cert) => (
            <CertificationCard key={cert.id} cert={cert} />
          ))}
        </div>

        <section className="mb-20">
          <h2 className="text-2xl font-medium text-slate-900 dark:text-white">The path to a certificate</h2>
          <ol className="mt-8 grid border-t border-slate-200 dark:border-slate-800 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-slate-200 py-6 pr-6 dark:border-slate-800 md:border-r md:pl-6 md:first:pl-0 md:last:border-r-0">
                <p className="font-mono text-sm text-slate-500">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 font-medium text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="verify-title" className="grid gap-10 rounded-feature border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <h2 id="verify-title" className="text-2xl font-medium text-slate-900 dark:text-white">Verify a certificate</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Enter the credential code printed on a certificate to confirm it is genuine and see who it was awarded to.
            </p>

            <form onSubmit={handleVerify} className="mt-6 max-w-lg">
              <label htmlFor="credential" className="text-sm text-slate-500">Credential code</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.5} aria-hidden="true" />
                  <input
                    id="credential"
                    type="text"
                    value={credentialId}
                    onChange={e => setCredentialId(e.target.value)}
                    placeholder="SPC-2026-8F3A21"
                    className="min-h-[48px] w-full rounded-control border border-slate-200 bg-slate-50 pl-10 pr-4 font-mono text-sm outline-none transition-colors focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifying}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-control bg-indigo-600 px-6 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Verify'}
                </button>
              </div>
            </form>

            <div aria-live="polite">
              {result === 'not_found' && (
                <p className="mt-6 flex max-w-lg items-center gap-2 rounded-control border border-slate-200 px-4 py-3 text-sm text-rose-700 dark:border-slate-700 dark:text-rose-400">
                  <XCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" /> No certificate found for that code.
                </p>
              )}
              {result && result !== 'not_found' && !result.valid && (
                <p className="mt-6 max-w-lg rounded-control border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">This certificate could not be verified.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center">
            {result && result !== 'not_found' && result.valid ? (
              <div className="w-full max-w-sm">
                <CertificateSheet title={result.courseTitle || ''} holder={result.studentName} issuedAt={result.issuedAt || new Date().toISOString()} credentialId={result.credentialId || credentialId} />
                <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /> Verified by SpotCLM Academy</p>
              </div>
            ) : (
              <div className="w-full max-w-sm opacity-60" aria-hidden="true">
                <CertificateSheet title="Course title" holder="Name of the holder" issuedAt="2026-01-01T00:00:00Z" credentialId="SPC-0000-000000" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
