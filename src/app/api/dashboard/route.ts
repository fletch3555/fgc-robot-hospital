import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, query } from "@/lib/database";
import { Request } from "@/models/Request";
import { requireAuthentication } from "@/lib/authn";
import { getCurrentSeason } from "@/lib/season";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthentication();
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    await connectToDatabase();

    const isDashboard = request.nextUrl.searchParams.get('dashboard') === 'true';
    const allSeasons = request.nextUrl.searchParams.get('allSeasons') === 'true';
    const season = allSeasons ? 'all' : undefined;

    if (isDashboard) {
      // Get counts and requests for each request type
      const [
        hardwareData,
        softwareData,
        machineShopData,
        batteryChargingData,
        recentRequests
      ] = await Promise.all([
        getRequestsAndCounts('hardware', season),
        getRequestsAndCounts('software', season),
        getRequestsAndCounts('machine_shop', season),
        getRequestsAndCounts('battery_charging', season),
        Request.findAll({ season })
      ]);

      // Get only the 10 most recent requests
      const recentRequestsLimited = recentRequests.slice(0, 10);

      return NextResponse.json({
        hardware: hardwareData,
        software: softwareData,
        machine_shop: machineShopData,
        battery_charging: batteryChargingData,
        recentRequests: recentRequestsLimited
      });
    }

    // Regular requests listing
    const requests = await Request.findAll({ season });

    return NextResponse.json(requests);
  } catch (error: unknown) {
    console.error("Error in GET /api/dashboard:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getRequestsAndCounts(type: string, season: 'all' | undefined) {
  const seasonValue = season === 'all' ? 'all' : getCurrentSeason();
  const seasonClause = seasonValue === 'all' ? '' : 'AND season = $2';
  const seasonValues = seasonValue === 'all' ? [type] : [type, seasonValue];

  // Get counts by status for the specific type
  const countsResult = await query(`
    SELECT status, COUNT(*) as count
    FROM requests
    WHERE type = $1 ${seasonClause}
    GROUP BY status
  `, seasonValues);

  // Get specific requests for the type (pending and in-progress for most, all for machine shop)
  let requestsResult;
  if (type === 'machine_shop') {
    // For machine shop: get all requests
    requestsResult = await query(`
      SELECT *
      FROM requests
      WHERE type = $1 ${seasonClause}
      ORDER BY created_at DESC
    `, seasonValues);
  } else if (type === 'battery_charging') {
    // For battery charging: get in-progress and completed requests
    requestsResult = await query(`
      SELECT *
      FROM requests
      WHERE type = $1 AND status IN ('in-progress', 'completed') ${seasonClause}
      ORDER BY created_at DESC
    `, seasonValues);
  } else {
    // For hardware/software: get pending and in-progress requests
    requestsResult = await query(`
      SELECT *
      FROM requests
      WHERE type = $1 AND status IN ('open', 'in-progress') ${seasonClause}
      ORDER BY created_at DESC
    `, seasonValues);
  }

  // Process counts into the expected format
  const counts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    canceled: 0
  };

  countsResult.rows.forEach((row: { status: string; count: string }) => {
    const status = row.status;
    const count = parseInt(row.count);
    
    if (status === 'open') {
      counts.pending = count;
    } else if (status === 'in-progress') {
      counts.in_progress = count;
    } else if (status === 'completed') {
      counts.completed = count;
    } else if (status === 'canceled') {
      counts.canceled = count;
    }
  });

  return {
    pending: counts.pending,
    in_progress: counts.in_progress,
    completed: counts.completed,
    canceled: counts.canceled,
    requests: requestsResult.rows
  };
}