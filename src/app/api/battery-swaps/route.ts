import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase } from '@/lib/database';
import { isValidCountryCode } from '@/lib/countryUtils';
import { BatterySwap } from '@/models/BatterySwap';
import { BatteryDeviceType, BatterySwapStatus } from '@/lib/types';
import { getCurrentSeason } from '@/lib/season';

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];
const STATUSES: BatterySwapStatus[] = ['swapped', 'returned'];

export async function POST(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_swaps.create']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    if (!authz.session?.user?.id) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    const data = await request.json();
    const { countryCode, deviceType, notes } = data;

    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }
    if (!isValidCountryCode(countryCode)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
    }
    if (!deviceType || !DEVICE_TYPES.includes(deviceType)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 });
    }

    const swap = await BatterySwap.create({
      countryCode,
      deviceType,
      submittedBy: authz.session.user.id,
      notes: notes || undefined,
    });

    return NextResponse.json({ swap }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_swaps.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('countryCode') || undefined;
    const deviceTypeParam = searchParams.get('deviceType');
    const statusParam = searchParams.get('status');
    const allSeasons = searchParams.get('allSeasons') === 'true';

    const deviceType = deviceTypeParam && DEVICE_TYPES.includes(deviceTypeParam as BatteryDeviceType)
      ? (deviceTypeParam as BatteryDeviceType)
      : undefined;
    const status = statusParam && STATUSES.includes(statusParam as BatterySwapStatus)
      ? (statusParam as BatterySwapStatus)
      : undefined;

    const swaps = await BatterySwap.findAll({
      countryCode,
      deviceType,
      status,
      season: allSeasons ? 'all' : getCurrentSeason(),
    });

    return NextResponse.json(swaps);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
