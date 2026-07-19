import fs from 'fs';
import path from 'path';

console.log('[Prerender] Starting full per-page SEO injection for Academy...');

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[Prerender] ERROR: index.html not found in dist.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexPath, 'utf8');

// ─── Per-page SEO data ───────────────────────────────────────────────────────
const pages = [
  {
    route: '/',
    title: 'SpotCLM Academy | Master Contract Lifecycle Management',
    description: 'The industry\'s premier training destination for enterprise CLM professionals. Live sessions, job-ready tracks, and official certifications for Leah, Ironclad, and Sirion.',
    canonical: 'https://academy.spotclm.com/',
    ogTitle: 'SpotCLM Academy | Master Contract Lifecycle Management',
    ogDesc: 'Live sessions, job-ready tracks, and official certifications for enterprise CLM professionals.',
    ogUrl: 'https://academy.spotclm.com/',
    twTitle: 'SpotCLM Academy | Master Contract Lifecycle Management',
    twDesc: 'Live sessions, job-ready tracks, and official certifications for enterprise CLM professionals.',
    jsonLd: [],
    body: '<h1>SpotCLM Academy</h1><p>The industry\'s premier training destination for enterprise CLM professionals. Live sessions, job-ready tracks, and official certifications.</p>'
  }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function replaceTitle(html, v) {
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${v}</title>`);
}
function replaceMeta(html, name, v) {
  return html.replace(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i'),
    (m) => m.replace(/content=["'][^"']*["']/, `content="${v}"`)
  );
}
function replaceOgProp(html, prop, v) {
  return html.replace(
    new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*>`, 'i'),
    (m) => m.replace(/content=["'][^"']*["']/, `content="${v}"`)
  );
}
function replaceCanonical(html, v) {
  return html.replace(
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${v}" />`
  );
}

function buildHtml(page) {
  let h = baseHtml;
  h = replaceTitle(h, page.title);
  h = replaceMeta(h, 'description', page.description);
  h = replaceCanonical(h, page.canonical);
  h = replaceOgProp(h, 'og:title', page.ogTitle);
  h = replaceOgProp(h, 'og:description', page.ogDesc);
  h = replaceOgProp(h, 'og:url', page.ogUrl);
  h = replaceMeta(h, 'twitter:title', page.twTitle);
  h = replaceMeta(h, 'twitter:description', page.twDesc);

  if (page.jsonLd && page.jsonLd.length > 0) {
    const lds = page.jsonLd.map(j => `  <script type="application/ld+json">${j}</script>`).join('\n');
    h = h.replace('</head>', `${lds}\n</head>`);
  }

  const seoBlock = `\n<div id="seo-static" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;" aria-hidden="true">${page.body}</div>`;
  h = h.replace('</body>', `${seoBlock}\n</body>`);
  return h;
}

// ─── Generate per-route files ─────────────────────────────────────────────────
for (const page of pages) {
  const html = buildHtml(page);
  if (page.route === '/') {
    fs.writeFileSync(indexPath, html);
    console.log(`[Prerender] ✓ / -> dist/index.html`);
  } else {
    const rel = page.route.slice(1);
    const dir = path.join(distDir, rel);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`[Prerender] ✓ ${page.route} -> dist/${rel}/index.html`);
  }
}

// ─── Verify ──────────────────────────────────────────────────────────────────
console.log('\n[Prerender] Verification:');
for (const page of pages) {
  const rel = page.route === '/' ? '' : page.route.slice(1);
  const fp = page.route === '/' ? indexPath : path.join(distDir, rel, 'index.html');
  if (fs.existsSync(fp)) {
    const c = fs.readFileSync(fp, 'utf8');
    const t = (c.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'MISSING';
    const canon = (c.match(/rel="canonical" href="([^"]+)"/) || [])[1] || 'MISSING';
    console.log(`  ${page.route.padEnd(25)} title: "${t.substring(0,50)}"  canonical: "${canon}"`);
  }
}
console.log('\n[Prerender] Done. Academy SEO injected.\n');
