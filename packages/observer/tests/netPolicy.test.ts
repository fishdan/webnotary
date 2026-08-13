import { describe, expect, it } from "vitest";
import { assertPublicIps, isPublicIp, NetPolicyError } from "../src/netPolicy.js";

describe("isPublicIp", () => {
  it("allows typical public v4", () => {
    expect(isPublicIp("8.8.8.8")).toBe(true);
    expect(isPublicIp("1.1.1.1")).toBe(true);
  });

  it("blocks private/loopback/metadata/cgnat", () => {
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("10.0.0.5")).toBe(false);
    expect(isPublicIp("192.168.1.1")).toBe(false);
    expect(isPublicIp("172.16.0.1")).toBe(false);
    expect(isPublicIp("169.254.169.254")).toBe(false);
    expect(isPublicIp("100.64.0.1")).toBe(false);
  });

  it("blocks localhost v6 and link-local", () => {
    expect(isPublicIp("::1")).toBe(false);
    expect(isPublicIp("fe80::1")).toBe(false);
    expect(isPublicIp("fd12::1")).toBe(false);
  });
});

describe("assertPublicIps", () => {
  it("throws when only private addresses resolve", () => {
    expect(() => assertPublicIps(["127.0.0.1", "10.0.0.1"], "evil.local")).toThrow(
      NetPolicyError,
    );
  });

  it("returns only public addresses", () => {
    expect(assertPublicIps(["10.0.0.1", "8.8.8.8"], "example.com")).toEqual(["8.8.8.8"]);
  });
});
