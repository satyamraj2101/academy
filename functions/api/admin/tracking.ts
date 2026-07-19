import { verifyAdminRequest, corsResponse, corsOptionsResponse } from './middleware';

interface Env {
  DB?: D1Database;
  ADMIN_JWT_AUDIENCE?: string;
  ENV?: string;
}

export const onRequestOptions: PagesFunction = async () => corsOptionsResponse();

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const result = await verifyAdminRequest(request, env);
  if ('error' in result) return result.error;
  const { db } = result.context;

  const url = new URL(request.url);
  const view = url.searchParams.get('view') || 'sessions';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (view === 'sessions') {
    const sessions = await db.prepare(
      'SELECT * FROM user_sessions ORDER BY last_seen DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    const total = await db.prepare('SELECT COUNT(*) as count FROM user_sessions').first() as any;
    return corsResponse({ sessions: sessions.results, total: total?.count || 0 });
  }

  if (view === 'events') {
    const events = await db.prepare(
      'SELECT * FROM activity_events ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    return corsResponse({ events: events.results });
  }

  if (view === 'stats') {
    const [totalSessions, convertedSessions, totalPageViews, topPages, topCountries, deviceBreakdown, eventBreakdown] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM user_sessions').first() as any,
      db.prepare('SELECT COUNT(*) as count FROM user_sessions WHERE is_converted = 1').first() as any,
      db.prepare("SELECT COUNT(*) as count FROM activity_events WHERE event_type = 'page_view'").first() as any,
      db.prepare("SELECT page, COUNT(*) as views FROM activity_events WHERE event_type = 'page_view' AND page IS NOT NULL GROUP BY page ORDER BY views DESC LIMIT 10").all(),
      db.prepare("SELECT country, COUNT(*) as count FROM user_sessions WHERE country IS NOT NULL AND country != '' GROUP BY country ORDER BY count DESC LIMIT 10").all(),
      db.prepare("SELECT device_type, COUNT(*) as count FROM user_sessions WHERE device_type IS NOT NULL GROUP BY device_type").all(),
      db.prepare("SELECT event_type, COUNT(*) as count FROM activity_events GROUP BY event_type ORDER BY count DESC").all(),
    ]);

    return corsResponse({
      totalSessions: totalSessions?.count || 0,
      convertedSessions: convertedSessions?.count || 0,
      totalPageViews: totalPageViews?.count || 0,
      conversionRate: totalSessions?.count ? Math.round((convertedSessions?.count || 0) / totalSessions.count * 100) : 0,
      topPages: topPages.results,
      topCountries: topCountries.results,
      deviceBreakdown: deviceBreakdown.results,
      eventBreakdown: eventBreakdown.results,
    });
  }

  return corsResponse({ error: 'Invalid view' });
};
