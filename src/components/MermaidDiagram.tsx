import { useEffect, useRef, useState } from 'react';
import { naturalSize, normalizeMermaid } from './mermaidSource';

// Mermaid is large, so it is only fetched when a lesson actually contains a diagram.
let seq = 0;

const useIsDark = () => {
  const read = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

// Brand blue on the page's own surfaces, in both themes.
const themeFor = (dark: boolean) => ({
  background: 'transparent',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: '15px',
  primaryColor: dark ? '#1e3a8a' : '#dbeafe',
  primaryBorderColor: dark ? '#60a5fa' : '#2563eb',
  primaryTextColor: dark ? '#e2e8f0' : '#0f172a',
  secondaryColor: dark ? '#172554' : '#eff6ff',
  tertiaryColor: dark ? '#0f172a' : '#ffffff',
  lineColor: dark ? '#94a3b8' : '#475569',
  textColor: dark ? '#e2e8f0' : '#0f172a',
  noteBkgColor: dark ? '#1e293b' : '#f8fafc',
  noteTextColor: dark ? '#e2e8f0' : '#0f172a',
});

/** Renders Mermaid source to SVG markup. Rejects (and cleans up after itself) when the source is not a valid diagram. */
export async function renderMermaid(source: string, dark: boolean): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeFor(dark), flowchart: { curve: 'basis', padding: 14 } });
  const code = normalizeMermaid(source);
  const id = `lesson-diagram-${++seq}`;
  try {
    await mermaid.parse(code);
    const { svg } = await mermaid.render(id, code);
    return naturalSize(svg);
  } finally {
    document.getElementById(`d${id}`)?.remove(); // mermaid leaves a scratch element behind on errors
  }
}

const FRAME = 'lesson-diagram my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 sm:p-6 text-center [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none sm:[&_svg]:max-w-full';

/** A diagram for Markdown lessons (React renders it). */
export function MermaidDiagram({ code }: { code: string }) {
  const dark = useIsDark();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    renderMermaid(code, dark).then(s => { if (alive) setSvg(s); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [code, dark]);

  if (failed) return <pre className="overflow-x-auto"><code>{code}</code></pre>;
  if (!svg) return <div className={`${FRAME} min-h-[8rem] flex items-center justify-center text-sm text-slate-500`} role="status">Drawing diagram…</div>;
  return <figure className={FRAME} role="img" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const SELECTOR = 'pre > code.language-mermaid, pre > code.lang-mermaid';

/**
 * Lessons written as HTML carry the diagram as <pre><code class="language-mermaid">. This swaps each one for the drawn
 * diagram inside `root`, and redraws them when the theme changes. Returns a cleanup function.
 */
export function hydrateDiagrams(root: HTMLElement, dark: boolean): () => void {
  let alive = true;
  const jobs: Promise<void>[] = [];
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(codeEl => {
    const pre = codeEl.parentElement as HTMLElement;
    const source = codeEl.textContent || '';
    const host = document.createElement('figure');
    host.className = FRAME;
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'Diagram');
    host.dataset.source = source;
    host.textContent = 'Drawing diagram…';
    pre.replaceWith(host);
    jobs.push(draw(host, source, dark, () => alive));
  });
  root.querySelectorAll<HTMLElement>('figure.lesson-diagram[data-source]').forEach(host => {
    if (host.dataset.drawnDark === String(dark)) return;
    jobs.push(draw(host, host.dataset.source || '', dark, () => alive));
  });
  void Promise.all(jobs);
  return () => { alive = false; };
}

async function draw(host: HTMLElement, source: string, dark: boolean, alive: () => boolean) {
  try {
    const svg = await renderMermaid(source, dark);
    if (!alive()) return;
    host.innerHTML = svg;
    host.dataset.drawnDark = String(dark);
  } catch {
    if (!alive()) return;
    // Not a valid diagram: show it as plain code so the lesson still reads.
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = source;
    pre.appendChild(code);
    host.replaceWith(pre);
  }
}

export { useIsDark };
