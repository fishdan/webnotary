import { describe, expect, it } from "vitest";
import {
  NormalizationError,
  normalizeCertificateSha256,
  normalizeHostname,
} from "../src/normalize.js";

const FP = "a".repeat(64);

describe("normalizeHostname", () => {
  it("lowercases and strips trailing dot", () => {
    expect(normalizeHostname("Example.COM.")).toBe("example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeHostname("  example.com  ")).toBe("example.com");
  });

  it("punycode-encodes IDN", () => {
    expect(normalizeHostname("bücher.example")).toBe("xn--bcher-kva.example");
  });

  it("rejects empty", () => {
    expect(() => normalizeHostname("")).toThrow(NormalizationError);
    expect(() => normalizeHostname("   ")).toThrow(NormalizationError);
    expect(() => normalizeHostname(".")).toThrow(NormalizationError);
  });

  it("rejects IPv4 and IPv6 literals", () => {
    expect(() => normalizeHostname("127.0.0.1")).toThrow(NormalizationError);
    expect(() => normalizeHostname("::1")).toThrow(NormalizationError);
    expect(() => normalizeHostname("[::1]")).toThrow(NormalizationError);
  });

  it("rejects oversized hostnames", () => {
    const label = "a".repeat(63);
    const huge = Array.from({ length: 5 }, () => label).join(".");
    expect(huge.length).toBeGreaterThan(253);
    expect(() => normalizeHostname(huge)).toThrow(NormalizationError);
  });
});

describe("normalizeCertificateSha256", () => {
  it("lowercases valid hex", () => {
    expect(normalizeCertificateSha256("A".repeat(64))).toBe(FP);
  });

  it("rejects wrong length", () => {
    expect(() => normalizeCertificateSha256("abcd")).toThrow(NormalizationError);
  });

  it("rejects non-hex", () => {
    expect(() => normalizeCertificateSha256("g".repeat(64))).toThrow(
      NormalizationError,
    );
  });
});
