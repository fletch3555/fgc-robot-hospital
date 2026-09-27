import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, query } from "@/lib/database";
import { requireAuthentication } from "@/lib/authn";
import { getCurrentSeason } from "@/lib/season";

type Season = number | 'all';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthentication();
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    await connectToDatabase();

    const allSeasons = request.nextUrl.searchParams.get('allSeasons') === 'true';
    const season: Season = allSeasons ? 'all' : getCurrentSeason();

    // Get comprehensive analytics data. Events run ~4-5 days, so every query
    // here is scoped to the season (== the event) rather than a rolling
    // week/month window that wouldn't mean anything at this timescale.
    const [
      requestsByStatus,
      requestsByType,
      openRequestsByType,
      performanceMetrics,
      averageResolutionTime,
      completedByDay,
    ] = await Promise.all([
      getRequestsByStatus(season),
      getRequestsByType(season),
      getOpenRequestsByType(season),
      getPerformanceMetrics(season),
      getAverageResolutionTime(season),
      getCompletedByDay(season),
    ]);

    return NextResponse.json({
      requestsByStatus,
      requestsByType,
      openRequestsByType,
      performanceMetrics,
      averageResolutionTime,
      completedByDay,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/dashboard/analytics:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function seasonFilter(season: Season, paramIndex: number): { clause: string; values: unknown[] } {
  if (season === 'all') {
    return { clause: '', values: [] };
  }
  return { clause: `season = $${paramIndex}`, values: [season] };
}

async function getRequestsByStatus(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count
    FROM requests
    ${clause ? `WHERE ${clause}` : ''}
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'open' THEN 1
        WHEN 'in-progress' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'cancelled' THEN 4
      END
  `, values);

  return result.rows.map((row: {status: string; count: string; today_count: string; week_count: string}) => ({
    status: row.status,
    total: parseInt(row.count),
    today: parseInt(row.today_count),
    thisWeek: parseInt(row.week_count)
  }));
}

async function getRequestsByType(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count
    FROM requests
    ${clause ? `WHERE ${clause}` : ''}
    GROUP BY type
    ORDER BY total DESC
  `, values);

  return result.rows.map((row: {type: string; total: string; open: string; in_progress: string; completed: string; today_count: string}) => ({
    type: row.type,
    total: parseInt(row.total),
    open: parseInt(row.open),
    inProgress: parseInt(row.in_progress),
    completed: parseInt(row.completed),
    todayCount: parseInt(row.today_count)
  }));
}

async function getOpenRequestsByType(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      type,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_age_hours
    FROM requests
    WHERE status = 'open'
      ${clause ? `AND ${clause}` : ''}
    GROUP BY type
    ORDER BY count DESC
  `, values);

  return result.rows.map((row: {type: string; count: string; avg_age_hours: string}) => ({
    type: row.type,
    count: parseInt(row.count),
    averageAgeHours: parseFloat(row.avg_age_hours || '0')
  }));
}

async function getPerformanceMetrics(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= CURRENT_DATE) as completed_today,
      COUNT(*) FILTER (WHERE status IN ('open', 'in-progress')) as active_requests,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) FILTER (WHERE status = 'completed') as avg_resolution_minutes
    FROM requests
    ${clause ? `WHERE ${clause}` : ''}
  `, values);

  const row = result.rows[0] as {
    total_completed?: string;
    completed_today?: string;
    active_requests?: string;
    avg_resolution_minutes?: string;
  };
  return {
    totalCompleted: parseInt(row.total_completed || '0'),
    completedToday: parseInt(row.completed_today || '0'),
    activeRequests: parseInt(row.active_requests || '0'),
    averageResolutionMinutes: parseFloat(row.avg_resolution_minutes || '0')
  };
}

// No time-window filter beyond season -- a season is one ~4-5 day event, so
// season scoping already bounds this to "the whole event" rather than an
// arbitrary rolling window that would either clip event data or (past 30
// days) never actually filter anything out.
async function getAverageResolutionTime(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      type,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_minutes,
      COUNT(*) as completed_count
    FROM requests
    WHERE status = 'completed'
      ${clause ? `AND ${clause}` : ''}
    GROUP BY type
  `, values);

  return result.rows.map((row: {type: string; avg_minutes: string; completed_count: string}) => ({
    type: row.type,
    averageMinutes: parseFloat(row.avg_minutes || '0'),
    completedCount: parseInt(row.completed_count)
  }));
}

// Ascending, whole-event span (see getAverageResolutionTime) -- reads as a
// day-by-day timeline of the event rather than a "last N days" recency list.
async function getCompletedByDay(season: Season) {
  const { clause, values } = seasonFilter(season, 1);
  const result = await query(`
    SELECT
      DATE(updated_at) as date,
      COUNT(*) as count
    FROM requests
    WHERE status = 'completed'
      ${clause ? `AND ${clause}` : ''}
    GROUP BY DATE(updated_at)
    ORDER BY date ASC
  `, values);

  return result.rows.map((row: {date: Date; count: string}) => ({
    date: row.date.toISOString().split('T')[0],
    count: parseInt(row.count)
  }));
}

// async function getPriorityDistribution() {
//   const result = await query(`
//     SELECT
//       priority,
//       COUNT(*) as total,
//       COUNT(*) FILTER (WHERE status = 'open') as open,
//       COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress
//     FROM requests
//     GROUP BY priority
//     ORDER BY
//       CASE priority
//         WHEN 'urgent' THEN 1
//         WHEN 'high' THEN 2
//         WHEN 'medium' THEN 3
//         WHEN 'low' THEN 4
//       END
//   `);

//   return result.rows.map((row: {priority: string; total: string; open: string; in_progress: string}) => ({
//     priority: row.priority,
//     total: parseInt(row.total),
//     open: parseInt(row.open),
//     inProgress: parseInt(row.in_progress)
//   }));
// }
