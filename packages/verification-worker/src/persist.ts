import type { Observation } from "@webnotary/observer";
import { hostCertKeys } from "@webnotary/data-model";

export interface PersistDeps {
  tableName: string;
  bucketName: string;
  putObject: (key: string, body: string) => Promise<void>;
  upsertObservedCert: (input: {
    hostname: string;
    certificateSha256: string;
    spkiSha256: string;
    notBefore: string;
    notAfter: string;
    issuer: string;
    observedAt: string;
    evidenceKey: string;
  }) => Promise<void>;
  deletePending: (hostname: string) => Promise<void>;
}

export function evidenceKey(obs: Observation, now = new Date(obs.observedAt)): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  return `observations/year=${yyyy}/month=${mm}/day=${dd}/hour=${hh}/${obs.hostname}-${obs.certificateSha256}.json`;
}

export async function persistObservation(
  deps: PersistDeps,
  obs: Observation,
  requestedCertificateSha256?: string,
): Promise<string> {
  const key = evidenceKey(obs);
  const evidence = {
    ...obs,
    requestedCertificateSha256: requestedCertificateSha256 ?? null,
    fingerprintMatchesRequest:
      requestedCertificateSha256 != null
        ? requestedCertificateSha256 === obs.certificateSha256
        : null,
  };
  await deps.putObject(key, JSON.stringify(evidence));

  if (obs.tlsValid) {
    await deps.upsertObservedCert({
      hostname: obs.hostname,
      certificateSha256: obs.certificateSha256,
      spkiSha256: obs.spkiSha256,
      notBefore: obs.notBefore,
      notAfter: obs.notAfter,
      issuer: obs.issuer,
      observedAt: obs.observedAt,
      evidenceKey: key,
    });
  }

  await deps.deletePending(obs.hostname);
  return key;
}

export { hostCertKeys };
