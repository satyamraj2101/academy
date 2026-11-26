import { describe, it, expect } from 'vitest';
import { buildEditMessages, parseEdit, validateEditInput, MAX_CONTENT, MAX_INSTRUCTION } from '../../functions/api/admin/academy/_lessonEdit';

const LESSON = '## Renewals\n\nA renewal extends a contract before it ends. Teams track renewal dates so nothing lapses by accident.\n\n- Check the notice period\n- Decide to renew or exit';

describe('validateEditInput', () => {
  it('needs lesson text and a request', () => {
    expect(validateEditInput({ content: '', instruction: 'shorter' }).ok).toBe(false);
    expect(validateEditInput({ content: LESSON, instruction: 'x' }).ok).toBe(false);
    expect(validateEditInput({}).ok).toBe(false);
  });
  it('rejects a block or request that is too long', () => {
    expect(validateEditInput({ content: 'x'.repeat(MAX_CONTENT + 1), instruction: 'shorter' }).ok).toBe(false);
    expect(validateEditInput({ content: LESSON, instruction: 'x'.repeat(MAX_INSTRUCTION + 1) }).ok).toBe(false);
  });
  it('accepts and trims', () => {
    const r = validateEditInput({ content: `  ${LESSON}  `, instruction: '  make it shorter ' });
    expect(r.ok && r.content).toBe(LESSON);
    expect(r.ok && r.instruction).toBe('make it shorter');
  });
});

describe('buildEditMessages', () => {
  it('passes the lesson as data in tags and keeps the request outside them', () => {
    const m = buildEditMessages(LESSON, 'add an example');
    expect(m[0].content).toMatch(/never instructions/);
    expect(m[1].content).toContain('CHANGE REQUEST: add an example');
    expect(m[1].content).toContain(`<lesson>\n${LESSON}\n</lesson>`);
  });
});

describe('parseEdit', () => {
  const reply = (body: string, changes = '- Added an example') => `CHANGES:\n${changes}\n---REVISED---\n${body}`;

  it('returns the revised lesson and the change list', () => {
    const revised = `${LESSON}\n\nExample: a supplier contract renews every January.`;
    const r = parseEdit(reply(revised), LESSON);
    expect(r?.revised).toBe(revised);
    expect(r?.changes).toEqual(['Added an example']);
  });
  it('unwraps a code fence that encloses the whole lesson', () => {
    const r = parseEdit(reply('```markdown\n' + LESSON + '\nExtra line here.\n```'), LESSON);
    expect(r?.revised).toBe(`${LESSON}\nExtra line here.`);
  });
  it('keeps code fences that are part of the lesson', () => {
    const withCode = `${LESSON}\n\n\`\`\`\nclause = 1\n\`\`\`\n\nDone.`;
    expect(parseEdit(reply(withCode), LESSON)?.revised).toBe(withCode);
  });
  it('is null when the marker is missing', () => {
    expect(parseEdit(`Here is your lesson:\n${LESSON}`, LESSON)).toBeNull();
    expect(parseEdit(undefined, LESSON)).toBeNull();
  });
  it('rejects a reply that lost most of the lesson or ballooned', () => {
    expect(parseEdit(reply('Too short but long enough to pass 20 chars'), 'x'.repeat(2000))).toBeNull();
    expect(parseEdit(reply('y'.repeat(20000)), LESSON)).toBeNull();
  });
  it('reports no changes when nothing changed', () => {
    const r = parseEdit(reply(LESSON.replace('\n\n', '\n')), LESSON);
    expect(r?.changes).toEqual([]);
  });
  it('limits the change list and tolerates bullet styles', () => {
    const many = Array.from({ length: 9 }, (_, i) => `* change ${i + 1}`).join('\n');
    const r = parseEdit(reply(`${LESSON}\nmore text here`, many), LESSON);
    expect(r?.changes).toHaveLength(6);
    expect(r?.changes[0]).toBe('change 1');
  });
});
