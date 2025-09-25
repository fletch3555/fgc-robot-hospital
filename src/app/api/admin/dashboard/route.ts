import { NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase, query } from '@/lib/database';

export async function GET() {
  try {
    const authz = await checkPermissions(['admin.dashboard']);
    
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    // Get dashboard statistics with SQL queries
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      userStats,
      requestStats,
      sparePartStats,
      teamStats
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN updated_at >= $1 THEN 1 END) as active_users
        FROM users
      `, [thirtyDaysAgo.toISOString()]),
      query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
        FROM requests
      `),
      query(`
        SELECT 
          COUNT(*) as total_spare_parts,
          COUNT(CASE WHEN status = 'issued' THEN 1 END) as issued_spare_parts
        FROM spare_parts
      `),
      query(`
        SELECT 
          COUNT(*) as total_teams,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_teams_this_month
        FROM teams
      `, [thirtyDaysAgo.toISOString()])
    ]);

    const stats = {
      totalUsers: parseInt(String(userStats.rows[0].total_users)),
      activeUsers: parseInt(String(userStats.rows[0].active_users)),
      totalRequests: parseInt(String(requestStats.rows[0].total_requests)),
      pendingRequests: parseInt(String(requestStats.rows[0].pending_requests)),
      totalSpareParts: parseInt(String(sparePartStats.rows[0].total_spare_parts)),
      issuedSpareParts: parseInt(String(sparePartStats.rows[0].issued_spare_parts)),
      totalTeams: parseInt(String(teamStats.rows[0].total_teams)),
      newTeamsThisMonth: parseInt(String(teamStats.rows[0].new_teams_this_month)),
    };

    return NextResponse.json(stats);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}