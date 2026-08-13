# Data Model: Operational DynamoDB Schema (MVP)

**Spec**: [spec.md](./spec.md)  
**Status**: Active for release 0  
**Table name (logical)**: `webnotary`  
**Billing**: On-Demand  
**Keys**: `pk` (S), `sk` (S)  
**TTL attribute**: `expiresAt` (N, epoch seconds) — used by pending verification items only in MVP

This document is the authoritative schema for 0.001. Infrastructure (0.002) and application code MUST follow it.

---

## Design Decisions

### Single table

MVP uses one table with entity-typed key prefixes. Rationale:

- Access patterns are key-value GetItem oriented
- Avoids cross-table coupling for the first milestone
- Query-by-hostname (all certs) remains possible via `pk = HOST#...` without a GSI

### No GSI in MVP

The browser path is exactly one pair lookup. Hostname fan-in for pending work is a single item key. Defer GSIs until a measured access pattern requires them.

### Canonicalization belongs in shared code

All writers/readers MUST build keys via shared helpers so casing and fingerprint formatting cannot diverge between Lambdas.

---

## Normalization Rules

### Hostname → `canonicalHostname`

1. Trim whitespace.
2. Reject if empty.
3. Reject if IPv4/IPv6 literal (hostname form only for MVP keys).
4. Strip one trailing `.` if present.
5. Apply IDNA/punycode so the stored form is ASCII DNS labels.
6. Lowercase the ASCII result.
7. Reject if length > 253 or any label is empty / > 63 / invalid DNS label charset.

### Certificate fingerprint → `certificateSha256`

1. Accept the SHA-256 digest of the **leaf certificate DER**.
2. Encode as **lowercase hex**, length **64**.
3. Reject uppercase-only input by normalizing to lowercase; reject non-hex or wrong length.

### SPKI fingerprint → `spkiSha256`

Same encoding rules as certificate fingerprint (lowercase hex SHA-256 of SubjectPublicKeyInfo DER).

---

## Entity Key Patterns

| Entity | `pk` | `sk` | Primary operation |
|--------|------|------|-------------------|
| Domain/certificate state | `HOST#<canonicalHostname>` | `CERT#<certificateSha256>` | GetItem |
| Certificate inventory | `CERT#<certificateSha256>` | `META` | GetItem |
| Pending verification | `VERIFY#<canonicalHostname>` | `PENDING` | conditional PutItem |

---

## Entity: DomainCertificateState

Current operational knowledge for one hostname + leaf certificate pair.

### Keys

```text
pk = HOST#example.com
sk = CERT#<64-hex-sha256>
```

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `pk` | S | yes | `HOST#...` |
| `sk` | S | yes | `CERT#...` |
| `entityType` | S | yes | Constant `DOMAIN_CERT` |
| `hostname` | S | yes | Canonical hostname (denormalized) |
| `certificateSha256` | S | yes | Lowercase hex leaf fingerprint |
| `spkiSha256` | S | no | Lowercase hex SPKI fingerprint when known |
| `status` | S | yes | Operational status (see enum) |
| `notBefore` | S | no | Leaf notBefore (ISO-8601) |
| `notAfter` | S | no | Leaf notAfter (ISO-8601) |
| `issuer` | S | no | Issuer DN string when known |
| `ctSeen` | BOOL | no | True if inventory/CT evidence linked |
| `firstObserved` | S | no | ISO-8601 first **observer** evidence |
| `lastObserved` | S | no | ISO-8601 last **observer** evidence |
| `observationCount` | N | no | Count of observer observations aggregated |
| `observerCount` | N | no | Distinct observers contributing (MVP may be 0/1) |
| `firstClientSeen` | S | no | ISO-8601 first **client** report |
| `lastClientSeen` | S | no | ISO-8601 last **client** report |
| `clientSeenCount` | N | no | Count of client reports aggregated |
| `lastEvidenceS3Key` | S | no | Pointer to latest raw evidence object (0.005) |
| `updatedAt` | S | yes | ISO-8601 last item update |

### `status` enum (stored)

Initial stored values for MVP (policy in 0.007 may extend):

| Value | Meaning | Typical public API mapping |
|-------|---------|----------------------------|
| `UNKNOWN` | Relationship not established by WebNotary | `unknown` |
| `CT_SEEN` | Cert known in inventory; hostname relationship not established by observation | `unknown` |
| `SINGLE_OBSERVED` | Observed by one independent observer | often `valid` in **dev** policy only |
| `MULTI_OBSERVED` | Observed by multiple observers | `valid` (future) |
| `ESTABLISHED` | Policy-declared established trust | `valid` |
| `CONFLICT` | Evidence indicates conflicting certificates/presentations | `conflict` |

**Rules:**

- Absence of a DomainCertificateState item ⇒ public `unknown`.
- Client code paths MUST NOT set `status` to `SINGLE_OBSERVED`, `MULTI_OBSERVED`, `ESTABLISHED`, or otherwise grant trust.
- Client paths MAY create/update an item with `status = UNKNOWN` solely to record sightings, or update sighting fields on an existing item without changing a higher trust status.

---

## Entity: CertificateInventoryItem

Discovery/CT metadata for a certificate. **Not trust.**

### Keys

```text
pk = CERT#<certificateSha256>
sk = META
```

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `pk` | S | yes | `CERT#...` |
| `sk` | S | yes | `META` |
| `entityType` | S | yes | Constant `CERT_INVENTORY` |
| `certificateSha256` | S | yes | Lowercase hex leaf fingerprint |
| `spkiSha256` | S | no | SPKI fingerprint when parsed |
| `issuer` | S | no | Issuer DN |
| `serial` | S | no | Serial as hex or decimal string (document choice in 0.006; store opaque string) |
| `notBefore` | S | no | ISO-8601 |
| `notAfter` | S | no | ISO-8601 |
| `sans` | L\<S\> | no | DNS SANs (canonical lowercase/punycode where applicable) |
| `ctFirstSeen` | S | no | ISO-8601 first CT observation time |
| `ctLastSeen` | S | no | ISO-8601 last CT observation time |
| `ctSource` | S | no | Log/operator identifier |
| `derS3Key` | S | no | Optional retained DER object key |
| `updatedAt` | S | yes | ISO-8601 |

Interpretation: inventory presence means **CT_SEEN / discovered**, never hostname VALID.

---

## Entity: PendingVerification

Dedupe lock for independent observation work for a hostname.

### Keys

```text
pk = VERIFY#<canonicalHostname>
sk = PENDING
```

### Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `pk` | S | yes | `VERIFY#...` |
| `sk` | S | yes | `PENDING` |
| `entityType` | S | yes | Constant `PENDING_VERIFY` |
| `hostname` | S | yes | Canonical hostname |
| `status` | S | yes | `PENDING` for MVP |
| `requestedAt` | S | yes | ISO-8601 |
| `requestedCertificateSha256` | S | no | Client-reported fingerprint for audit only (untrusted) |
| `expiresAt` | N | yes | Epoch seconds TTL (DynamoDB TTL) |
| `updatedAt` | S | yes | ISO-8601 |

### Conditional create

```text
PutItem
  ConditionExpression: attribute_not_exists(pk)
```

Only the first writer schedules work (0.005). Losers leave pending unchanged.

### TTL

- MVP default: `expiresAt = floor(now/1000) + 900`
- After expiry, DynamoDB deletes the item; a new verification may be scheduled

### Completion

0.005 SHOULD DeleteItem the pending record when verification finishes (success or terminal failure) rather than relying only on TTL.

---

## Access Patterns

| # | Need | Op | Key |
|---|------|----|-----|
| AP1 | Browser check hostname+cert | GetItem | `HOST#h` / `CERT#fp` |
| AP2 | CT gate: is fingerprint known? | GetItem | `CERT#fp` / `META` |
| AP3 | Begin verification dedupe | PutItem Cond | `VERIFY#h` / `PENDING` |
| AP4 | Clear verification lock | DeleteItem | `VERIFY#h` / `PENDING` |
| AP5 | Record/update client sighting | UpdateItem/Put | `HOST#h` / `CERT#fp` (client fields only / no trust grant) |
| AP6 | Upsert inventory from CT | Put/Update | `CERT#fp` / `META` |
| AP7 | Apply observer result to state | UpdateItem | `HOST#h` / `CERT#fp` (observer fields + status via policy) |
| AP8 | (Optional) list certs for host | Query | `pk = HOST#h`, `sk begins_with CERT#` |

No scan patterns are part of MVP.

---

## Non-goals in this table

- Per-observation event rows in DynamoDB
- Per-client identity tracking
- User accounts
- Global secondary indexes
- One document containing all certificates ever seen for a domain as a growing list attribute

---

## S3 boundary (pointer only)

DynamoDB may store `lastEvidenceS3Key` / `derS3Key`. Object layouts are owned by 0.005 / 0.006. Suggested future prefix (non-normative here):

```text
s3://<bucket>/observations/year=YYYY/month=MM/day=DD/hour=HH/...
```
