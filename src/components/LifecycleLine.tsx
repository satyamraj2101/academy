// The signature detail of the student view: progress drawn as the contract lifecycle the courses teach. Five stops (draft, review,
// approve, sign, track) on one hairline, filled in the accent as far as the learner has got. The same stations Soomy visits in the
// lesson videos, so a course's progress reads in the same language as its lessons.
export const LIFECYCLE_STOPS = ['Draft', 'Review', 'Approve', 'Sign', 'Track'] as const;

/** Which stop a progress percentage has reached: 0 to 24 is Draft, 100 is Track. */
export function stopFor(percent: number): number {
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return Math.min(LIFECYCLE_STOPS.length - 1, Math.floor(p / 25));
}

interface Props {
  percent: number;
  /** Show the five stop names under the line. */
  labels?: boolean;
  /** Accessible name, for example the course title. */
  label?: string;
  className?: string;
}

export function LifecycleLine({ percent, labels = false, label = 'Course progress', className = '' }: Props) {
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const reached = stopFor(p);
  const last = LIFECYCLE_STOPS.length - 1;
  return (
    <div className={className} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-valuetext={`${p}% complete, stage ${LIFECYCLE_STOPS[reached]}`}>
      <div className="relative h-3">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-300 dark:bg-slate-700" />
        <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-indigo-600 dark:bg-indigo-400" style={{ width: `${p}%` }} />
        {LIFECYCLE_STOPS.map((name, i) => {
          const done = p > 0 && i <= reached;
          return (
            <span
              key={name}
              className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${done ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900'}`}
              style={{ left: `${(i / last) * 100}%` }}
            />
          );
        })}
      </div>
      {labels && (
        <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500" aria-hidden="true">
          {LIFECYCLE_STOPS.map((name, i) => (
            <span key={name} className={i === reached ? 'text-slate-900 dark:text-white' : ''}>{name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
