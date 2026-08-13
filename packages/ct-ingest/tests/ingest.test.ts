import { describe, expect, it } from "vitest";
import { parseSeedHostnames } from "../src/ingest.js";

describe("parseSeedHostnames", () => {
  it("defaults to example.com", () => {
    expect(parseSeedHostnames(undefined)).toEqual(["example.com"]);
    expect(parseSeedHostnames("  ")).toEqual(["example.com"]);
  });

  it("splits comma-separated hosts", () => {
    expect(parseSeedHostnames("a.com, b.com")).toEqual(["a.com", "b.com"]);
  });
});
