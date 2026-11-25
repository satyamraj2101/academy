// Runs one render in its own process so the Studio server (and its progress polling) never freezes while frames draw.
import { buildVideo } from '../video/render.mjs';

process.on('message', async ({ script, outDir, cacheRoot, voice, fx }) => {
  try {
    const out = await buildVideo(script, outDir, { cacheRoot, voice, fx, onProgress: (p) => process.send({ type: 'progress', ...p }) });
    process.send({ type: 'done', timings: out.timings }, () => process.exit(0));
  } catch (e) {
    process.send({ type: 'error', message: e.message }, () => process.exit(1));
  }
});
