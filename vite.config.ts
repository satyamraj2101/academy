import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Vite normally injects a runtime helper that proactively inserts
      // <link rel="modulepreload"> tags via document.head.appendChild() ahead
      // of every dynamic import(), as a perf optimization. That insertion is
      // unguarded — if anything on the page (a browser extension patching
      // appendChild, an aggressive ad/privacy blocker, etc.) throws during
      // it, the exception propagates up through the whole lazy-load chain and
      // takes down the entire route with a fatal "Something went wrong",
      // even though the actual import would have worked fine without the
      // hint. Disabling the polyfill removes that single point of failure —
      // dynamic imports become plain native import() calls with no extra
      // DOM-insertion step in the way.
      modulePreload: false,
    },
  };
});
