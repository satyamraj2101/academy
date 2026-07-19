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

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalEnquiries, todayEnquiries, newEnquiries, totalSessions, todaysessions,
    totalAssessments, todayAssessments, totalChats, todayChats, recentActivity] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM enquiry_submissions').first() as any,
    db.prepare("SELECT COUNT(*) as count FROM enquiry_submissions WHERE submitted_at >= ?").bind(today).first() as any,
    db.prepare("SELECT COUNT(*) as count FROM enquiry_submissions WHERE status = 'new'").first() as any,
    db.prepare('SELECT COUNT(*) as count FROM user_sessions').first() as any,
    db.prepare('SELECT COUNT(*) as count FROM user_sessions WHERE first_seen >= ?').bind(today).first() as any,
    db.prepare('SELECT COUNT(*) as count FROM assessment_submissions').first() as any,
    db.prepare('SELECT COUNT(*) as count FROM assessment_submissions WHERE submitted_at >= ?').bind(today).first() as any,
    db.prepare('SELECT COUNT(*) as count FROM chat_sessions').first() as any,
    db.prepare('SELECT COUNT(*) as count FROM chat_sessions WHERE started_at >= ?').bind(today).first() as any,
    db.prepare('SELECT event_type, page, created_at, email FROM activity_events ORDER BY created_at DESC LIMIT 20').all(),
  ]);

  const enquiryStatus = await db
    .prepare("SELECT status, COUNT(*) as count FROM enquiry_submissions GROUP BY status")
    .all();

  const topPages = await db
    .prepare("SELECT page, COUNT(*) as views FROM activity_events WHERE event_type = 'page_view' AND page IS NOT NULL GROUP BY page ORDER BY views DESC LIMIT 10")
    .all();

  const conversionRate = totalSessions?.count
    ? Math.round((await db.prepare('SELECT COUNT(*) as count FROM user_sessions WHERE is_converted = 1').first() as any || { count: 0 }).count / totalSessions.count * 100)
    : 0;

  const weeklyEnquiries = await db
    .prepare("SELECT DATE(submitted_at) as day, COUNT(*) as count FROM enquiry_submissions WHERE submitted_at >= ? GROUP BY day ORDER BY day")
    .bind(sevenDaysAgo)
    .all();

  return corsResponse({
    stats: {
      totalEnquiries: totalEnquiries?.count || 0,
      todayEnquiries: todayEnquiries?.count || 0,
      newEnquiries: newEnquiries?.count || 0,
      totalSessions: totalSessions?.count || 0,
      todaySessions: todaysessions?.count || 0,
      totalAssessments: totalAssessments?.count || 0,
      todayAssessments: todayAssessments?.count || 0,
      totalChats: totalChats?.count || 0,
      todayChats: todayChats?.count || 0,
      conversionRate,
    },
    enquiryStatus: enquiryStatus?.results || [],
    topPages: topPages?.results || [],
    recentActivity: recentActivity?.results || [],
    weeklyEnquiries: weeklyEnquiries?.results || [],
  });
};
