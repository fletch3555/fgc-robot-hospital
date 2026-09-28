import { NextRequest, NextResponse } from 'next/server';
import { checkPermissions } from '@/lib/authz';
import { connectToDatabase } from '@/lib/database';
import { getBatteryUnits, addBatteryUnit, removeBatteryUnit, BatteryUnitCheckedOutError } from '@/lib/batteryPool';
import { BatteryDeviceType } from '@/lib/types';
import { getCurrentSeason } from '@/lib/season';

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

function validateUnitBody(data: unknown): { deviceType: BatteryDeviceType; number: number } | { error: string } {
  const { deviceType, number } = (data ?? {}) as { deviceType?: string; number?: number };

  if (!deviceType || !DEVICE_TYPES.includes(deviceType as BatteryDeviceType)) {
    return { error: 'Invalid device type' };
  }
  if (typeof number !== 'number' || number <= 0 || !Number.isInteger(number)) {
    return { error: 'number must be a positive integer' };
  }

  return { deviceType: deviceType as BatteryDeviceType, number };
}

// Itemized per-unit list (and add/remove a specific numbered battery). For
// the per-device-type summary used by the dashboard/monitor, see
// /api/requests/pool instead.
export async function GET(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_charging.view']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const seasonParam = request.nextUrl.searchParams.get('season');
    const season = seasonParam ? parseInt(seasonParam, 10) : getCurrentSeason();

    const units = await getBatteryUnits(season);

    return NextResponse.json(units);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_charging.configure']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const validated = validateUnitBody(await request.json());
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    await addBatteryUnit(validated.deviceType, validated.number);
    const units = await getBatteryUnits();

    return NextResponse.json(units, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authz = await checkPermissions(['battery_charging.configure']);
    if (!authz.authorized) {
      return authz.response!;
    }

    await connectToDatabase();

    const validated = validateUnitBody(await request.json());
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    await removeBatteryUnit(validated.deviceType, validated.number);
    const units = await getBatteryUnits();

    return NextResponse.json(units);
  } catch (error: unknown) {
    if (error instanceof BatteryUnitCheckedOutError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
