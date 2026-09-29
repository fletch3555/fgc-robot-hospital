// jest.setup.js auto-mocks the whole SparePart class for route-level tests;
// unmock it here since this file tests its real query-building logic.
jest.unmock("../../../src/models/SparePart");

// uuid is ESM-only and unused by update() (only create() calls it), but the
// module-level import still needs to resolve under Jest's CJS transform.
jest.mock("uuid", () => ({ v4: () => "mock-uuid" }));

import { SparePart } from "../../../src/models/SparePart";
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

// SparePart.update() accepts camelCase update keys (fgcPartNumber, etc.)
// that aren't part of the ISparePart interface itself -- these tests pass
// them loosely, the same way the PUT route forwards an arbitrary request
// body today.
function update(id: string, updates: Record<string, unknown>) {
  return SparePart.update(id, updates as never);
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
    await update("spare-1", { fgcPartNumber: "REV-41-1001" });

    const [sql, values] = lastCall();
    expect(sql).toContain("fgc_part_number = $2");
    expect(values).toEqual(["spare-1", "REV-41-1001"]);
  });

  it("passes notes through as a real array, not a JSON string", async () => {
    await update("spare-1", { notes: ["team requested extra"] });

    const [sql, values] = lastCall();
    expect(sql).toContain("notes = $2");
    // Previously this was JSON.stringify()'d into a string, which Postgres
    // rejects as a malformed array literal for a text[] column -- it must
    // stay a real array so pg can serialize it natively.
    expect(values[1]).toEqual(["team requested extra"]);
    expect(typeof values[1]).not.toBe("string");
  });

  it("clears notes when given null", async () => {
    await update("spare-1", { notes: null });

    const [, values] = lastCall();
    expect(values).toEqual(["spare-1", null]);
  });

  it("still maps the previously-supported camelCase fields", async () => {
    await update("spare-1", {
      countryCode: "GBR",
      itemName: "36in PWM Cable",
      isLoan: true,
      submittedBy: "user-1",
      handledBy: "user-2",
    });

    const [sql] = lastCall();
    expect(sql).toContain("country_code = $2");
    expect(sql).toContain("item_name = $3");
    expect(sql).toContain("is_loan = $4");
    expect(sql).toContain("submitted_by = $5");
    expect(sql).toContain("handled_by = $6");
  });
});
