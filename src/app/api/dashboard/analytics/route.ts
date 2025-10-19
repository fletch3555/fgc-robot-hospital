import { NextResponse } from "next/server";
import { connectToDatabase, query } from "@/lib/database";
import { requireAuthentication } from "@/lib/authn";

export async function GET() {
  try {
    const authResult = await requireAuthentication();
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    await connectToDatabase();

    // Get comprehensive analytics data
    const [
      requestsByStatus,
      requestsByType,
      dailyCompletions,
      openRequestsByType,
      sparePartsStats,
      performanceMetrics,
      averageResolutionTime,
      // priorityDistribution
    ] = await Promise.all([
      getRequestsByStatus(),
      getRequestsByType(),
      getDailyCompletions(),
      getOpenRequestsByType(),
      getSparePartsStats(),
      getPerformanceMetrics(),
      getAverageResolutionTime(),
      // getPriorityDistribution()
    ]);

    return NextResponse.json({
      requestsByStatus,
      requestsByType,
      dailyCompletions,
      openRequestsByType,
      sparePartsStats,
      performanceMetrics,
      averageResolutionTime,
      // priorityDistribution
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/dashboard/analytics:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getRequestsByStatus() {
  const result = await query(`
    SELECT 
      status,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count
    FROM requests
    GROUP BY status
    ORDER BY 
      CASE status 
        WHEN 'open' THEN 1 
        WHEN 'in-progress' THEN 2 
        WHEN 'completed' THEN 3 
        WHEN 'cancelled' THEN 4 
      END
  `);

  return result.rows.map((row: {status: string; count: string; today_count: string; week_count: string}) => ({
    status: row.status,
    total: parseInt(row.count),
    today: parseInt(row.today_count),
    thisWeek: parseInt(row.week_count)
  }));
}

async function getRequestsByType() {
  const result = await query(`
    SELECT 
      type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'open') as open,
      COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count
    FROM requests
    GROUP BY type
    ORDER BY total DESC
  `);

  return result.rows.map((row: {type: string; total: string; open: string; in_progress: string; completed: string; today_count: string}) => ({
    type: row.type,
    total: parseInt(row.total),
    open: parseInt(row.open),
    inProgress: parseInt(row.in_progress),
    completed: parseInt(row.completed),
    todayCount: parseInt(row.today_count)
  }));
}

async function getDailyCompletions() {
  const result = await query(`
    SELECT 
      DATE(updated_at) as date,
      COUNT(*) as count
    FROM requests
    WHERE status = 'completed' 
      AND updated_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(updated_at)
    ORDER BY date DESC
    LIMIT 7
  `);

  const today = new Date().toISOString().split('T')[0];
  const todayCount = result.rows.find((row: {date: Date; count: string}) => row.date.toISOString().split('T')[0] === today)?.count || 0;
  
  return {
    today: parseInt(todayCount.toString()),
    last7Days: result.rows.map((row: {date: Date; count: string}) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count)
    }))
  };
}

async function getOpenRequestsByType() {
  const result = await query(`
    SELECT 
      type,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_age_hours
    FROM requests
    WHERE status = 'open'
    GROUP BY type
    ORDER BY count DESC
  `);

  return result.rows.map((row: {type: string; count: string; avg_age_hours: string}) => ({
    type: row.type,
    count: parseInt(row.count),
    averageAgeHours: parseFloat(row.avg_age_hours || '0')
  }));
}

async function getSparePartsStats() {
  try {
    // Get overall spare parts statistics
    const overallResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'issued') as total_issued,
        COUNT(*) FILTER (WHERE status = 'returned') as total_returned,
        COUNT(*) FILTER (WHERE status = 'issued' AND is_loan = true) as currently_loaned,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as issued_today
      FROM spare_parts
    `);

    // Get spare parts by category (using FGC inventory groups)
    const categoryResult = await query(`
      SELECT 
        COALESCE(sp.fgc_part_number, 'Unknown') as category,
        COUNT(*) FILTER (WHERE status = 'issued') as issued,
        COUNT(*) FILTER (WHERE status = 'returned') as returned,
        COUNT(*) FILTER (WHERE status = 'issued' AND is_loan = true) as pending_return
      FROM spare_parts sp
      GROUP BY sp.fgc_part_number
      ORDER BY issued DESC
      LIMIT 10
    `);

    const overall = overallResult.rows[0] as {
      total_issued: string;
      total_returned: string;
      currently_loaned: string;
      issued_today: string;
    };

    return {
      totalIssued: parseInt(overall.total_issued || '0'),
      totalReturned: parseInt(overall.total_returned || '0'),
      currentlyLoaned: parseInt(overall.currently_loaned || '0'),
      pendingRequests: 0, // Not applicable for direct issuance workflow
      issuedToday: parseInt(overall.issued_today || '0'),
      byCategory: categoryResult.rows.map((row: {category: string; issued: string; returned: string; pending_return: string}) => ({
        category: row.category,
        issued: parseInt(row.issued),
        returned: parseInt(row.returned),
        pendingReturn: parseInt(row.pending_return)
      }))
    };
  } catch (error) {
    console.error('Error getting spare parts stats:', error);
    // Return default structure if query fails
    return {
      totalIssued: 0,
      totalReturned: 0,
      currentlyLoaned: 0,
      pendingRequests: 0,
      issuedToday: 0,
      byCategory: []
    };
  }
}

async function getPerformanceMetrics() {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= CURRENT_DATE) as completed_today,
      COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= CURRENT_DATE - INTERVAL '7 days') as completed_week,
      COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= CURRENT_DATE - INTERVAL '30 days') as completed_month,
      COUNT(*) FILTER (WHERE status IN ('open', 'in-progress')) as active_requests,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_resolution_hours
    FROM requests
  `);

  const row = result.rows[0] as {
    total_completed?: string;
    completed_today?: string;
    completed_week?: string;
    completed_month?: string;
    active_requests?: string;
    avg_resolution_hours?: string;
  };
  return {
    totalCompleted: parseInt(row.total_completed || '0'),
    completedToday: parseInt(row.completed_today || '0'),
    completedThisWeek: parseInt(row.completed_week || '0'),
    completedThisMonth: parseInt(row.completed_month || '0'),
    activeRequests: parseInt(row.active_requests || '0'),
    averageResolutionHours: parseFloat(row.avg_resolution_hours || '0')
  };
}

async function getAverageResolutionTime() {
  const result = await query(`
    SELECT 
      type,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours,
      COUNT(*) as completed_count
    FROM requests
    WHERE status = 'completed'
      AND updated_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY type
  `);

  return result.rows.map((row: {type: string; avg_hours: string; completed_count: string}) => ({
    type: row.type,
    averageHours: parseFloat(row.avg_hours || '0'),
    completedCount: parseInt(row.completed_count)
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