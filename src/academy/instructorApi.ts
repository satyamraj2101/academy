// Client for the instructor-scoped API surface — reuses the same JWT/cookie
// login as students (academy_token), NOT the Cloudflare-Access-gated admin
// panel. Every call is scoped server-side to courses the instructor owns.
const BASE = '/api/academy/instructor';

async function instructorFetch(path: string, options?: RequestInit) {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };

  const res = await fetch(BASE + path, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = JSON.parse(text).error || text; } catch { /* not JSON */ }
    throw new Error(message);
  }
  return res.json();
}

export const instructorAPI = {
  apply: {
    status: () => instructorFetch('/apply'),
    submit: (bio?: string) => instructorFetch('/apply', { method: 'POST', body: JSON.stringify({ bio }) }),
  },
  courses: {
    list: () => instructorFetch('/courses'),
    get: (id: string) => instructorFetch(`/courses?id=${id}`),
    create: (data: any) => instructorFetch('/courses', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: any) => instructorFetch('/courses', { method: 'PUT', body: JSON.stringify(data) }),
    duplicate: (id: string) => instructorFetch(`/courses/${id}/duplicate`, { method: 'POST' }),
    structure: (id: string) => instructorFetch(`/courses/${id}/structure`),
  },
  modules: {
    create: (data: any) => instructorFetch('/modules', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: any) => instructorFetch('/modules', { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => instructorFetch(`/modules?id=${id}`, { method: 'DELETE' }),
  },
  lessons: {
    list: (moduleId: string) => instructorFetch(`/lessons?moduleId=${moduleId}`),
    get: (id: string) => instructorFetch(`/lessons?id=${id}`),
    create: (data: any) => instructorFetch('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    update: (data: any) => instructorFetch('/lessons', { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => instructorFetch(`/lessons?id=${id}`, { method: 'DELETE' }),
    saveSections: (id: string, sections: any[]) => instructorFetch(`/lessons/${id}/sections`, { method: 'PUT', body: JSON.stringify({ sections }) }),
  },
  quizzes: {
    listForCourse: (courseId: string) => instructorFetch(`/quizzes?courseId=${courseId}`),
    get: (id: string) => instructorFetch(`/quizzes?id=${id}`),
    create: (data: any) => instructorFetch('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  },
  quizQuestions: {
    create: (data: any) => instructorFetch('/quiz-questions', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => instructorFetch(`/quiz-questions?id=${id}`, { method: 'DELETE' }),
  },
  assignments: {
    create: (data: any) => instructorFetch('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  },
  grading: {
    list: () => instructorFetch('/grading'),
    grade: (data: any) => instructorFetch('/grading', { method: 'POST', body: JSON.stringify(data) }),
  },
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return instructorFetch('/upload', { method: 'POST', body: formData });
  },
};
