// jest.setup.js auto-mocks the whole batteryPool module for route-level
// tests; unmock it here since this file tests reserveBatteryUnit's real
// conflict/supersede logic directly.
jest.unmock("../../../src/lib/batteryPool");

import { reserveBatteryUnit, BatteryUnitConflictError } from "../../../src/lib/batteryPool";

// A queryFn stand-in good enough for reserveBatteryUnit's three fixed calls
// (advisory lock, unit-exists check, conflict check) plus the optional
// fourth (the supersede UPDATE) -- keyed by SQL shape rather than call order
// so each test only needs to describe what matters to it.
function makeQueryFn({
  unitExists = true,
  conflictId = null as string | null,
}: { unitExists?: boolean; conflictId?: string | null }) {
  const update = jest.fn().mockResolvedValue({ rowCount: 1 });
  const queryFn = jest.fn(async (text: string, params?: unknown[]) => {
    if (text.includes("pg_advisory_xact_lock")) return { rows: [], rowCount: 0 };
    if (text.includes("FROM battery_units")) return { rows: [], rowCount: unitExists ? 1 : 0 };
    if (text.includes("UPDATE requests")) return update(text, params);
    // the conflict SELECT
    return conflictId
      ? { rows: [{ id: conflictId }], rowCount: 1 }
      : { rows: [], rowCount: 0 };
  });
  return { queryFn, update };
}

describe("reserveBatteryUnit", () => {
  it("resolves when the unit exists and has no conflicting request", async () => {
    const { queryFn, update } = makeQueryFn({ conflictId: null });

    await expect(
      reserveBatteryUnit(queryFn, "robot_controller", 3, 2026)
    ).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("throws BatteryUnitConflictError when the unit isn't in the pool", async () => {
    const { queryFn } = makeQueryFn({ unitExists: false });

    await expect(
      reserveBatteryUnit(queryFn, "robot_controller", 3, 2026)
    ).rejects.toThrow(BatteryUnitConflictError);
  });

  it("throws BatteryUnitConflictError when checked out and no supersede id is given", async () => {
    const { queryFn, update } = makeQueryFn({ conflictId: "other-request-id" });

    await expect(
      reserveBatteryUnit(queryFn, "robot_controller", 3, 2026)
    ).rejects.toThrow(BatteryUnitConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it("still throws when the confirmed supersede id no longer matches the live conflict (race)", async () => {
    const { queryFn, update } = makeQueryFn({ conflictId: "current-holder-id" });

    await expect(
      reserveBatteryUnit(queryFn, "robot_controller", 3, 2026, undefined, "stale-confirmed-id")
    ).rejects.toThrow(BatteryUnitConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it("closes the stale request and proceeds when the confirmed supersede id matches the live conflict", async () => {
    const { queryFn, update } = makeQueryFn({ conflictId: "stale-request-id" });

    await expect(
      reserveBatteryUnit(
        queryFn,
        "robot_controller",
        3,
        2026,
        undefined,
        "stale-request-id",
        "clerk-id",
        "Closed automatically: re-loaned before being marked returned."
      )
    ).resolves.toBeUndefined();

    expect(update).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE requests SET status = 'completed'"),
      ["stale-request-id", "clerk-id", "Closed automatically: re-loaned before being marked returned."]
    );
  });
});
