import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase } from '@/lib/database';
import { getBatteryPoolStatus } from '@/lib/batteryPool';
import { getCurrentSeason } from '@/lib/season';

// Per-device-type summary only -- used by the dashboard's summary tiles and
// /monitor's kiosk chips. For the itemized per-unit list (and to
// add/remove a specific numbered battery), see /api/requests/battery-units.
export async function GET(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_charging.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const seasonParam = request.nextUrl.searchParams.get('season');
    const season = seasonParam ? parseInt(seasonParam, 10) : getCurrentSeason();

    const pool = await getBatteryPoolStatus(season);

    return NextResponse.json(pool);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
