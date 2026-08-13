import { describe, expect, it } from "vitest";
import { mapStatus } from "../src/mapStatus.js";

describe("mapStatus", () => {
  it("maps missing to unknown", () => {
    expect(mapStatus(undefined)).toBe("unknown");
    expect(mapStatus(null)).toBe("unknown");
  });

  it("maps trust states to valid", () => {
    expect(mapStatus("SINGLE_OBSERVED")).toBe("valid");
    expect(mapStatus("MULTI_OBSERVED")).toBe("valid");
    expect(mapStatus("ESTABLISHED")).toBe("valid");
  });

  it("maps conflict", () => {
    expect(mapStatus("CONFLICT")).toBe("conflict");
  });

  it("maps non-established to unknown", () => {
    expect(mapStatus("UNKNOWN")).toBe("unknown");
    expect(mapStatus("CT_SEEN")).toBe("unknown");
  });
});
