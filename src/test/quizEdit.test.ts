import { describe, it, expect } from 'vitest';
import { buildQuizMessages, cleanQuestion, parseQuizEdit, planQuizChanges, toQuizQ, validateQuizEditInput, MAX_QUESTIONS, type QuizQ } from '../../functions/api/admin/academy/_quizEdit';

const row = (over: Record<string, unknown> = {}) => ({ id: 'q1', question_text: 'What does CLM stand for?', question_type: 'mcq', options: JSON.stringify(['Contract Lifecycle Management', 'Client Lead Mapping', 'Case Law Manual']), correct_answer: 'Contract Lifecycle Management', explanation: 'It manages contracts end to end.', points: 1, ...over });
const orig = (): QuizQ[] => [toQuizQ(row()), toQuizQ(row({ id: 'q2', question_text: 'Renewals can be tracked.', question_type: 'true_false', options: '["True","False"]', correct_answer: 'True' }))];
const reply = (qs: unknown[], changes: string[] = ['Made question 1 easier']) => JSON.stringify({ changes, questions: qs });

describe('toQuizQ', () => {
  it('reads stored rows, including options kept as JSON text', () => {
    const q = toQuizQ(row());
    expect(q.options).toHaveLength(3);
    expect(q.question_type).toBe('mcq');
    expect(toQuizQ(row({ options: 'not json' })).options).toEqual([]);
    expect(toQuizQ(row({ question_type: 'weird' })).question_type).toBe('mcq');
  });
});

describe('validateQuizEditInput', () => {
  it('needs a request and at least one question', () => {
    expect(validateQuizEditInput({ questions: orig(), instruction: 'x' }).ok).toBe(false);
    expect(validateQuizEditInput({ questions: [], instruction: 'make it easier' }).ok).toBe(false);
    expect(validateQuizEditInput({ questions: Array(MAX_QUESTIONS + 1).fill(row()), instruction: 'make it easier' }).ok).toBe(false);
    expect(validateQuizEditInput({ questions: [row()], instruction: ' make it easier ' }).ok).toBe(true);
  });
});

describe('buildQuizMessages', () => {
  it('passes the quiz as data and tells the model not to obey it', () => {
    const m = buildQuizMessages(orig(), 'make question 1 easier');
    expect(m[0].content).toMatch(/never instructions/);
    expect(m[1].content).toContain('CHANGE REQUEST: make question 1 easier');
    expect(m[1].content).toContain('<quiz>');
  });
});

describe('cleanQuestion', () => {
  const known = new Set(['q1']);
  it('accepts a good mcq and keeps a known id only', () => {
    const q = cleanQuestion({ id: 'q1', question_type: 'mcq', question_text: 'Q?', options: ['a', 'b', 'c'], correct_answer: 'b', explanation: 'e', points: 2 }, known);
    expect(q).toMatchObject({ id: 'q1', correct_answer: 'b', points: 2 });
    expect(cleanQuestion({ id: 'zzz', question_type: 'mcq', question_text: 'Q?', options: ['a', 'b'], correct_answer: 'a' }, known)?.id).toBeUndefined();
  });
  it('rejects an mcq whose answer is not one of its options, or has duplicate or too few options', () => {
    expect(cleanQuestion({ question_type: 'mcq', question_text: 'Q?', options: ['a', 'b'], correct_answer: 'c' }, known)).toBeNull();
    expect(cleanQuestion({ question_type: 'mcq', question_text: 'Q?', options: ['a'], correct_answer: 'a' }, known)).toBeNull();
    expect(cleanQuestion({ question_type: 'mcq', question_text: 'Q?', options: ['a', 'a'], correct_answer: 'a' }, known)).toBeNull();
    expect(cleanQuestion({ question_type: 'mcq', question_text: '', options: ['a', 'b'], correct_answer: 'a' }, known)).toBeNull();
  });
  it('fixes the options of true/false and checks the answer', () => {
    expect(cleanQuestion({ question_type: 'true_false', question_text: 'Q?', options: ['yes'], correct_answer: 'False' }, known)).toMatchObject({ options: ['True', 'False'], correct_answer: 'False' });
    expect(cleanQuestion({ question_type: 'true_false', question_text: 'Q?', correct_answer: 'maybe' }, known)).toBeNull();
  });
  it('accepts multi-select answers as an array or JSON text, but not all or none of the options', () => {
    const base = { question_type: 'multi_select', question_text: 'Q?', options: ['a', 'b', 'c'] };
    expect(cleanQuestion({ ...base, correct_answer: '["a","c"]' }, known)?.correct_answer).toBe('["a","c"]');
    expect(cleanQuestion({ ...base, correct_answer: ['a'] }, known)?.correct_answer).toBe('["a"]');
    expect(cleanQuestion({ ...base, correct_answer: '["a","b","c"]' }, known)).toBeNull();
    expect(cleanQuestion({ ...base, correct_answer: '[]' }, known)).toBeNull();
    expect(cleanQuestion({ ...base, correct_answer: '["z"]' }, known)).toBeNull();
  });
  it('short answers carry no options or answer', () => {
    expect(cleanQuestion({ question_type: 'short_answer', question_text: 'Explain.', options: ['x'], correct_answer: 'y' }, known)).toMatchObject({ options: [], correct_answer: '' });
  });
  it('bounds the points', () => {
    expect(cleanQuestion({ question_type: 'short_answer', question_text: 'Q', points: 999 }, known)?.points).toBe(20);
    expect(cleanQuestion({ question_type: 'short_answer', question_text: 'Q', points: -3 }, known)?.points).toBe(1);
  });
});

describe('parseQuizEdit', () => {
  it('returns the revised list with the model\'s change notes', () => {
    const o = orig();
    const revised = [{ ...o[0], question_text: 'What does the C in CLM stand for?', options: ['Contract', 'Client', 'Case'], correct_answer: 'Contract' }, o[1]];
    const r = parseQuizEdit(reply(revised), o);
    expect(r?.questions).toHaveLength(2);
    expect(r?.changes).toEqual(['Made question 1 easier']);
    expect(r?.dropped).toBe(0);
  });
  it('tolerates code fences around the JSON', () => {
    const o = orig();
    expect(parseQuizEdit('```json\n' + reply([o[0], o[1]]) + '\n```', o)?.questions).toHaveLength(2);
  });
  it('drops questions that cannot be answered and counts them', () => {
    const o = orig();
    const r = parseQuizEdit(reply([o[0], o[1], { question_type: 'mcq', question_text: 'Broken', options: ['a', 'b'], correct_answer: 'zzz' }]), o);
    expect(r?.questions).toHaveLength(2);
    expect(r?.dropped).toBe(1);
  });
  it('refuses a reply that is mostly unusable, empty or not JSON', () => {
    const o = orig();
    const bad = { question_type: 'mcq', question_text: 'Broken', options: ['a', 'b'], correct_answer: 'zzz' };
    expect(parseQuizEdit(reply([o[0], bad, bad]), o)).toBeNull();
    expect(parseQuizEdit(reply([]), o)).toBeNull();
    expect(parseQuizEdit('here is your quiz', o)).toBeNull();
  });
  it('lists no changes when nothing differs', () => {
    const o = orig();
    expect(parseQuizEdit(reply(o), o)?.changes).toEqual([]);
  });
  it('ignores a repeated id', () => {
    const o = orig();
    expect(parseQuizEdit(reply([o[0], o[0]]), o)?.questions).toHaveLength(1);
  });
});

describe('planQuizChanges', () => {
  it('tells kept, edited, added and removed questions apart', () => {
    const o = orig();
    const revised: QuizQ[] = [
      { ...o[0], question_text: 'Reworded?' },
      { question_text: 'A new one?', question_type: 'short_answer', options: [], correct_answer: '', explanation: '', points: 1 },
    ];
    const plan = planQuizChanges(o, revised);
    expect(plan.map(c => c.kind)).toEqual(['edit', 'add', 'remove']);
    const kept = planQuizChanges(o, o);
    expect(kept.map(c => c.kind)).toEqual(['same', 'same']);
  });
  it('treats a question with an unknown id as new', () => {
    const o = orig();
    const plan = planQuizChanges(o, [{ ...o[0], id: 'ghost' }]);
    expect(plan.map(c => c.kind)).toEqual(['add', 'remove', 'remove']);
  });
});
