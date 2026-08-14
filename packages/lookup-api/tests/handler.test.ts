import { describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { handleCheck } from "../src/handler.js";
import type { DomainCertStore, InventoryStore } from "../src/dynamo.js";

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
const FP_B = "b".repeat(64);

function inventory(known: boolean): InventoryStore {
  return { hasCertificate: vi.fn().mockResolvedValue(known) };
}

describe("handleCheck", () => {
  it("returns valid for SINGLE_OBSERVED and does not enqueue", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: true, status: "SINGLE_OBSERVED" }),
      listSiblings: vi.fn(),
    };
    const scheduler = { tryEnqueue: vi.fn() };
    const sightings = { record: vi.fn().mockResolvedValue(undefined) };

    const res = await handleCheck(
      eventWithBody({ hostname: "Example.COM.", certificateSha256: FP }),
      { store, inventory: inventory(true), scheduler, sightings },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "valid" });
    expect(scheduler.tryEnqueue).not.toHaveBeenCalled();
    expect(store.listSiblings).not.toHaveBeenCalled();
    expect(sightings.record).toHaveBeenCalledWith("example.com", FP);
  });

  it("returns unknown without enqueue when CT inventory unknown", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([]),
    };
    const scheduler = { tryEnqueue: vi.fn() };
    const inv = inventory(false);

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store, inventory: inv, scheduler },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "unknown" });
    expect(inv.hasCertificate).toHaveBeenCalledWith(FP);
    expect(scheduler.tryEnqueue).not.toHaveBeenCalled();
  });

  it("returns unknown and enqueues when CT-known", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([]),
    };
    const scheduler = { tryEnqueue: vi.fn().mockResolvedValue(true) };
    const ctSeen = { stamp: vi.fn().mockResolvedValue(undefined) };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store, inventory: inventory(true), scheduler, ctSeen },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "unknown" });
    expect(scheduler.tryEnqueue).toHaveBeenCalledWith("example.com", FP);
    expect(ctSeen.stamp).toHaveBeenCalledWith("example.com", FP);
  });

  it("returns conflict for sibling observed FP without enqueue", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([
        { certificateSha256: FP, status: "SINGLE_OBSERVED" },
      ]),
    };
    const scheduler = { tryEnqueue: vi.fn() };
    const inv = inventory(true);

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP_B }),
      { store, inventory: inv, scheduler },
    );

    expect(JSON.parse(res.body as string)).toEqual({
      status: "conflict",
      conflict: {
        reason: "sibling_observed",
        knownCertificateSha256s: [FP],
      },
    });
    expect(scheduler.tryEnqueue).not.toHaveBeenCalled();
    expect(inv.hasCertificate).not.toHaveBeenCalled();
  });

  it("returns stored conflict without enqueue", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: true, status: "CONFLICT" }),
      listSiblings: vi.fn().mockResolvedValue([
        { certificateSha256: FP_B, status: "SINGLE_OBSERVED" },
        { certificateSha256: FP, status: "CONFLICT" },
      ]),
    };
    const scheduler = { tryEnqueue: vi.fn() };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store, inventory: inventory(true), scheduler },
    );

    expect(JSON.parse(res.body as string)).toEqual({
      status: "conflict",
      conflict: {
        reason: "stored_conflict",
        knownCertificateSha256s: [FP_B],
      },
    });
    expect(scheduler.tryEnqueue).not.toHaveBeenCalled();
  });

  it("returns 400 for bad fingerprint without calling store", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockRejectedValue(new Error("should not be called")),
      listSiblings: vi.fn(),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: "nope" }),
      { store, inventory: inventory(false) },
    );

    expect(res.statusCode).toBe(400);
    expect(store.getStatus).not.toHaveBeenCalled();
  });

  it("still returns unknown if enqueue fails", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([]),
    };
    const scheduler = {
      tryEnqueue: vi.fn().mockRejectedValue(new Error("sqs down")),
    };

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      { store, inventory: inventory(true), scheduler },
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body as string)).toEqual({ status: "unknown" });
  });

  it("acquireMode sync-observes unknown and returns valid without needing inventory", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([]),
    };
    const scheduler = { tryEnqueue: vi.fn() };
    const upsertObserved = { upsert: vi.fn().mockResolvedValue(undefined) };
    const acquireFn = vi.fn().mockResolvedValue({
      ok: true,
      status: "valid",
      observation: { certificateSha256: FP },
    });

    const res = await handleCheck(
      eventWithBody({ hostname: "example.com", certificateSha256: FP }),
      {
        store,
        inventory: inventory(false),
        scheduler,
        acquireMode: true,
        upsertObserved,
        acquireFn,
      },
    );

    expect(JSON.parse(res.body as string)).toEqual({ status: "valid" });
    expect(acquireFn).toHaveBeenCalled();
    expect(scheduler.tryEnqueue).not.toHaveBeenCalled();
  });

  it("acquireMode enqueues async when acquire times out", async () => {
    const store: DomainCertStore = {
      getStatus: vi.fn().mockResolvedValue({ found: false }),
      listSiblings: vi.fn().mockResolvedValue([]),
    };
    const scheduler = { tryEnqueue: vi.fn().mockResolvedValue(true) };
    const upsertObserved = { upsert: vi.fn() };
    const acquireFn = vi.fn().mockResolvedValue({
      ok: false,
      reason: "timeout",
    });

    const res = await handleCheck(
      eventWithBody({ hostname: "fresh.example", certificateSha256: FP }),
      {
        store,
        inventory: inventory(false),
        scheduler,
        acquireMode: true,
        upsertObserved,
        acquireFn,
      },
    );

    expect(JSON.parse(res.body as string)).toEqual({ status: "unknown" });
    expect(scheduler.tryEnqueue).toHaveBeenCalledWith("fresh.example", FP);
  });
});
