// The Watch / Read / Check path shown at the top of a lesson. Pure, so the rules are unit-tested without a browser.
// A step only exists when the lesson really has that part, and a lesson with fewer than two parts shows no path at all.

export type StepId = 'watch' | 'read' | 'check';
export type StepState = 'done' | 'current' | 'todo';

export interface PathInput {
  hasWatch: boolean; watchDone: boolean;
  hasRead: boolean; readViewed: boolean;
  hasCheck: boolean; checkDone: boolean;
}
export interface PathStep { id: StepId; label: string; state: StepState }

export const STEP_LABEL: Record<StepId, string> = { watch: 'Watch', read: 'Read', check: 'Check' };

// `active` is the step the student has scrolled to. It is highlighted unless that step is already done.
export function buildPath(input: PathInput, active: StepId | null): PathStep[] {
  const present: { id: StepId; done: boolean }[] = [];
  if (input.hasWatch) present.push({ id: 'watch', done: input.watchDone });
  if (input.hasRead) present.push({ id: 'read', done: input.readViewed });
  if (input.hasCheck) present.push({ id: 'check', done: input.checkDone });
  if (present.length < 2) return [];
  const firstOpen = present.find(s => !s.done)?.id ?? null;
  const current = active && present.some(s => s.id === active && !s.done) ? active : firstOpen;
  return present.map(s => ({ id: s.id, label: STEP_LABEL[s.id], state: s.done ? 'done' : s.id === current ? 'current' : 'todo' }));
}

export const doneCount = (steps: PathStep[]) => steps.filter(s => s.state === 'done').length;

// Which step the student is looking at: the last one whose top edge has passed `line` (px from the top of the viewport).
// At the very bottom of the page the last step wins, so a short final step can still become current.
export function activeStepAt(tops: Partial<Record<StepId, number>>, line: number, atBottom: boolean): StepId | null {
  const order: StepId[] = ['watch', 'read', 'check'];
  const present = order.filter(id => typeof tops[id] === 'number');
  if (!present.length) return null;
  if (atBottom) return present[present.length - 1];
  let cur: StepId = present[0];
  for (const id of present) if ((tops[id] as number) <= line) cur = id;
  return cur;
}
