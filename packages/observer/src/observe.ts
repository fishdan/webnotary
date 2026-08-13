import { resolve4, resolve6 } from "node:dns/promises";
import tls from "node:tls";
import { normalizeHostname } from "@webnotary/data-model";
import { leafCertificateSha256, parseSans, spkiSha256 } from "./fingerprints.js";
import { assertIpStillAllowed, assertPublicIps, NetPolicyError } from "./netPolicy.js";

export interface Observation {
  hostname: string;
  remoteIp: string;
  observedAt: string;
  observerId: string;
  tlsValid: boolean;
  certificateSha256: string;
  spkiSha256: string;
  notBefore: string;
  notAfter: string;
  issuer: string;
  subject: string;
  sans: string[];
  port: number;
}

export interface ObserveOptions {
  port?: number;
  observerId?: string;
  connectTimeoutMs?: number;
  resolveFn?: (hostname: string) => Promise<string[]>;
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const results: string[] = [];
  const settled = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
  for (const item of settled) {
    if (item.status === "fulfilled") results.push(...item.value);
  }
  return results;
}

function connectTls(params: {
  ip: string;
  hostname: string;
  port: number;
  timeoutMs: number;
}): Promise<{ socket: tls.TLSSocket; tlsValid: boolean }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: params.ip,
      port: params.port,
      servername: params.hostname,
      rejectUnauthorized: true,
      ALPNProtocols: ["http/1.1"],
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TLS connect timeout after ${params.timeoutMs}ms`));
    }, params.timeoutMs);

    socket.once("secureConnect", () => {
      clearTimeout(timer);
      resolve({ socket, tlsValid: socket.authorized });
    });

    socket.once("error", (err) => {
      clearTimeout(timer);
      // Unauthorized still yields a cert sometimes via 'error' — prefer capturing if possible
      reject(err);
    });
  });
}

/**
 * Independently observe the certificate presented by hostname:443.
 * Does not accept or force a client-reported certificate.
 */
export async function observe(hostnameInput: string, options: ObserveOptions = {}): Promise<Observation> {
  const hostname = normalizeHostname(hostnameInput);
  const port = options.port ?? 443;
  if (port !== 443) {
    throw new NetPolicyError("only port 443 is allowed in MVP");
  }

  const resolveFn = options.resolveFn ?? defaultResolve;
  const observerId = options.observerId ?? process.env.OBSERVER_ID ?? "local-cli";
  const timeoutMs = options.connectTimeoutMs ?? 10_000;

  const firstLookup = await resolveFn(hostname);
  const publicIps = assertPublicIps(firstLookup, hostname);
  const allowed = new Set(publicIps);

  // Prefer IPv4 for simplicity in MVP when available.
  const candidate = publicIps.find((ip) => ip.includes(".")) ?? publicIps[0]!;

  const secondLookup = await resolveFn(hostname);
  const stillPublic = assertPublicIps(secondLookup, hostname);
  for (const ip of stillPublic) allowed.add(ip);
  assertIpStillAllowed(candidate, allowed);

  let socket: tls.TLSSocket | undefined;
  try {
    const connected = await connectTls({
      ip: candidate,
      hostname,
      port,
      timeoutMs,
    });
    socket = connected.socket;
    const cert = socket.getPeerX509Certificate();
    if (!cert) {
      throw new Error("server did not present an X509 certificate");
    }

    const observation: Observation = {
      hostname,
      remoteIp: candidate,
      observedAt: new Date().toISOString(),
      observerId,
      tlsValid: connected.tlsValid,
      certificateSha256: leafCertificateSha256(cert),
      spkiSha256: spkiSha256(cert),
      notBefore: new Date(cert.validFrom).toISOString(),
      notAfter: new Date(cert.validTo).toISOString(),
      issuer: cert.issuer,
      subject: cert.subject,
      sans: parseSans(cert),
      port,
    };

    return observation;
  } finally {
    socket?.end();
    socket?.destroy();
  }
}
