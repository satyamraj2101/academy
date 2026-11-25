// Lesson diagrams are stored as Mermaid text inside a code block. Some were saved as one line with a literal "\n"
// where the line breaks should be, so a one-line source is split back into lines. A source that already has real
// line breaks is left exactly as written (its own "\n" may be an intentional break inside a label).
export const normalizeMermaid = (src: string): string => {
  const t = String(src).trim();
  return t.includes('\n') ? t : t.replace(/\\n/g, '\n');
};

// Mermaid sizes its SVG to 100% of the container, which squeezes a wide flow into unreadable text on a phone.
// Give the SVG its drawn width instead; the frame then scrolls sideways on small screens and scales down on larger ones.
export function naturalSize(svg: string): string {
  return svg.replace(/<svg([^>]*)>/, (whole, attrs: string) => {
    const vb = /viewBox="-?[\d.]+ -?[\d.]+ ([\d.]+) [\d.]+"/.exec(attrs);
    if (!vb) return whole;
    const cleaned = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sstyle="[^"]*"/, '');
    return `<svg${cleaned} width="${Math.round(Number(vb[1]))}">`;
  });
}
