// Local dev launcher.
//
//   Vite     -> http://localhost:3000   the React app, with hot reload (what you open)
//   Wrangler -> http://localhost:8788   Pages Functions + local D1/R2/KV, reached via
//                                       Vite's /api proxy (see vite.config.ts)
//
// Why not just `wrangler pages dev -- vite`? Recent Wrangler versions reject a proxy
// command, and with `--proxy` they ignore it and serve the stale ./dist build instead of
// your live code. Running them side by side avoids both problems.
//
// Local secrets (ACADEMY_JWT_SECRET, CERTIFICATE_SECRET, ...) come from .dev.vars.
// Local database: apply migrations once with
//   npx wrangler d1 migrations apply spotclm-academy-dev --local
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const isWindows = process.platform === 'win32';
const children = [];

// Wrangler needs the assets directory to exist; its contents are not used in dev.
mkdirSync('dist', { recursive: true });

function start(args) {
  const child = spawn('npx', args, { stdio: 'inherit', shell: isWindows });
  children.push(child);
  child.on('exit', (code) => shutdown(code ?? 0));
  return child;
}

let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    try { child.kill(); } catch { /* already exited */ }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start(['wrangler', 'pages', 'dev', 'dist', '--port', '8788']);
start(['vite']);
