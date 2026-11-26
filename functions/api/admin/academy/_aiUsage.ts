// A small per-day counter for the free AI allowance (table academy_ai_usage, migration 0032). One row per day and kind.

/** Counts one call against today's cap for `kind`. Returns false (and counts nothing) when the cap is already reached. */
export async function takeSlot(db: D1Database, kind: string, cap: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db.prepare(
    `INSERT INTO academy_ai_usage (day, kind, calls) VALUES (?, ?, 1)
     ON CONFLICT(day, kind) DO UPDATE SET calls = calls + 1 WHERE calls < ?
     RETURNING calls`,
  ).bind(day, kind, cap).first();
  return !!row;
}
