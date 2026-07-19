import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/Toast';
import './i18n';
import './sentry';
import App from './App.tsx';
import './index.css';

// This module itself just executed successfully, so any prior chunk-reload
// guard from ErrorBoundary is no longer relevant — clear it so a future
// genuine chunk failure can trigger one more automatic recovery reload.
sessionStorage.removeItem('spotclm_chunk_reload_attempted');

// Vite's own runtime preloads the CSS/JS for every lazily-loaded route by
// creating a <link> element and calling document.head.appendChild() on it —
// completely unguarded. If anything on the page interferes with that single
// call (a browser extension patching appendChild, an ad/privacy blocker,
// etc.), the exception propagates straight through the dynamic import()
// chain and takes down the entire route, even though the import itself
// would have succeeded fine without the preload hint. We've seen this in
// production as a fatal "Something went wrong" on first load. Preloading is
// purely a perf optimization, so make failures on <link> insertion
// non-fatal — everything else still throws normally.
const nativeAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function <T extends Node>(this: Node, node: T): T {
  try {
    return nativeAppendChild.call(this, node) as T;
  } catch (err) {
    if (node instanceof HTMLLinkElement) {
      console.warn('Ignored a failed <link> insertion (likely third-party interference):', err);
      return node;
    }
    throw err;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            {/* reducedMotion="user" disables Framer Motion animations for visitors
                whose OS requests reduced motion; CSS animations are handled in index.css */}
            <MotionConfig reducedMotion="user">
              <App />
              <Toast />
            </MotionConfig>
          </ErrorBoundary>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
