import { GoogleGenAI, Type } from '@google/genai';

interface Env {
  GEMINI_API_KEY?: string;
  DB?: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: CORS,
    });
  }

  const {
    contractVolume = '',
    userCount = '',
    currentProcess = '',
    platformPreference = '',
    timeline = '',
    integrations = [],
    lang = 'en',
    sessionId = null,
    email = null,
  } = body as Record<string, unknown>;

  const apiKey = env.GEMINI_API_KEY;
  let result: Record<string, unknown>;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    result = generateLocalMockAssessment(
      contractVolume as string, userCount as string, currentProcess as string,
      platformPreference as string, timeline as string, integrations as string[], lang as string
    );
  } else {
    try {
      const aiClient = new GoogleGenAI({ apiKey });
      const prompt = `System Parameter: Analyze the following contract lifecycle metrics to recommend the optimal CLM strategy.
    Annual Documents processed: ${contractVolume}\n    Active user accounts: ${userCount}\n    Current lifecycle workflow status: ${currentProcess}\n    Initial target platform preference: ${platformPreference}\n    Required timeline constraint: ${timeline}\n    Target business system integrations: ${(integrations as string[]).join(', ')}\n\n    Return a comprehensive tactical analysis report localized in language: ${lang}.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are a Senior CLM Strategy Advisor. Provide an industrial, enterprise-grade report. Estimate a readiness score (0-100), choose the optimal tool (Leah, Ironclad, Sirion, or Icertis) with full justification, construct a detailed summary of key opportunities, and create exactly three tactical roadmap steps. Retain the selected language for output keys/values.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['readinessScore', 'recommendedPlatform', 'summary', 'timelineEstimate', 'budgetRange', 'integrationPriorities', 'tacticalRoadmap'],
            properties: {
              readinessScore: { type: Type.INTEGER, description: 'Score 0–100 based on process readiness.' },
              recommendedPlatform: { type: Type.STRING, description: 'Platform recommended with one-sentence justification.' },
              summary: { type: Type.STRING, description: 'Detailed summary of opportunities, bottlenecks, value proposition.' },
              timelineEstimate: { type: Type.STRING, description: 'Estimated weeks/months to go-live.' },
              budgetRange: { type: Type.STRING, description: 'Estimated investment bracket.' },
              integrationPriorities: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Priority integration list.' },
              tacticalRoadmap: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Exactly three next milestones.' },
            },
          },
        },
      });

      if (response?.text) {
        result = JSON.parse(response.text.trim());
      } else {
        throw new Error('Empty Gemini response');
      }
    } catch (err: unknown) {
      console.error('[/api/assess] Gemini error:', (err as Error)?.message ?? err);
      result = generateLocalMockAssessment(
        contractVolume as string, userCount as string, currentProcess as string,
        platformPreference as string, timeline as string, integrations as string[], lang as string
      );
    }
  }

  // Persist assessment to D1 if DB is bound
  if (env.DB) {
    try {
      const submissionId = 'assess-' + crypto.randomUUID().slice(0, 8);
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO assessment_submissions
          (id, session_id, email, contract_volume, user_count, current_process, platform_preference, timeline, integrations, lang, result_json, recommended_platform, readiness_score, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        submissionId,
        (sessionId as string) || null,
        (email as string) || null,
        contractVolume as string,
        userCount as string,
        currentProcess as string,
        platformPreference as string,
        timeline as string,
        JSON.stringify(integrations),
        lang as string,
        JSON.stringify(result),
        result.recommendedPlatform as string || null,
        result.readinessScore as number || null,
        now
      ).run();
    } catch (e) {
      console.error('[/api/assess] D1 write error:', e);
    }
  }

  return new Response(JSON.stringify(result), { headers: CORS });
};

// ─── Local mock (mirrors server.ts fallback) ──────────────────────────────────
function generateLocalMockAssessment(
  vol: string, user: string, process: string, pref: string,
  timeline: string, integ: string[], lang: string
) {
  const readinessScore = process === 'manual' ? 40 : process === 'mixed' ? 65 : 80;
  const platform =
    pref === 'leah'     ? 'Leah (ContractPodAI) — Ideal for native legal analysis'
    : pref === 'ironclad' ? 'Ironclad — Premier visual flow & Salesforce-integration'
    : pref === 'sirion'   ? 'Sirion — Procurement obligational mapping powerhouse'
    :                       'Icertis — Regulated enterprise compliant structure';

  const defaultIntegrations = integ.length > 0 ? integ : ['E-Signature tool', 'CRM Cloud Link'];

  return {
    readinessScore,
    recommendedPlatform: platform,
    summary:
      lang === 'de'
        ? `Ihre Organisation verarbeitet jährlich ca. ${vol} Verträge mit ${user} Anwendern. Automatisierung bietet erhebliche Vorteile.`
        : lang === 'es'
        ? `Su empresa procesa aproximadamente ${vol} contratos anuales. Automatizar aprobaciones optimizará los flujos.`
        : `Your team of ${user} stakeholders processes around ${vol} contracts annually. Upgrading to a digital CLM layer with structured approval models offers 30–40% faster cycle times.`,
    timelineEstimate: timeline === 'asap' ? '6 - 10 Weeks' : '12 - 16 Weeks',
    budgetRange:
      parseInt(user) > 150 ? '$95,000 - $180,000 (Enterprise Scale)'
      : parseInt(user) > 50  ? '$40,000 - $90,000 (Professional Tier)'
      :                         '$18,000 - $35,000 (Starter Tier)',
    integrationPriorities: defaultIntegrations,
    tacticalRoadmap:
      lang === 'de'
        ? ['Sammeln und Bereinigen von Standard-Vertragsvorlagen.', 'Zuweisen von Rollenrechten und Freigabe-Matrixplänen.', 'Initialisieren des sicheren API-Sandboxes zum Systemtest.']
        : lang === 'es'
        ? ['Recopilar y estandarizar plantillas de contratos clave.', 'Definir permisos de acceso y tabla de firmantes delegados.', 'Configurar el ambiente de desarrollo sandbox y verificar integraciones.']
        : ['Audit and collect standard key contract template structures.', 'Map stakeholder approval chains and permission roles.', 'Initialize developer sandboxes for safe integration trials.'],
  };
}
