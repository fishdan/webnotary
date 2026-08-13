import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  NormalizationError,
  normalizeCertificateSha256,
  normalizeHostname,
} from "@webnotary/data-model";
import { createDynamoDomainCertStore, type DomainCertStore } from "./dynamo.js";
import { mapStatus } from "./mapStatus.js";

const MAX_BODY_BYTES = 4096;

export interface CheckRequest {
  hostname: string;
  certificateSha256: string;
}

export interface HandlerDeps {
  store: DomainCertStore;
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
    const status = result.found ? mapStatus(result.status) : mapStatus(undefined);
    return json(200, { status });
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
  return { store: createDynamoDomainCertStore(tableName) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return handleCheck(event, defaultDeps());
}
