import { describe, it, expect } from 'vitest';
import { setIn, type Script } from '../admin/components/builder/VideoScenesEditor';

const script = (): Script => ({ title: 'T', scenes: [{ id: 'a', spoken: 'old words', narration: 'old words', slide: { layout: 'bullets', title: 'Old', bullets: [{ text: 'one', at: 'old' }, { text: 'two' }] } }] });

describe('setIn', () => {
  it('changes one value and leaves the original untouched', () => {
    const s = script();
    const n = setIn(s, 0, ['slide', 'title'], 'New');
    expect(n.scenes[0].slide.title).toBe('New');
    expect(s.scenes[0].slide.title).toBe('Old');
  });
  it('reaches into lists', () => {
    expect(setIn(script(), 0, ['slide', 'bullets', 1, 'text'], 'second').scenes[0].slide.bullets[1].text).toBe('second');
  });
  it('drops the stale captions when the speech changes, but not for other edits', () => {
    expect(setIn(script(), 0, ['spoken'], 'new words').scenes[0].narration).toBeUndefined();
    expect(setIn(script(), 0, ['slide', 'title'], 'x').scenes[0].narration).toBe('old words');
  });
});
