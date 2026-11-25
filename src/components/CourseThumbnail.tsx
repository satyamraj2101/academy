import { BookOpen } from 'lucide-react';

// Fallback palettes stay inside the brand's blue family plus cool neighbours (cyan, teal, slate),
// so a course without artwork looks designed and on-theme instead of showing a grey box.
const FALLBACK_GRADIENTS = [
  'from-blue-600 to-blue-900',
  'from-sky-500 to-blue-800',
  'from-teal-600 to-slate-800',
  'from-cyan-600 to-blue-900',
  'from-slate-600 to-slate-900',
];

// Same category (or title) always gets the same colour, so the catalog stays stable between renders.
function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

interface CourseThumbnailProps {
  imageUrl?: string | null;
  title: string;
  category?: string | null;
  /** Classes for the <img> only (e.g. hover zoom). */
  imageClassName?: string;
  /** Size classes for the fallback icon. */
  iconClassName?: string;
}

/**
 * Fills its nearest `relative` parent. The parent owns the size, radius and overflow,
 * so this works for a 64px list thumbnail and a full-width card header alike.
 * The image is decorative: the course title is always rendered next to it.
 */
export function CourseThumbnail({
  imageUrl,
  title,
  category,
  imageClassName = '',
  iconClassName = 'w-10 h-10',
}: CourseThumbnailProps) {
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

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${pickGradient(category || title)}`}
    >
      <BookOpen className={`${iconClassName} text-white/80`} strokeWidth={1.5} />
    </div>
  );
}
