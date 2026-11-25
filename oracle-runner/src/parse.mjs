// Turns an uploaded PDF / PPTX / DOCX / TXT into plain text. Heavy libraries are imported lazily so
// the runner starts fast and a missing optional dependency only breaks that one format.
import JSZip from 'jszip';

const MAX_SOURCE_CHARS = 400_000; // ~100k tokens; well inside Gemini 2.5 Flash's 1M window

export async function fetchSource(payload) {
  if (typeof payload.text === 'string' && payload.text.trim()) return { text: payload.text, name: payload.name || 'pasted text' };
  if (!payload.source_url) throw new Error('payload needs text or source_url');
  const res = await fetch(payload.source_url);
  if (!res.ok) throw new Error(`Could not download source (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), name: payload.name || new URL(payload.source_url).pathname.split('/').pop() };
}

export async function toText({ text, buffer, name }) {
  if (text) return clip(text);
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') {
    const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
    return clip((await pdf(buffer)).text);
  }
  if (ext === 'docx') {
    const mammoth = (await import('mammoth')).default;
    return clip((await mammoth.extractRawText({ buffer })).value);
  }
  if (ext === 'pptx') return clip(await pptxText(buffer));
  if (['txt', 'md', 'srt', 'vtt'].includes(ext)) return clip(buffer.toString('utf8'));
  throw new Error(`Unsupported file type .${ext} — use PDF, DOCX, PPTX, TXT, MD, SRT or VTT`);
}

async function pptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const out = [];
  for (const f of slides) {
    const xml = await zip.files[f].async('string');
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decodeXml(m[1]));
    out.push(`Slide ${out.length + 1}:\n${runs.join(' ')}`);
  }
  return out.join('\n\n');
}

const decodeXml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

// Strips subtitle timing so SRT/VTT transcripts read as prose.
export function cleanTranscript(t) {
  return t
    .replace(/^WEBVTT.*$/gm, '')
    .replace(/^\d+\s*$/gm, '')
    .replace(/^\d{1,2}:\d{2}[:.,\d]*\s*-->.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clip(s) {
  const t = s.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (!t) throw new Error('No readable text found in the source (scanned/image-only PDFs are not supported yet)');
  return t.length > MAX_SOURCE_CHARS ? t.slice(0, MAX_SOURCE_CHARS) : t;
}
