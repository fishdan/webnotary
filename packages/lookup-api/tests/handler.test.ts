import { describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handleCheck } from "../src/handler.js";
import type { DomainCertStore } from "../src/dynamo.js";

function eventWithBody(body: unknown): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "POST /v1/check",
    rawPath: "/v1/check",
    rawQueryString: "",
    headers: { "content-type": "application/json" },
    requestContext: {
      accountId: "1",
      apiId: "api",
      domainName: "example.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "example",
      http: {
        method: "POST",
        path: "/v1/check",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "req",
      routeKey: "POST /v1/check",
      stage: "$default",
      time: "now",
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body: typeof body === "string" ? body : JSON.stringify(body),
  } as APIGatewayProxyEventV2;
}

const FP = "a".repeat(64);

describe("handleCheck", () => {
  it("returns valid for SINGLE_OBSERVED", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: true, status: "SINGLE_OBSERVED" }),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "Example.COM.", certificateSha256: FP }),
      { store },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "valid" });
    expect(store.getStatus).toHaveBeenCalledWith("example.com", FP);
  });

  it("returns unknown when missing", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "unknown" });
  });

  it("returns conflict", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: true, status: "CONFLICT" }),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store },
    );

    expect(JSON.parse(res.body as string)).toEqual({ status: "conflict" });
  });

  it("returns 400 for bad fingerprint without calling store", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockRejectedValue(new Error("should not be called")),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: "nope" }),
      { store },
    );

    expect(res.statusCode).toBe(400);
    expect(store.getStatus).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const store: DomainCertStore = { getStatus: vi.fn() };
    const res = await handleCheck(eventWithBody("{"), { store });
    expect(res.statusCode).toBe(400);
    expect(store.getStatus).not.toHaveBeenCalled();
  });
});
