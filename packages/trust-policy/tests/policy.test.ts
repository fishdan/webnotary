import { describe, expect, it } from "vitest";
import {
  detectConflictFromSiblings,
  shouldEnqueueVerification,
  toPublicStatus,
} from "../src/index.js";

describe("toPublicStatus", () => {
  it("maps missing and CT_SEEN to unknown", () => {
    expect(toPublicStatus(undefined)).toBe("unknown");
    expect(toPublicStatus("CT_SEEN")).toBe("unknown");
    expect(toPublicStatus("UNKNOWN")).toBe("unknown");
  });

  it("maps SINGLE_OBSERVED to valid (dev policy)", () => {
    expect(toPublicStatus("SINGLE_OBSERVED")).toBe("valid");
    expect(toPublicStatus("MULTI_OBSERVED")).toBe("valid");
    expect(toPublicStatus("ESTABLISHED")).toBe("valid");
  });

  it("maps CONFLICT to conflict", () => {
    expect(toPublicStatus("CONFLICT")).toBe("conflict");
  });
});

describe("shouldEnqueueVerification", () => {
  it("requires unknown + inventory known", () => {
    expect(
      shouldEnqueueVerification({ publicStatus: "unknown", inventoryKnown: true }),
    ).toBe(true);
    expect(
      shouldEnqueueVerification({ publicStatus: "unknown", inventoryKnown: false }),
    ).toBe(false);
    expect(
      shouldEnqueueVerification({ publicStatus: "valid", inventoryKnown: true }),
    ).toBe(false);
    expect(
      shouldEnqueueVerification({ publicStatus: "conflict", inventoryKnown: true }),
    ).toBe(false);
  });
});

describe("detectConflictFromSiblings", () => {
  const A = "a".repeat(64);
  const B = "b".repeat(64);

  it("returns true when another observed FP exists", () => {
    expect(
      detectConflictFromSiblings({
        clientCertificateSha256: B,
        siblings: [{ certificateSha256: A, status: "SINGLE_OBSERVED" }],
      }),
    ).toBe(true);
  });

  it("returns false when only the client FP is observed", () => {
    expect(
      detectConflictFromSiblings({
        clientCertificateSha256: A,
        siblings: [{ certificateSha256: A, status: "SINGLE_OBSERVED" }],
      }),
    ).toBe(false);
  });

  it("ignores UNKNOWN / CT_SEEN siblings", () => {
    expect(
      detectConflictFromSiblings({
        clientCertificateSha256: B,
        siblings: [
          { certificateSha256: A, status: "UNKNOWN" },
          { certificateSha256: A, status: "CT_SEEN" },
        ],
      }),
    ).toBe(false);
  });
});
