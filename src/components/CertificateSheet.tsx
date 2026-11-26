import { Award } from 'lucide-react';

interface Props {
  title: string;
  holder?: string;
  issuedAt: string;
  credentialId: string;
}

/**
 * A certificate drawn as the object it is: a sheet of paper with a ruled frame, the holder's name on a signature line and a round
 * stamp. The one place on the student pages that carries real material; everything around it stays quiet.
 */
export function CertificateSheet({ title, holder, issuedAt, credentialId }: Props) {
  const date = new Date(issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <figure className="m-0 rounded-card border border-slate-200 bg-white p-2 shadow-raised dark:border-slate-700 dark:bg-slate-100">
      <div className="relative flex aspect-[1.414/1] min-h-[200px] flex-col justify-between rounded-control border border-slate-300 px-6 py-5 text-slate-900">
        <div>
          <p className="text-[11px] text-slate-500">SpotCLM Academy</p>
          <p className="mt-1 text-xs text-slate-600">Certificate of completion</p>
        </div>
        <div>
          {holder && <p className="text-lg font-medium leading-tight">{holder}</p>}
          <div className="mt-2 h-px w-3/4 bg-slate-400" />
          <p className="mt-2 text-sm leading-snug text-slate-700">{title}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <figcaption className="min-w-0 font-mono text-[11px] text-slate-500">
            <span className="block">{date}</span>
            <span className="block truncate" title={credentialId}>{credentialId}</span>
          </figcaption>
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 -rotate-6 items-center justify-center rounded-full border border-indigo-700/70 text-indigo-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-700/40">
              <Award className="h-5 w-5" strokeWidth={1.5} />
            </span>
          </span>
        </div>
      </div>
    </figure>
  );
}
