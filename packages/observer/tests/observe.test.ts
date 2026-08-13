import { describe, expect, it } from "vitest";
import { NetPolicyError } from "../src/netPolicy.js";
import { observe } from "../src/observe.js";

describe("observe SSRF guard", () => {
  it("refuses hostnames that resolve only to loopback", async () => {
    await expect(
      observe("example.com", {
        resolveFn: async () => ["127.0.0.1"],
      }),
    ).rejects.toBeInstanceOf(NetPolicyError);
  });

  it("refuses metadata addresses", async () => {
    await expect(
      observe("example.com", {
        resolveFn: async () => ["169.254.169.254"],
      }),
    ).rejects.toBeInstanceOf(NetPolicyError);
  });
});
