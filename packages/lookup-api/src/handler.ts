import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  NormalizationError,
  normalizeCertificateSha256,
  normalizeHostname,
} from "@webnotary/data-model";
import {
  classifyConflictSeverity,
  conflictSummary,
  conflictingObservedFingerprints,
  countObservedLeaves,
  detectConflictFromSiblings,
  shouldEnqueueVerification,
  toPublicStatus,
  type PublicStatus,
  type SiblingCert,
} from "@webnotary/trust-policy";
import {
  acquireTimeoutMs,
  acquireUnknown,
  isAcquireModeEnabled,
} from "./acquire.js";
import {
  createDynamoClientSightingRecorder,
  createDynamoCtSeenStamper,
  createDynamoDomainCertStore,
  createDynamoInventoryStore,
  createDynamoObservedCertUpserter,
  createSqsVerificationScheduler,
  type ClientSightingRecorder,
  type CtSeenStamper,
  type DomainCertStore,
  type InventoryStore,
  type ObservedCertUpserter,
  type VerificationScheduler,
} from "./dynamo.js";
import type { CheckSuccessBody, ConflictDetail } from "./response.js";

const MAX_BODY_BYTES = 4096;

function buildConflictDetail(input: {
  reason: ConflictDetail["reason"];
  knownCertificateSha256s: string[];
  siblings: SiblingCert[];
  clientInCtInventory: boolean;
}): ConflictDetail {
  const observedLeafCount = countObservedLeaves(input.siblings);
  const severity = classifyConflictSeverity({
    observedLeafCount,
    clientInCtInventory: input.clientInCtInventory,
  });
  return {
    reason: input.reason,
    knownCertificateSha256s: input.knownCertificateSha256s,
    severity,
    signals: {
      browserPkiAssumed: true,
      observedLeafCount,
      clientInCtInventory: input.clientInCtInventory,
    },
    summary: conflictSummary(severity),
  };
}

export interface CheckRequest {
  hostname: string;
  certificateSha256: string;
}

export interface HandlerDeps {
  store: DomainCertStore;
  inventory: InventoryStore;
  sightings?: ClientSightingRecorder;
  scheduler?: VerificationScheduler;
  ctSeen?: CtSeenStamper;
  acquireMode?: boolean;
  acquireTimeoutMs?: number;
  upsertObserved?: ObservedCertUpserter;
  acquireFn?: typeof acquireUnknown;
}

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function parseCheckRequest(rawBody: string | undefined): CheckRequest {
  if (rawBody == null || rawBody.length === 0) {
    throw new RequestError("request body is required");
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    throw new RequestError("request body exceeds 4096 bytes");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new RequestError("request body must be valid JSON");
  }

  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestError("request body must be a JSON object");
  }

  const obj = parsed as Record<string, unknown>;
  const hostname = obj.hostname;
  const certificateSha256 = obj.certificateSha256;

  if (typeof hostname !== "string" || typeof certificateSha256 !== "string") {
    throw new RequestError("hostname and certificateSha256 must be strings");
  }

  return { hostname, certificateSha256 };
}

export class RequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestError";
  }
}

export async function handleCheck(
  event: APIGatewayProxyEventV2,
  deps: HandlerDeps,
): Promise<APIGatewayProxyResultV2> {
  try {
    const request = parseCheckRequest(event.body);
    const hostname = normalizeHostname(request.hostname);
    const certificateSha256 = normalizeCertificateSha256(request.certificateSha256);
    const result = await deps.store.getStatus(hostname, certificateSha256);
    let status: PublicStatus = result.found
      ? toPublicStatus(result.status)
      : toPublicStatus(undefined);
    let conflict: ConflictDetail | undefined;
    let siblings: SiblingCert[] | undefined;
    let inventoryKnown = false;

    async function loadSiblings(): Promise<SiblingCert[]> {
      if (siblings) return siblings;
      siblings = await deps.store.listSiblings(hostname);
      return siblings;
    }

    async function ensureInventoryKnown(): Promise<boolean> {
      try {
        inventoryKnown = await deps.inventory.hasCertificate(certificateSha256);
      } catch (err) {
        console.warn("inventory lookup failed", err);
        inventoryKnown = false;
      }
      return inventoryKnown;
    }

    if (status === "unknown") {
      try {
        const list = await loadSiblings();
        const known = conflictingObservedFingerprints({
          clientCertificateSha256: certificateSha256,
          siblings: list,
        });
        if (
          detectConflictFromSiblings({
            clientCertificateSha256: certificateSha256,
            siblings: list,
          })
        ) {
          status = "conflict";
          await ensureInventoryKnown();
          conflict = buildConflictDetail({
            reason: "sibling_observed",
            knownCertificateSha256s: known,
            siblings: list,
            clientInCtInventory: inventoryKnown,
          });
        }
      } catch (err) {
        console.warn("sibling conflict scan failed", err);
      }
    }

    if (status === "conflict" && !conflict) {
      try {
        const list = await loadSiblings();
        await ensureInventoryKnown();
        conflict = buildConflictDetail({
          reason: "stored_conflict",
          knownCertificateSha256s: conflictingObservedFingerprints({
            clientCertificateSha256: certificateSha256,
            siblings: list,
          }),
          siblings: list,
          clientInCtInventory: inventoryKnown,
        });
      } catch (err) {
        console.warn("conflict detail sibling load failed", err);
        conflict = buildConflictDetail({
          reason: "stored_conflict",
          knownCertificateSha256s: [],
          siblings: [],
          clientInCtInventory: false,
        });
      }
    }

    if (deps.sightings) {
      try {
        await deps.sightings.record(hostname, certificateSha256);
      } catch (err) {
        console.warn("client sighting record failed", err);
      }
    }

    if (status === "unknown") {
      await ensureInventoryKnown();
    }

    if (inventoryKnown && deps.ctSeen && status === "unknown") {
      try {
        await deps.ctSeen.stamp(hostname, certificateSha256);
      } catch (err) {
        console.warn("CT_SEEN stamp failed", err);
      }
    }

    const acquireMode = deps.acquireMode === true;

    if (status === "unknown" && acquireMode && deps.upsertObserved) {
      const acquireFn = deps.acquireFn ?? acquireUnknown;
      try {
        const acquired = await acquireFn({
          hostname,
          clientCertificateSha256: certificateSha256,
          deps: {
            upsertObserved: deps.upsertObserved,
            timeoutMs: deps.acquireTimeoutMs ?? 5000,
          },
        });
        if (acquired.ok) {
          status = acquired.status;
          if (acquired.status === "conflict") {
            const list = await loadSiblings().catch(() => [] as SiblingCert[]);
            await ensureInventoryKnown();
            conflict = buildConflictDetail({
              reason: "acquire_mismatch",
              knownCertificateSha256s: [acquired.observation.certificateSha256],
              siblings: list.length
                ? list
                : [
                    {
                      certificateSha256: acquired.observation.certificateSha256,
                      status: "SINGLE_OBSERVED",
                    },
                  ],
              clientInCtInventory: inventoryKnown,
            });
          }
        } else {
          console.warn("acquire did not complete", acquired);
        }
      } catch (err) {
        console.warn("acquire failed", err);
      }
    }

    if (
      deps.scheduler &&
      shouldEnqueueVerification({
        publicStatus: status,
        inventoryKnown,
        acquireMode,
      })
    ) {
      try {
        await deps.scheduler.tryEnqueue(hostname, certificateSha256);
      } catch (err) {
        console.warn("verification enqueue failed", err);
      }
    }

    const body: CheckSuccessBody =
      status === "conflict"
        ? {
            status,
            conflict:
              conflict ??
              buildConflictDetail({
                reason: "stored_conflict",
                knownCertificateSha256s: [],
                siblings: [],
                clientInCtInventory: false,
              }),
          }
        : { status };
    return json(200, body);
  } catch (err) {
    if (err instanceof RequestError || err instanceof NormalizationError) {
      return json(400, {
        error: "invalid_request",
        message: err.message,
      });
    }
    console.error("lookup handler failure", err);
    return json(500, {
      error: "internal_error",
      message: "unexpected error",
    });
  }
}

function defaultDeps(): HandlerDeps {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("TABLE_NAME is required");
  }
  const queueUrl = process.env.VERIFY_QUEUE_URL;
  const acquireMode = isAcquireModeEnabled();
  const deps: HandlerDeps = {
    store: createDynamoDomainCertStore(tableName),
    inventory: createDynamoInventoryStore(tableName),
    sightings: createDynamoClientSightingRecorder(tableName),
    ctSeen: createDynamoCtSeenStamper(tableName),
    acquireMode,
    acquireTimeoutMs: acquireTimeoutMs(),
    upsertObserved: createDynamoObservedCertUpserter(tableName),
  };
  if (queueUrl) {
    deps.scheduler = createSqsVerificationScheduler({ tableName, queueUrl });
  }
  return deps;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return handleCheck(event, defaultDeps());
}
