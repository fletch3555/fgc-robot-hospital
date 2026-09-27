import { query } from '@/lib/database';
import { IBatteryPoolStatus, IBatteryUnit, BatteryDeviceType } from '@/lib/types';
import { getCurrentSeason } from '@/lib/season';
import { getCountryName } from '@/lib/countryUtils';

// Individual numbered loaner batteries (e.g. "Robot Controller #7") live in
// battery_units. There's no stored status column -- a unit counts as
// checked out if any open/in-progress battery_charging request's
// battery_charging_data references its device_type + number, mirroring how
// the old battery_swaps/battery_charging_pool "outstanding" count was
// always derived rather than stored.

const DEVICE_TYPES: BatteryDeviceType[] = ['robot_controller', 'driver_hub'];

export async function getBatteryUnits(season: number = getCurrentSeason()): Promise<IBatteryUnit[]> {
  try {
    const result = await query(
      `SELECT bu.device_type, bu.number, r.id as request_id, r.country_code
       FROM battery_units bu
       LEFT JOIN requests r
         ON r.type = 'battery_charging'
         AND r.season = bu.season
         AND r.status IN ('open', 'in-progress')
         AND COALESCE(r.battery_charging_data ->> 'loanerProvided', 'true') != 'false'
         AND r.battery_charging_data ->> 'batteryType' = bu.device_type
         AND (r.battery_charging_data ->> 'loanerBatteryNumber')::int = bu.number
       WHERE bu.season = $1
       ORDER BY bu.device_type, bu.number`,
      [season]
    );

    return result.rows.map((row: { device_type: BatteryDeviceType; number: number; request_id: string | null; country_code: string | null }) => ({
      device_type: row.device_type,
      number: row.number,
      season,
      status: row.request_id ? 'checked_out' as const : 'available' as const,
      request_id: row.request_id || undefined,
      country_code: row.country_code || undefined,
      country_name: row.country_code ? getCountryName(row.country_code) : undefined,
    }));
  } catch (error) {
    console.error('Error getting battery units:', error);
    throw error;
  }
}

export async function addBatteryUnit(deviceType: BatteryDeviceType, number: number, season: number = getCurrentSeason()): Promise<void> {
  try {
    await query(
      `INSERT INTO battery_units (device_type, number, season) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [deviceType, number, season]
    );
  } catch (error) {
    console.error('Error adding battery unit:', error);
    throw error;
  }
}

export async function removeBatteryUnit(deviceType: BatteryDeviceType, number: number, season: number = getCurrentSeason()): Promise<void> {
  try {
    await query(
      `DELETE FROM battery_units WHERE device_type = $1 AND number = $2 AND season = $3`,
      [deviceType, number, season]
    );
  } catch (error) {
    console.error('Error removing battery unit:', error);
    throw error;
  }
}

// Per-device-type summary, derived from getBatteryUnits(). Signature/shape
// unchanged from before battery_units existed, so the dashboard's summary
// tiles and /monitor's kiosk chips need no changes at all.
export async function getBatteryPoolStatus(season: number = getCurrentSeason()): Promise<IBatteryPoolStatus[]> {
  const units = await getBatteryUnits(season);

  return DEVICE_TYPES.map((deviceType) => {
    const forType = units.filter((u) => u.device_type === deviceType);
    const totalCount = forType.length;
    const outstandingCount = forType.filter((u) => u.status === 'checked_out').length;
    return {
      device_type: deviceType,
      season,
      total_count: totalCount,
      outstanding_count: outstandingCount,
      available_count: totalCount - outstandingCount,
    };
  });
}
