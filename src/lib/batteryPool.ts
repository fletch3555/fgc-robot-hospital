import { query, QueryExecutor } from '@/lib/database';
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
         -- CASE, not a bare cast gated by a separate "AND ... ~ digits"
         -- condition: Postgres doesn't guarantee AND operands evaluate
         -- left-to-right, so a malformed/non-numeric loanerBatteryNumber
         -- could still reach the ::int cast and throw. CASE WHEN branches
         -- are evaluated in order per the SQL standard, so this is safe.
         AND (CASE WHEN r.battery_charging_data ->> 'loanerBatteryNumber' ~ '^[0-9]+$'
                   THEN (r.battery_charging_data ->> 'loanerBatteryNumber')::int
                   ELSE NULL END) = bu.number
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

export class BatteryUnitCheckedOutError extends Error {}
export class BatteryUnitConflictError extends Error {}

// Claims a specific numbered unit for a battery_charging request, atomic
// against every other concurrent claim attempt. Availability is otherwise
// only a point-in-time snapshot (getBatteryUnits/the client's cached list),
// so two intake stations picking the same freshly-available number at
// nearly the same moment could otherwise both succeed. Must be called with
// a queryFn from database.ts's withTransaction -- the advisory lock is
// transaction-scoped (auto-released at COMMIT/ROLLBACK) and only actually
// serializes concurrent callers when they share that same guarantee; on
// the standalone query() helper (a new connection per call) it would be
// released the instant the lock statement's own implicit transaction ends,
// before the caller's INSERT/UPDATE even runs.
export async function reserveBatteryUnit(
  queryFn: QueryExecutor,
  deviceType: BatteryDeviceType,
  number: number,
  season: number,
  excludeRequestId?: string
): Promise<void> {
  await queryFn('SELECT pg_advisory_xact_lock(hashtext($1))', [`battery_unit:${season}:${deviceType}:${number}`]);

  const unitExists = await queryFn(
    `SELECT 1 FROM battery_units WHERE device_type = $1 AND number = $2 AND season = $3`,
    [deviceType, number, season]
  );
  if (unitExists.rowCount === 0) {
    throw new BatteryUnitConflictError(`${deviceType} #${number} is not in the loaner pool`);
  }

  const conflict = await queryFn(
    `SELECT r.id FROM requests r
     WHERE r.type = 'battery_charging'
       AND r.season = $3
       AND r.status IN ('open', 'in-progress')
       AND COALESCE(r.battery_charging_data ->> 'loanerProvided', 'true') != 'false'
       AND r.battery_charging_data ->> 'batteryType' = $1
       AND (CASE WHEN r.battery_charging_data ->> 'loanerBatteryNumber' ~ '^[0-9]+$'
                 THEN (r.battery_charging_data ->> 'loanerBatteryNumber')::int
                 ELSE NULL END) = $2
       AND ($4::uuid IS NULL OR r.id != $4::uuid)`,
    [deviceType, number, season, excludeRequestId ?? null]
  );
  if ((conflict.rowCount ?? 0) > 0) {
    throw new BatteryUnitConflictError(`${deviceType} #${number} is already checked out to another team`);
  }
}

export async function removeBatteryUnit(deviceType: BatteryDeviceType, number: number, season: number = getCurrentSeason()): Promise<void> {
  try {
    // Guarded against deleting a unit an active request still references
    // -- the UI already hides this action for checked-out tiles, but that
    // doesn't stop a direct API call from orphaning a request's loaner.
    const result = await query(
      `DELETE FROM battery_units bu
       WHERE bu.device_type = $1 AND bu.number = $2 AND bu.season = $3
         AND NOT EXISTS (
           SELECT 1 FROM requests r
           WHERE r.type = 'battery_charging'
             AND r.season = bu.season
             AND r.status IN ('open', 'in-progress')
             AND COALESCE(r.battery_charging_data ->> 'loanerProvided', 'true') != 'false'
             AND r.battery_charging_data ->> 'batteryType' = bu.device_type
             AND (CASE WHEN r.battery_charging_data ->> 'loanerBatteryNumber' ~ '^[0-9]+$'
                       THEN (r.battery_charging_data ->> 'loanerBatteryNumber')::int
                       ELSE NULL END) = bu.number
         )`,
      [deviceType, number, season]
    );

    if (result.rowCount === 0) {
      // rowCount 0 means either the unit was already gone (fine, nothing
      // to do) or it's still checked out (reject) -- a single guarded
      // DELETE can't tell those apart, so check which one it was.
      const stillThere = await query(
        `SELECT 1 FROM battery_units WHERE device_type = $1 AND number = $2 AND season = $3`,
        [deviceType, number, season]
      );
      if ((stillThere.rowCount ?? 0) > 0) {
        throw new BatteryUnitCheckedOutError(`${deviceType} #${number} is currently checked out and can't be removed`);
      }
    }
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
