import { NextRequest, NextResponse } from 'next/server';
import { BatterySwap } from '@/models/BatterySwap';
import { connectToDatabase } from '@/lib/database';
import { checkPermissions } from '@/lib/authz';
import { isValidCountryCode } from '@/lib/countryUtils';
import { BatteryDeviceType } from '@/lib/types';

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['battery_swaps.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const swap = await BatterySwap.findById(params.id);

    if (!swap) {
      return NextResponse.json({ error: 'Battery swap not found' }, { status: 404 });
    }

    return NextResponse.json(swap);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['battery_swaps.edit']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const data = await request.json();
    const { countryCode, deviceType, notes } = data;

    if (countryCode !== undefined && !isValidCountryCode(countryCode)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
    }
    if (deviceType !== undefined && !DEVICE_TYPES.includes(deviceType)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 });
    }

    const updatedSwap = await BatterySwap.update(params.id, { countryCode, deviceType, notes });

    if (!updatedSwap) {
      return NextResponse.json({ error: 'Battery swap not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSwap);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const authz = await checkPermissions(['battery_swaps.return']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    if (!authz.session?.user?.id) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    const updatedSwap = await BatterySwap.markReturned(params.id, authz.session.user.id);

    if (!updatedSwap) {
      return NextResponse.json({ error: 'Battery swap not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSwap);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
