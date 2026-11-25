import { assertConfigured, claimJob, patchJob } from './api.mjs';
import { runJob } from './jobs.mjs';

assertConfigured();
const POLL_MS = Number(process.env.POLL_INTERVAL_MS) || 10_000;
const HEARTBEAT_MS = 60_000;
let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopping = true; console.log(`${sig} — finishing current job then exiting`); });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

// Progress state for one job, flushed to the API on every change and on a timer. The timer is the
// heartbeat that keeps the 5-minute lease alive during a long single Gemini call.
function makeReporter(job) {
  const state = { step: 'starting', done: 0, total: 0, ...(job.progress || {}) };
  let pending = Promise.resolve();
  const flush = () => { pending = pending.then(() => patchJob(job.id, { progress: state })).catch(e => log('progress update failed:', e.message)); return pending; };
  return {
    setStep(step) { state.step = step; log(`[${job.id.slice(0, 8)}] ${step}`); return flush(); },
    set(patch) { Object.assign(state, patch); return flush(); },
    state,
    heartbeat: setInterval(flush, HEARTBEAT_MS),
    stop() { clearInterval(this.heartbeat); return pending; },
  };
}

async function handle(job) {
  log(`claimed ${job.type} ${job.id} (attempt ${job.attempts})`);
  const report = makeReporter(job);
  try {
    const result = await runJob(job, report);
    await report.stop();
    await patchJob(job.id, { status: 'done', result, progress: { ...report.state, step: 'Done', done: report.state.total } }).catch(() => {});
    log(`done ${job.id}`, result);
  } catch (e) {
    await report.stop();
    log(`failed ${job.id}:`, e.message);
    await patchJob(job.id, { status: 'failed', error: e.message }).catch(err => log('could not mark failed:', err.message));
  }
}

log('runner started, polling', process.env.ACADEMY_ADMIN_BASE_URL);
while (!stopping) {
  try {
    const job = await claimJob();
    if (job) { await handle(job); continue; }
  } catch (e) {
    log('poll error:', e.message);
  }
  await sleep(POLL_MS);
}
log('stopped');
