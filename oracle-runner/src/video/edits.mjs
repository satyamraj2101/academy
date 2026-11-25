// Turns reviewer notes ("make this clearer", "show it earlier") into proposed scene changes. The AI only ever
// proposes: nothing is saved or rendered until a person accepts. Every proposal is validated so a bad reply can
// never produce a scene the renderer cannot draw.
import { complete } from '../ai.mjs';

export const LAYOUTS = ['hook', 'bullets', 'steps', 'compare', 'quiz', 'recap'];
export const GESTURES = ['point', 'raise', 'present'];
export const SFX = ['happy', 'curious', 'oops', 'celebrate', 'notice', 'nudge'];
export const NOTE_KINDS = ['wording', 'visual', 'timing', 'quiz', 'other'];

const SHAPE = `A scene is JSON:
{ "id": "<keep unchanged>", "gesture": "point|raise|present",
  "narration": "text shown as captions", "spoken": "text read aloud (write CLM as 'C L M'; use '||' only in quiz scenes)",
  "thinkSeconds": <quiz only>,
  "sfx": [{"sound": "happy|curious|oops|celebrate|notice|nudge", "at": "phrase in spoken"}]  (Indoo, the mop-bot, chirps and reacts),
  "slide": { "layout": "hook|bullets|steps|compare|quiz|recap", "title": "...",
    hook: "kicker","subtitle","subAt";  bullets: "bullets":[{"text","at"}];  steps: "steps":[{"text","desc","at"}];
    compare: "compare":{"left":{"title","items":[{"text","at"}]},"right":{...}};
    quiz: "quiz":{"question","options":[3 strings],"optionsAt":[3 phrases],"answer":<index>,"answerAt":"phrase"};
    recap: "takeaways":[{"text","at"}],"next","nextAt" } }
Every "at" / "subAt" / "answerAt" / "nextAt" must be a short phrase that appears word-for-word in "spoken" (case-insensitive); it is the moment that item appears on screen.`;

export function sceneForTime(chapters, time) {
  return chapters.find(c => time >= c.start && time < c.end + 0.5) || chapters[chapters.length - 1];
}

// Returns { scene, problems[] }: the scene made safe to render, plus anything we had to drop or could not accept.
export function validateScene(next, original) {
  const problems = [];
  if (!next || typeof next !== 'object') return { scene: null, problems: ['reply was not a scene object'] };
  const scene = { ...next, id: original.id };
  const said = String(scene.spoken || scene.narration || '').toLowerCase();
  if (!String(scene.narration || '').trim()) problems.push('narration is empty');
  if (!scene.slide || !LAYOUTS.includes(scene.slide.layout)) problems.push(`layout must be one of ${LAYOUTS.join(', ')}`);
  if (scene.gesture && !GESTURES.includes(scene.gesture)) scene.gesture = original.gesture || 'point';
  if (problems.length) return { scene: null, problems };

  const fixAt = (obj, key, label) => {
    if (obj && obj[key] && !said.includes(String(obj[key]).toLowerCase())) { problems.push(`"${obj[key]}" is not in the spoken text, so the ${label} will appear at a default time`); delete obj[key]; }
  };
  if (Array.isArray(scene.sfx)) {
    scene.sfx = scene.sfx.filter(e => e && SFX.includes(e.sound));
    scene.sfx.forEach(e => fixAt(e, 'at', 'chirp'));
    scene.sfx = scene.sfx.filter(e => e.at || Number.isFinite(Number(e.time)));
  }
  const s = scene.slide;
  fixAt(s, 'subAt', 'subtitle'); fixAt(s, 'nextAt', 'next button');
  for (const list of [s.bullets, s.steps, s.takeaways, s.compare?.left?.items, s.compare?.right?.items]) (list || []).forEach(it => typeof it === 'object' && fixAt(it, 'at', 'item'));
  if (s.layout === 'quiz') {
    const q = s.quiz;
    if (!q || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return { scene: null, problems: ['quiz needs options and a valid answer index'] };
    fixAt(q, 'answerAt', 'answer reveal');
    if (Array.isArray(q.optionsAt)) q.optionsAt = q.optionsAt.map(p => (said.includes(String(p).toLowerCase()) ? p : null));
  }
  if (s.layout === 'steps' && (!Array.isArray(s.steps) || s.steps.length < 2 || s.steps.length > 6)) return { scene: null, problems: ['steps needs 2 to 6 items'] };
  return { scene, problems };
}

const prompt = (scene, notes) => `You are editing one scene of a short training video for SpotCLM Academy (professional Contract Lifecycle Management training). Brand voice: warm, plain, practical, no hype, no invented statistics.
${SHAPE}

Apply ONLY what the reviewer notes ask for. Keep everything else exactly as it is, including wording that was not criticised. If a note is unclear or cannot be done in this scene, ignore it and say so in "unapplied".
Return ONLY JSON: {"scene": <the full revised scene>, "summary": "one plain sentence on what changed", "unapplied": ["note id and why", ...]}

CURRENT SCENE:
${JSON.stringify(scene, null, 2)}

REVIEWER NOTES (time is where in the video the reviewer was; kind is their category):
${notes.map(n => `- [${n.id}] (${n.kind}) ${n.text}`).join('\n')}`;

// Groups open notes by scene, asks the model for each scene, validates, and returns the proposal.
export async function proposeEdits(script, chapters, notes, { env = process.env } = {}) {
  const open = notes.filter(n => n.status === 'open');
  if (!open.length) throw new Error('There are no open notes to apply.');
  const bySceneId = new Map();
  for (const n of open) {
    const id = n.sceneId || sceneForTime(chapters, n.time)?.id;
    if (!bySceneId.has(id)) bySceneId.set(id, []);
    bySceneId.get(id).push(n);
  }
  const changes = [], skipped = [];
  for (const [sceneId, sceneNotes] of bySceneId) {
    const original = script.scenes.find(s => s.id === sceneId);
    if (!original) { skipped.push({ sceneId, noteIds: sceneNotes.map(n => n.id), reason: 'scene not found in this version' }); continue; }
    try {
      const { text, provider } = await complete('draft', prompt(original, sceneNotes), { json: true, env });
      const reply = JSON.parse(text);
      const { scene, problems } = validateScene(reply.scene, original);
      if (!scene) { skipped.push({ sceneId, noteIds: sceneNotes.map(n => n.id), reason: problems.join('; ') }); continue; }
      changes.push({ sceneId, noteIds: sceneNotes.map(n => n.id), summary: String(reply.summary || '').slice(0, 300), unapplied: Array.isArray(reply.unapplied) ? reply.unapplied : [], warnings: problems, before: original, after: scene, provider });
    } catch (e) {
      skipped.push({ sceneId, noteIds: sceneNotes.map(n => n.id), reason: e.message });
    }
  }
  return { changes, skipped };
}

export const applyChanges = (script, changes) => ({ ...script, scenes: script.scenes.map(s => changes.find(c => c.sceneId === s.id)?.after || s) });
