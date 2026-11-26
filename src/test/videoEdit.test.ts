import { describe, it, expect } from 'vitest';
import { claimTypes, kickConfig, validateVideoEdit, MAX_VIDEO_REQUEST, VIDEO_EDIT_JOB } from '../../functions/api/admin/academy/_videoEdit';

describe('validateVideoEdit', () => {
  const ok = { courseId: 'c-1', lessonId: 'l_2', videoId: '7a663a47-d1c2', instruction: '  make it shorter ' };
  it('keeps only the known fields and trims the request', () => {
    const r = validateVideoEdit({ ...ok, evil: 'x', __proto__: { y: 1 } });
    expect(r.ok && r.payload).toEqual({ courseId: 'c-1', lessonId: 'l_2', videoId: '7a663a47-d1c2', instruction: 'make it shorter' });
  });
  it('allows an empty request (rebuild from the lesson text)', () => {
    const r = validateVideoEdit({ ...ok, instruction: undefined });
    expect(r.ok && r.payload.instruction).toBe('');
  });
  it('needs the three ids and rejects odd characters in them', () => {
    expect(validateVideoEdit({ ...ok, lessonId: '' }).ok).toBe(false);
    expect(validateVideoEdit({ ...ok, videoId: 'a/b' }).ok).toBe(false);
    expect(validateVideoEdit({ ...ok, courseId: "x'; DROP TABLE" }).ok).toBe(false);
    expect(validateVideoEdit(null).ok).toBe(false);
  });
  it('limits the request length', () => {
    expect(validateVideoEdit({ ...ok, instruction: 'x'.repeat(MAX_VIDEO_REQUEST + 1) }).ok).toBe(false);
  });
});

describe('claimTypes', () => {
  it('keeps known job types and drops the rest', () => {
    expect(claimTypes([VIDEO_EDIT_JOB, 'rm -rf', 7, 'course_from_prompt'])).toEqual([VIDEO_EDIT_JOB, 'course_from_prompt']);
  });
  it('is empty (meaning any) when nothing valid is given', () => {
    expect(claimTypes(undefined)).toEqual([]);
    expect(claimTypes('course_from_prompt')).toEqual([]);
  });
});

describe('kickConfig', () => {
  it('needs an https url and a token', () => {
    expect(kickConfig({ MODAL_JOBS_URL: 'https://x.modal.run', MODAL_JOBS_TOKEN: 't' })).toEqual({ url: 'https://x.modal.run', token: 't' });
    expect(kickConfig({ MODAL_JOBS_URL: 'http://x.modal.run', MODAL_JOBS_TOKEN: 't' })).toBeNull();
    expect(kickConfig({ MODAL_JOBS_URL: 'https://x.modal.run' })).toBeNull();
    expect(kickConfig({})).toBeNull();
  });
});
