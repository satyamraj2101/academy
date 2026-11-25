export const API_BASE = '/api/academy';

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && endpoint === '/auth/me') {
      return { success: false, user: null };
    }

    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignored
    }
    throw new APIError(errorMessage, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
}

export const academyAPI = {
  auth: {
    me: () => fetchAPI('/auth/me'),
    login: (data: any) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: any) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchAPI('/auth/logout', { method: 'POST' }),
    updateProfile: (data: any) => fetchAPI('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
    getPreferences: () => fetchAPI('/auth/preferences'),
    updatePreferences: (data: any) => fetchAPI('/auth/preferences', { method: 'POST', body: JSON.stringify(data) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      fetchAPI('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
    verify2FA: (tempToken: string, code: string) =>
      fetchAPI('/auth/verify-2fa', { method: 'POST', body: JSON.stringify({ token: tempToken, code }) }),
    setup2FAGenerate: () =>
      fetchAPI('/auth/setup-2fa', { method: 'POST', body: JSON.stringify({ action: 'generate' }) }),
    setup2FAVerify: (code: string) =>
      fetchAPI('/auth/setup-2fa', { method: 'POST', body: JSON.stringify({ action: 'verify', code }) }),
  },
  courses: {
    list: () => fetchAPI('/courses'),
    get: (id: string) => fetchAPI(`/courses/${id}`),
    start: (id: string) => fetchAPI(`/courses/${id}/start`),
    getReviews: (id: string) => fetchAPI(`/courses/${id}/reviews`),
    submitReview: (id: string, rating: number, reviewText?: string) =>
      fetchAPI(`/courses/${id}/reviews`, { method: 'POST', body: JSON.stringify({ rating, reviewText }) }),
  },
  enrollments: {
    list: () => fetchAPI('/enrollments'),
    create: (courseId: string) => fetchAPI('/enrollments', { method: 'POST', body: JSON.stringify({ courseId }) }),
  },
  lessons: {
    get: (id: string) => fetchAPI(`/lessons/${id}`),
    markComplete: (lessonId: string) => fetchAPI('/lessons/progress', { method: 'POST', body: JSON.stringify({ lessonId }) }),
    getNotes: (lessonId: string) => fetchAPI(`/lessons/notes?lessonId=${lessonId}`),
    saveNotes: (lessonId: string, notes: string) => fetchAPI('/lessons/notes', { method: 'POST', body: JSON.stringify({ lessonId, notes }) }),
    getKnowledgeCheck: (lessonId: string) => fetchAPI(`/lessons/knowledge-check?lessonId=${lessonId}`),
    submitKnowledgeCheck: (checkId: string, selectedAnswer: string) => fetchAPI('/lessons/knowledge-check', { method: 'POST', body: JSON.stringify({ checkId, selectedAnswer }) }),
    videoProgress: {
      get: (lessonId: string) => fetchAPI(`/lessons/video-progress?lessonId=${encodeURIComponent(lessonId)}`),
      save: (body: { lessonId: string; videoId: string; position: number; watched: [number, number][]; answers: Record<string, number> }) =>
        fetchAPI('/lessons/video-progress', { method: 'POST', body: JSON.stringify(body), keepalive: true }),
    },
  },
  quizzes: {
    get: (id: string) => fetchAPI(`/quizzes/${id}`),
    start: (id: string) => fetchAPI(`/quizzes/${id}/start`, { method: 'POST' }),
    submit: (id: string, answers: Record<string, string | string[]>, sessionId: string) => fetchAPI(`/quizzes/${id}`, { method: 'POST', body: JSON.stringify({ answers, sessionId }) }),
  },
  assignments: {
    get: (id: string) => fetchAPI(`/assignments/${id}`),
    submit: (id: string, submissionText?: string, submissionFileUrl?: string) =>
      fetchAPI(`/assignments/${id}`, { method: 'POST', body: JSON.stringify({ submissionText, submissionFileUrl }) }),
  },
  discussions: {
    list: (lessonId: string) => fetchAPI(`/discussions?lessonId=${lessonId}`),
    create: (lessonId: string, message: string, parentId?: string) =>
      fetchAPI('/discussions', { method: 'POST', body: JSON.stringify({ lessonId, message, parentId }) }),
    upvote: (discussionId: string) => fetchAPI(`/discussions/${discussionId}/upvote`, { method: 'POST' }),
    markBestAnswer: (discussionId: string) => fetchAPI(`/discussions/${discussionId}/best-answer`, { method: 'POST' }),
  },
  referrals: {
    tree: () => fetchAPI('/referrals/tree'),
    credits: () => fetchAPI('/referrals/credits'),
    applyPartner: () => fetchAPI('/referrals/apply-partner', { method: 'POST' }),
    redemptionHistory: () => fetchAPI('/referrals/redeem'),
    requestPayout: (amountCents: number, payoutDetails: string) =>
      fetchAPI('/referrals/redeem', { method: 'POST', body: JSON.stringify({ amountCents, payoutDetails }) }),
  },
  certificates: {
    list: () => fetchAPI('/certificates'),
  },
  gamification: {
    me: () => fetchAPI('/gamification/me'),
    leaderboard: () => fetchAPI('/gamification/leaderboard'),
  },
  peerReviews: {
    list: () => fetchAPI('/peer-reviews'),
    submit: (reviewId: string, feedbackText: string, score?: number) =>
      fetchAPI(`/peer-reviews/${reviewId}`, { method: 'POST', body: JSON.stringify({ feedbackText, score }) }),
  },
  notifications: {
    list: () => fetchAPI('/notifications'),
    markRead: (opts: { notificationIds?: string[]; markAll?: boolean }) =>
      fetchAPI('/notifications/mark-read', { method: 'POST', body: JSON.stringify(opts) }),
  },
  adminUsers: {
    list: () => fetchAPI('/admin/users'),
    update: (id: string, data: any) => fetchAPI(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI(`/admin/users/${id}`, { method: 'DELETE' }),
  },
  ai: {
    ask: (question: string, lessonId: string) => fetchAPI('/ai/ask', { method: 'POST', body: JSON.stringify({ question, lessonId, mode: 'ask' }) }),
    quizMe: (lessonId: string, numQuestions = 3) => fetchAPI('/ai/ask', { method: 'POST', body: JSON.stringify({ lessonId, mode: 'quiz_me', numQuestions }) }),
  },
};
