// A course without artwork shows a contract page: ruled text lines, a heading and a signature line, in the quiet paper tones of the
// student view with one accent stroke on the signature. The line lengths come from the course's category (or title), so the same
// course always draws the same page and a catalog of artless courses still reads as separate documents.
function lengths(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return Array.from({ length: n }, () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; return 46 + (h % 38); });
}

interface CourseThumbnailProps {
  imageUrl?: string | null;
  title: string;
  category?: string | null;
  /** Classes for the <img> only. */
  imageClassName?: string;
  /** Kept for existing callers; the drawn page scales with its parent instead. */
  iconClassName?: string;
}

/**
 * Fills its nearest `relative` parent. The parent owns the size, radius and overflow,
 * so this works for a 64px list thumbnail and a full-width card header alike.
 * The image is decorative: the course title is always rendered next to it.
 */
export function CourseThumbnail({ imageUrl, title, category, imageClassName = '' }: CourseThumbnailProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover ${imageClassName}`}
      />
    );
  }

  const lines = lengths(category || title, 6);
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
      <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" className="h-[78%] w-auto max-w-[78%]">
        <rect x="22" y="8" width="76" height="104" rx="4" className="fill-white stroke-slate-300 dark:fill-slate-700 dark:stroke-slate-500" strokeWidth="1" />
        <rect x="32" y="20" width="34" height="5" rx="1.5" className="fill-slate-500 dark:fill-slate-300" />
        {lines.map((w, i) => (
          <rect key={i} x="32" y={34 + i * 10} width={(w / 100) * 56} height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-500" />
        ))}
        <path d="M32 100 C 40 90, 46 104, 54 96 S 66 92, 72 98" fill="none" strokeWidth="1.5" strokeLinecap="round" className="stroke-indigo-600 dark:stroke-indigo-400" />
        <line x1="32" y1="104" x2="78" y2="104" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="0.75" />
      </svg>
    </div>
  );
}
