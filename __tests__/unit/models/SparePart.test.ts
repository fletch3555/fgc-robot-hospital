// jest.setup.js auto-mocks the whole SparePart class for route-level tests;
// unmock it here since this file tests its real query-building logic.
jest.unmock("../../../src/models/SparePart");

// uuid is ESM-only and unused by update() (only create() calls it), but the
// module-level import still needs to resolve under Jest's CJS transform.
jest.mock("uuid", () => ({ v4: () => "mock-uuid" }));

import { SparePart, SparePartUpdateInput } from "../../../src/models/SparePart";
import { query } from "../../../src/lib/database";

jest.mock("../../../src/lib/database", () => ({
  connectToDatabase: jest.fn(),
  query: jest.fn(),
}));

jest.mock("../../../src/lib/countryUtils", () => ({
  getCountryName: jest.fn().mockReturnValue("United States"),
}));

jest.mock("../../../src/lib/season", () => ({
  getCurrentSeason: jest.fn().mockReturnValue(2026),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

// The two "rejects a bad key" tests below need to construct a payload that
// isn't valid SparePartUpdateInput on purpose -- that's the whole point of
// the test. Real callers go through SparePart.update() directly.
function updateWithArbitraryKeys(id: string, updates: Record<string, unknown>) {
  return SparePart.update(id, updates as SparePartUpdateInput);
}

function lastCall(): [string, unknown[]] {
  const call = mockQuery.mock.calls.at(-1);
  if (!call) throw new Error("query() was not called");
  return call as [string, unknown[]];
}

describe("SparePart.update", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ id: "spare-1", country_code: "USA" }] });
  });

  it("maps fgcPartNumber to the fgc_part_number column", async () => {
    await SparePart.update("spare-1", { fgcPartNumber: "REV-41-1001" });

    const [sql, values] = lastCall();
    expect(sql).toContain("fgc_part_number = $2");
    expect(values).toEqual(["spare-1", "REV-41-1001"]);
  });

  it("passes notes through as a real array, not a JSON string", async () => {
    await SparePart.update("spare-1", { notes: ["team requested extra"] });

    const [sql, values] = lastCall();
    expect(sql).toContain("notes = $2");
    // Previously this was JSON.stringify()'d into a string, which Postgres
    // rejects as a malformed array literal for a text[] column -- it must
    // stay a real array so pg can serialize it natively.
    expect(values[1]).toEqual(["team requested extra"]);
    expect(typeof values[1]).not.toBe("string");
  });

  it("clears notes when given null", async () => {
    await SparePart.update("spare-1", { notes: null });

    const [, values] = lastCall();
    expect(values).toEqual(["spare-1", null]);
  });

  it("never interpolates an unrecognized key into the SQL statement", async () => {
    // updates comes straight from a PUT request body -- an arbitrary key
    // must never reach the query string, or it's a SQL injection vector.
    // A legitimate key alongside it should still work normally.
    await updateWithArbitraryKeys("spare-1", {
      itemName: "Widget",
      "status = 'returned'; --": "malicious",
    });

    const [sql, values] = lastCall();
    expect(sql).not.toContain("--");
    expect(sql).not.toContain("returned");
    expect(sql).toContain("item_name = $2");
    expect(values).toEqual(["spare-1", "Widget"]);
  });

  it("throws when no updatable fields are provided", async () => {
    await expect(
      updateWithArbitraryKeys("spare-1", { notAColumn: "x" })
    ).rejects.toThrow("No valid updates provided");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("still maps the previously-supported camelCase fields", async () => {
    await SparePart.update("spare-1", {
      countryCode: "GBR",
      itemName: "36in PWM Cable",
      isLoan: true,
    });

    const [sql] = lastCall();
    expect(sql).toContain("country_code = $2");
    expect(sql).toContain("item_name = $3");
    expect(sql).toContain("is_loan = $4");
  });

  it("rejects client-supplied audit identities (submittedBy/handledBy)", async () => {
    // These are who-issued/who-returned facts, only ever meant to be
    // stamped server-side from the authenticated session -- a generic
    // edit PUT must never be able to forge them.
    await updateWithArbitraryKeys("spare-1", {
      itemName: "Widget",
      submittedBy: "attacker-id",
      handledBy: "attacker-id",
    });

    const [sql, values] = lastCall();
    expect(sql).not.toContain("submitted_by");
    expect(sql).not.toContain("handled_by");
    expect(values).toEqual(["spare-1", "Widget"]);
  });
});
