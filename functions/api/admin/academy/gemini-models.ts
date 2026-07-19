import { verifyAdminRequest, corsResponse, corsOptionsResponse, errorResponse, hasPermission } from '../middleware';

interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

// Curated fallback list used if the live ListModels call fails or the key lacks access —
// keeps the model picker usable instead of empty.
const FALLBACK_MODELS = [
  { name: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (recommended)' },
  { name: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
  { name: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
];

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { context } = result;

  if (!hasPermission(context.admin, 'academy')) {
    return errorResponse('Forbidden — insufficient permissions', 403);
  }

  if (!env.GEMINI_API_KEY) {
    return errorResponse('GEMINI_API_KEY is not configured on the server.', 500);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`);
    if (!res.ok) {
      return corsResponse({ success: true, models: FALLBACK_MODELS, live: false });
    }

    const data = await res.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
    const models = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      // Preview/experimental models are advertised by ListModels but are often
      // gated to allowlisted projects and fail at generateContent time even
      // though they claim support — stick to stable, generally-available
      // models so the picker only ever offers models that actually work.
      .filter(m => /gemini/i.test(m.name) && !/vision|embedding|aqa|tts|image|robotics|computer-use|preview|exp\b|experimental/i.test(m.name))
      .map(m => ({ name: m.name.replace(/^models\//, ''), displayName: m.displayName || m.name.replace(/^models\//, '') }));

    if (models.length === 0) {
      return corsResponse({ success: true, models: FALLBACK_MODELS, live: false });
    }

    return corsResponse({ success: true, models, live: true });
  } catch {
    return corsResponse({ success: true, models: FALLBACK_MODELS, live: false });
  }
};
