import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase } from '@/lib/database';
import { BatterySwap } from '@/models/BatterySwap';
import { BatteryDeviceType } from '@/lib/types';
import { getCurrentSeason } from '@/lib/season';

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

export async function GET(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_swaps.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const seasonParam = request.nextUrl.searchParams.get('season');
    const season = seasonParam ? parseInt(seasonParam, 10) : getCurrentSeason();

    const pool = await BatterySwap.getPoolStatus(season);

    return NextResponse.json(pool);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_swaps.edit']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const data = await request.json();
    const { deviceType, totalCount } = data;

    if (!deviceType || !DEVICE_TYPES.includes(deviceType)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 });
    }
    if (typeof totalCount !== 'number' || totalCount < 0 || !Number.isInteger(totalCount)) {
      return NextResponse.json({ error: 'totalCount must be a non-negative integer' }, { status: 400 });
    }

    await BatterySwap.setPoolCount(deviceType, totalCount);
    const pool = await BatterySwap.getPoolStatus();

    return NextResponse.json(pool);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
