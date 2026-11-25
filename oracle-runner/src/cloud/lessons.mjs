// Lists a course's lessons (id, title, whether it already has a video). Usage: node lessons.mjs <courseId>
import { api } from '../api.mjs';

const [courseId] = process.argv.slice(2);
if (!courseId) { console.error('usage: lessons.mjs <courseId>'); process.exit(2); }
const r = await api(`/academy/courses/${courseId}/structure`);
const out = (r.structure || []).flatMap(m => (m.lessons || []).map(l => ({ id: l.id, title: l.title, module: m.title, hasVideo: (l.sections || []).some(s => s.section_type === 'interactive_video') })));
console.log(JSON.stringify(out));
