import { describe, expect, it } from "vitest";
import {
  certInventoryKeys,
  hostCertKeys,
  PENDING_CREATE_CONDITION,
  pendingExpiresAt,
  pendingVerifyKeys,
} from "../src/keys.js";
import { PENDING_VERIFY_TTL_SECONDS } from "../src/types.js";

const FP = "b".repeat(64);

describe("key builders", () => {
  it("builds host/cert keys", () => {
    expect(hostCertKeys("Example.COM.", FP.toUpperCase())).toEqual({
      pk: "HOST#example.com",
      sk: `CERT#${FP}`,
    });
  });

  it("builds inventory keys", () => {
    expect(certInventoryKeys(FP)).toEqual({
      pk: `CERT#${FP}`,
      sk: "META",
    });
  });

  it("builds pending verify keys", () => {
    expect(pendingVerifyKeys("Example.COM")).toEqual({
      pk: "VERIFY#example.com",
      sk: "PENDING",
    });
  });

  it("exposes conditional create expression", () => {
    expect(PENDING_CREATE_CONDITION).toBe("attribute_not_exists(pk)");
  });

  it("computes pending TTL epoch seconds", () => {
    expect(pendingExpiresAt(1_700_000_000_000, PENDING_VERIFY_TTL_SECONDS)).toBe(
      1_700_000_000 + PENDING_VERIFY_TTL_SECONDS,
    );
  });
});
