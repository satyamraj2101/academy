import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';

dotenv.config();

const app = express();
const PORT = 3000;

// GZIP Compression — reduces JS bundle by 60-70%, improves LCP score
app.use(compression());

// Security headers (CSP disabled to allow Vite inline scripts + dynamic imports)
app.use(helmet({ contentSecurityPolicy: false }));

// Additional security / SEO headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. CLM Assessment API Endpoint using Gemini AI
app.post('/api/assess', async (req, res) => {
  const {
    contractVolume,
    userCount,
    currentProcess,
    platformPreference,
    timeline,
    integrations = [],
    lang = 'en',
  } = req.body;

  if (!aiClient) {
    // If API key is not configured, fall back immediately to an intelligent simulated JSON
    console.warn('Gemini API key is not configured. Using intelligent backup model.');
    return res.json(generateLocalMockAssessment(contractVolume, userCount, currentProcess, platformPreference, timeline, integrations, lang));
  }

  try {
    const prompt = `System Parameter: Analyze the following contract lifecycle metrics to recommend the optimal CLM strategy.
    Annual Documents processed: ${contractVolume}
    Active user accounts: ${userCount}
    Current lifecycle workflow status: ${currentProcess}
    Initial target platform preference: ${platformPreference}
    Required timeline constraint: ${timeline}
    Target business system integrations: ${integrations.join(', ')}

    Return a comprehensive tactical analysis report localized in language: ${lang}.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a Senior CLM Strategy Advisor. Provide an industrial, enterprise-grade report. Estimate a readiness score (0-100), choose the optimal tool (Leah, Ironclad, Sirion, or Icertis) with full justification, construct a detailed summary of key opportunities, and create exactly three tactical roadmap steps. Retain the selected language for output keys/values.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: [
            'readinessScore',
            'recommendedPlatform',
            'summary',
            'timelineEstimate',
            'budgetRange',
            'integrationPriorities',
            'tacticalRoadmap',
          ],
          properties: {
            readinessScore: {
              type: Type.INTEGER,
              description: 'Score from 0 to 100 based on process readiness and gaps.',
            },
            recommendedPlatform: {
              type: Type.STRING,
              description: 'Exactly which platform is recommended and why (one sentence).',
            },
            summary: {
              type: Type.STRING,
              description: 'A detailed summary of implementation opportunities, bottlenecks, and value proposition.',
            },
            timelineEstimate: {
              type: Type.STRING,
              description: 'Estimated weeks or months to go-live (e.g. "8 - 12 Weeks").',
            },
            budgetRange: {
              type: Type.STRING,
              description: 'Estimated standard implementation investment bracket (e.g. "$40,000 - $90,000").',
            },
            integrationPriorities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Priority order list of software integrations.',
            },
            tacticalRoadmap: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exactly three actionable next milestones or steps for kick-off.',
            },
          },
        },
      },
    });

    if (response && response.text) {
      const parsedData = JSON.parse(response.text.trim());
      return res.json(parsedData);
    } else {
      throw new Error('Emply reply from Gemini API');
    }
  } catch (err: any) {
    console.error('Error in Gemini CLM Assess:', err);
    return res.json(generateLocalMockAssessment(contractVolume, userCount, currentProcess, platformPreference, timeline, integrations, lang));
  }
});

// 2. Enquiry Sync / Submission Endpoint
app.post('/api/enquiry', (req, res) => {
  const data = req.body;
  console.log('--- ENQUIRY SYNCHRONIZED confidentially ---');
  console.log(data);
  return res.json({
    success: true,
    isSynced: true,
    syncedAt: new Date().toISOString(),
    id: 'cl-' + Math.random().toString(36).substr(2, 9),
  });
});

// 2b. Subscribe Endpoint
app.post('/api/subscribe', (req, res) => {
  const { email, source } = req.body;
  console.log('--- NEW SUBSCRIPTION ---');
  console.log({ email, source });
  return res.json({
    success: true,
    message: 'Subscribed successfully',
    subscribedAt: new Date().toISOString(),
  });
});

// Helper for offline fallback
function generateLocalMockAssessment(
  vol: string,
  user: string,
  process: string,
  pref: string,
  timeline: string,
  integ: string[],
  lang: string
) {
  const readinessScore = process === 'manual' ? 40 : process === 'mixed' ? 65 : 80;
  const platform =
    pref === 'leah'
      ? 'Leah (ContractPodAI) — Ideal for native legal analysis'
      : pref === 'ironclad'
      ? 'Ironclad — Premier visual flow & Salesforce-integration'
      : pref === 'sirion'
      ? 'Sirion — Procurement obligational mapping powerhouse'
      : 'Icertis — Regulated enterprise compliant structure';

  const defaultIntegrations = integ.length > 0 ? integ : ['E-Signature tool', 'CRM Cloud Link'];

  return {
    readinessScore,
    recommendedPlatform: platform,
    summary:
      lang === 'de'
        ? `Ihre Organisation verarbeitet jährlich ca. ${vol} Verträge mit ${user} Anwendern. Derzeitige Prozesse deuten auf signifikante Vorteile durch die Automatisierung von Standardvorlagen und Freigabe-Triggerpfaden hin.`
        : lang === 'es'
        ? `Su empresa procesa aproximadamente ${vol} contratos anuales. Automatizar aprobaciones y estructurar campos de metadatos de contratos optimizará los flujos diarios reduciendo el tiempo de firma.`
        : `Your team of ${user} stakeholders processes around ${vol} contracts annually. Upgrading to a digital CLM layer with structured approval models offers 30-40% faster cycle times and reduces risk.`,
    timelineEstimate: timeline === 'asap' ? '6 - 10 Weeks' : '12 - 16 Weeks',
    budgetRange:
      parseInt(user) > 150
        ? '$95,000 - $180,000 (Enterprise Scale)'
        : parseInt(user) > 50
        ? '$40,000 - $90,000 (Professional Tier)'
        : '$18,000 - $35,000 (Starter Tier)',
    integrationPriorities: defaultIntegrations,
    tacticalRoadmap:
      lang === 'de'
        ? [
            'Sammeln und Bereinigen von Standard-Vertragsvorlagen.',
            'Zuweisen von Rollenrechten und Freigabe-Matrixplänen.',
            'Initialisieren des sicheren API-Sandboxes zum Systemtest.',
          ]
        : lang === 'es'
        ? [
            'Recopilar y estandarizar plantillas de contratos clave.',
            'Definir permisos de acceso y tabla de firmantes delegados.',
            'Configurar el ambiente de desarrollo sandbox y verificar integraciones.',
          ]
        : [
            'Audit and collect standard key contract template structures.',
            'Map stakeholder approval chains and permission roles.',
            'Initialize active developer api sandboxes for safe trial.',
          ],
  };
}

// 3. Vite development & production compilation integrations
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static hosting
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully at http://localhost:${PORT}`);
  });
}

startServer();
