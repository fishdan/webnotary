# WebNotary

## Purpose

WebNotary is public-interest Internet security infrastructure designed to answer one simple question for a browser:

> **Is this certificate valid and independently known for this domain?**

Traditional TLS/PKI establishes that a certificate chains to a trusted Certificate Authority and is valid for a hostname. WebNotary adds an independent perspective: does the certificate the browser is seeing agree with certificates observed for that hostname from elsewhere on the Internet?

The initial project should stay deliberately small. Build the minimum end-to-end system first, prove the concept, and add distributed observers, richer trust policy, privacy improvements, and scale later.

---

## Core Principles

1. **Clients are untrusted.** A browser extension may report what certificate it sees, but a client report must never be sufficient to mark a certificate as trusted.
2. **Observers establish evidence.** WebNotary-controlled or independently operated observers connect to a hostname themselves and record the certificate actually presented.
3. **Certificate Transparency is evidence, not trust.** A certificate appearing in CT proves that it was publicly logged, not that the legitimate site is serving it.
4. **Keep the browser extension simple.** The backend decides trust policy. The extension asks whether a hostname/certificate pair is valid.
5. **Avoid background browsing telemetry.** Once a browser has locally trusted a hostname/certificate pair, it should not repeatedly query WebNotary for normal page loads.
6. **Unknown does not mean malicious.** The public API should distinguish at least `VALID`, `UNKNOWN`, and `CONFLICT`.
7. **Unknown requests must not create unbounded work.** An attacker who understands the public protocol must not be able to turn one cheap API request into expensive writes, probes, or fan-out.
8. **Separate collection from serving.** CT ingestion and historical seeding can run independently from the public WebNotary service.
9. **Preserve raw evidence.** Operational trust state belongs in DynamoDB; large immutable observation history belongs in S3.
10. **No unnecessary infrastructure.** Prefer AWS serverless services. Avoid EC2, ECS, nginx, VPCs, NAT gateways, and persistent compute unless a later requirement justifies them.

---

## High-Level Architecture

```text
                         READ PATH

Chrome Extension
       |
       v
API Gateway HTTP API
       |
       v
Lookup Lambda
       |
       v
DynamoDB
       |
       +---- VALID
       +---- UNKNOWN
       +---- CONFLICT


                    UNKNOWN / VERIFICATION PATH

Lookup Lambda
       |
       v
Deduplicate pending verification
       |
       v
SQS Verification Queue
       |
       v
Observer Lambda(s)
       |
       +---- DNS resolution
       +---- TCP :443
       +---- TLS handshake with SNI
       +---- capture certificate chain
       +---- normal PKI validation
       +---- calculate fingerprints
       |
       v
DynamoDB current state + S3 raw evidence


                       SEEDING PATH

Certificate Transparency Logs
       |
       v
CT Ingestion / Normalization
       |
       v
Certificate Inventory
```

The CT ingestion pipeline is logically independent of WebNotary and may be developed or operated separately.

---

## Public API

The initial browser-facing API should be intentionally minimal.

### Request

`POST /v1/check`

```json
{
  "hostname": "example.com",
  "certificateSha256": "ABC123..."
}
```

### Response States

```json
{
  "status": "valid"
}
```

```json
{
  "status": "unknown"
}
```

```json
{
  "status": "conflict"
}
```

Do not expose complicated observer policy to the extension unless there is a demonstrated need.

### Intended Extension Behavior

```text
Browser visits example.com
        |
        v
Read presented certificate fingerprint
        |
        v
Is hostname + certificate already trusted locally?
        |
     +--+--+
    YES   NO
     |     |
   allow   v
        POST /v1/check
             |
       +-----+------+
       |     |      |
     VALID UNKNOWN CONFLICT
```

A locally cached validation should be associated with the hostname, certificate fingerprint, validation time, and certificate expiration. Local trust must not live forever.

---

## Data Model

This is primarily a key-oriented workload. DynamoDB is the initial operational database.

Do not model this as one ever-growing document per domain.

### Certificate Inventory

Represents certificates discovered through CT or other authoritative discovery mechanisms.

Conceptual fields:

```text
certificateSha256
spkiSha256
issuer
serial
notBefore
notAfter
SANs
ctFirstSeen
ctLastSeen
DER location if retained
```

A CT record means **CT_SEEN**, not trusted.

### Domain/Certificate State

Conceptual key:

```text
PK = HOST#example.com
SK = CERT#<sha256>
```

Potential fields:

```text
hostname
certificateSha256
spkiSha256

status

firstObserved
lastObserved
observationCount
observerCount

firstClientSeen
lastClientSeen
clientSeenCount

notBefore
notAfter
issuer
ctSeen
```

Client and observer evidence must remain distinct.

A client sighting means:

> A WebNotary client reported seeing this certificate.

It does **not** mean:

> WebNotary trusts this certificate.

### Pending Verification

Verification work must be deduplicated by hostname so thousands of unknown client submissions cannot create thousands of probes.

Conceptually:

```text
PK = VERIFY#example.com

status = PENDING
requestedAt
TTL
```

Use conditional creation so only the first request schedules work.

### Raw Observation History

Do not put unlimited raw observations into DynamoDB.

Store immutable observation records in S3, eventually using compressed/columnar storage such as Parquet and date-based partitions.

Example:

```text
s3://<bucket>/observations/
    year=2026/
      month=08/
        day=13/
          hour=10/
```

DynamoDB answers:

> What does WebNotary currently know?

S3 answers:

> What evidence has WebNotary ever collected?

---

## Observer Behavior

The observer should be a standalone component before it becomes a Lambda.

Given a hostname, it should:

1. Validate hostname syntax.
2. Resolve DNS.
3. Reject private, loopback, link-local, multicast, reserved, metadata, and otherwise non-public destinations.
4. Revalidate the resolved destination immediately before connection to defend against DNS rebinding.
5. Connect only to TCP port 443 initially.
6. Perform a TLS handshake using the hostname as SNI.
7. Capture the presented certificate chain.
8. Perform normal PKI validation.
9. Calculate at minimum:
   - SHA-256 of the leaf certificate.
   - SHA-256 of SubjectPublicKeyInfo (SPKI).
10. Record the actual remote IP.
11. Record observation timestamp and observer identity.
12. Emit/store the observation.

The observer's job is:

> Tell WebNotary what this hostname presents from this observer's network location.

It must not attempt to force the server to present the client-reported certificate.

---

## Unknown Certificate Flow

The browser-reported fingerprint is relevant and should be preserved, but it is untrusted input.

Conceptual flow:

```text
Client reports:
example.com + ABC123
        |
        v
Known trusted pair?
   |
 +---+---+
 |       |
YES      NO
 |        |
VALID     v
      Is certificate known in CT inventory?
             |
          +--+--+
          |     |
         NO    YES
          |     |
       UNKNOWN  v
       no       Is hostname already pending?
       expensive     |
       work       +--+--+
                  |     |
                 YES    NO
                  |     |
                  |     v
                  |   enqueue hostname
                  |
                  v
               UNKNOWN
```

A client-provided unknown fingerprint must not automatically create an authoritative certificate record.

The extension may cause WebNotary to **investigate**.

Only independent observation can cause WebNotary to **trust**.

---

## Abuse and Cost Controls

Assume the extension source code and protocol are completely public. Do not depend on hidden API keys, extension obfuscation, or secrecy.

A malicious request should have an amplification factor as close to 1 as possible.

For arbitrary garbage fingerprints, the ideal result is approximately:

```text
1 API request
1 cheap lookup
0 durable certificate writes
0 SQS jobs
0 DNS lookups
0 TLS probes
```

Initial controls should include:

- API Gateway throttling.
- Strict request validation.
- Maximum hostname/request lengths.
- Verification deduplication.
- DynamoDB TTL for temporary/pending records.
- Lambda concurrency limits.
- SQS retry limits and dead-letter handling.
- Strict SSRF protections.
- Port 443 only.
- CT inventory as a gate before expensive verification.
- CloudWatch alarms and AWS billing alerts.

Do not allow public requests to turn WebNotary into a general-purpose scanner or SSRF service.

---

## Trust States

The internal evidence model may be richer than the public API.

Possible internal progression:

```text
UNKNOWN
   |
CT_SEEN
   |
SINGLE_OBSERVED
   |
MULTI_OBSERVED
   |
ESTABLISHED
```

Also maintain an explicit:

```text
CONFLICT
```

state where appropriate.

Do not finalize the production trust algorithm prematurely. During initial development, a single observer may be sufficient to prove the pipeline, but production trust should eventually require multiple genuinely independent perspectives.

Multiple AWS regions are geographically useful but are not fully independent. At least one observer should eventually operate outside AWS.

---

## AWS MVP Architecture

Use the lightest practical serverless footprint.

### Public Website

```text
Route 53
   |
CloudFront
   |
S3 static site
```

Use ACM for certificates.

### API

```text
api.webnotary.org
       |
API Gateway HTTP API
       |
Lambda (TypeScript)
       |
DynamoDB On-Demand
```

### Verification

```text
SQS
 |
Lambda Observer
 |
+-- DynamoDB summarized/current state
+-- S3 raw evidence
```

Do not create a VPC unless later requirements demand one.

---

# Implementation Plan

## Step 1 — Define the Minimal Data Model

Create the initial DynamoDB design for:

- Certificate inventory.
- Domain/certificate trust state.
- Pending verification/deduplication.

Define the exact keys and minimum attributes required for the MVP.

Do not over-design secondary indexes until an actual access pattern requires them.

### MVP Access Pattern

The primary browser query is:

> Is certificate X valid for hostname Y?

Optimize this path first.

---

## Step 2 — Create AWS Foundation

Implement infrastructure as code, preferably Terraform.

Create:

- Route 53 configuration as needed.
- ACM certificates.
- DynamoDB tables.
- SQS verification queue.
- Dead-letter queue.
- Lambda IAM roles/policies.
- API Gateway HTTP API.
- CloudWatch logs.
- Basic alarms.
- S3 observation bucket.

Do not add EC2, ECS, nginx, App Runner, VPC, NAT Gateway, or load balancers.

---

## Step 3 — Build the Lookup API

Implement:

`POST /v1/check`

Accept:

```json
{
  "hostname": "example.com",
  "certificateSha256": "ABC123..."
}
```

Initially query DynamoDB and return `VALID` or `UNKNOWN`.

Add `CONFLICT` once the backend has enough evidence to make that determination.

Keep this Lambda small and deterministic.

---

## Step 4 — Build the TLS Observer Locally

Before involving SQS or Lambda, create a command-line observer.

Example conceptual usage:

```text
webnotary-observer accounts.google.com
```

It should output a structured observation containing at least:

```json
{
  "hostname": "accounts.google.com",
  "remoteIp": "...",
  "observedAt": "...",
  "tlsValid": true,
  "certificateSha256": "...",
  "spkiSha256": "...",
  "notBefore": "...",
  "notAfter": "...",
  "issuer": "...",
  "sans": []
}
```

Write tests for hostname validation, certificate hashing, SPKI hashing, and blocked destination ranges.

This component must work reliably before deploying it.

---

## Step 5 — Deploy the Observer as a Worker

Package the observer logic for Lambda.

Configure SQS as its event source.

A verification job should contain the hostname and may preserve the original client-reported fingerprint for comparison/auditing.

The observer must independently record what it sees.

---

## Step 6 — Connect UNKNOWN to Verification

Modify `/v1/check`.

When a hostname/certificate pair is unknown:

1. Preserve appropriate client-sighting information without treating it as trust.
2. Check for an existing pending verification for the hostname.
3. If none exists, conditionally create a pending record.
4. Enqueue one verification job.
5. Immediately return `UNKNOWN`.

Never make the browser wait for a live TLS probe.

---

## Step 7 — Add Deduplication and Abuse Protection

Before broad public testing:

- Deduplicate verification by hostname.
- Add TTL to pending records.
- Add API throttling.
- Validate inputs strictly.
- Add Lambda concurrency limits.
- Add SQS DLQ/retry behavior.
- Implement complete SSRF destination filtering.
- Add operational/billing alarms.

Test intentionally hostile inputs.

---

## Step 8 — Build CT Ingestion

Develop this as an independent component.

Consume Certificate Transparency data and populate the certificate inventory with:

- Certificate SHA-256.
- SPKI SHA-256.
- SANs.
- Issuer.
- Serial.
- Validity.
- CT timestamps/source.

CT ingestion should collect evidence only. It should not make WebNotary trust decisions.

It can run before the rest of WebNotary is complete so historical data begins accumulating.

---

## Step 9 — Make CT the Verification Gate

Once the CT inventory is reliable, modify unknown handling.

If a client submits a fingerprint that is completely unknown to the CT inventory:

- Return `UNKNOWN`.
- Do not automatically create expensive verification work.

If the certificate is CT-known but the hostname/certificate relationship is not established by WebNotary:

- Deduplicate.
- Queue independent verification.

This substantially limits abuse amplification.

---

## Step 10 — Implement Trust-State Calculation

Define the first explicit rules for moving domain/certificate pairs between states.

For development:

```text
CT known + one successful independent observation
    -> sufficient to test VALID flow
```

This is not necessarily the final production policy.

Ensure trust-policy code is isolated enough that the policy can evolve without changing the extension protocol.

---

## Step 11 — Add Multiple Observers

Add multiple independent vantage points.

Start with something like:

```text
AWS US East
AWS US West
Non-AWS observer
```

Later expand geographically and organizationally.

Observers should eventually cryptographically sign their observations so an aggregator cannot fabricate what an observer reported.

---

## Step 12 — Build the Chrome Extension

Only after the backend pipeline works end to end.

The extension should:

1. Determine the current hostname.
2. Obtain the certificate fingerprint presented for that connection.
3. Look for the hostname/certificate pair in its local trust cache.
4. If locally trusted and unexpired, do nothing.
5. Otherwise call `POST /v1/check`.
6. Cache `VALID` results.
7. Clearly surface `UNKNOWN`.
8. Strongly surface `CONFLICT`.

The extension must not send a request on every page load.

---

## Step 13 — Implement Local Trust Expiration

Store at least:

```text
hostname
certificateSha256
webNotaryValidatedAt
certificateNotAfter
```

Do not allow a locally cached trust decision to survive indefinitely.

Revalidation policy can evolve later.

---

## Step 14 — Accumulate Historical Evidence

Keep CT ingestion and observers running.

Maintain:

```text
firstSeen
lastSeen
observationCount
observerCount
firstClientSeen
lastClientSeen
clientSeenCount
```

Remember that client sightings and independent observations have different evidentiary value.

---

## Step 15 — Optimize Privacy and Scale

Do this only after the core system works.

Potential later work:

- Signed observer attestations.
- Signed WebNotary database snapshots.
- Downloadable local certificate datasets.
- Bloom filters or other compact membership structures.
- Privacy-preserving client telemetry.
- More sophisticated consensus.
- Geographic/network diversity scoring.
- DNS comparison.
- ASN/routing observations.
- High-value-domain continuous monitoring.
- Public research datasets/APIs.
- Automated certificate-rotation detection.

---

# Initial Development Milestone

The first milestone is intentionally small:

```text
DynamoDB
   |
Lookup API
   |
Local TLS Observer
```

At the end of the first milestone, a developer should be able to:

1. Run the observer against a real HTTPS hostname.
2. Obtain its certificate SHA-256 fingerprint.
3. Insert a known hostname/certificate relationship into DynamoDB.
4. Call `/v1/check`.
5. Receive `VALID` for the known pair.
6. Receive `UNKNOWN` for an unknown pair.

Then add:

```text
SQS
 |
Observer Lambda
 |
UNKNOWN-triggered verification
```

Only after that basic pipeline works should CT ingestion, multiple observers, and the Chrome extension become blockers.

---

# Non-Goals for the Initial Build

Do **not** initially build:

- A global observer network.
- Complex consensus algorithms.
- A giant downloadable browser database.
- User accounts.
- Authentication for ordinary public lookups.
- A general-purpose TLS scanner.
- DNS/routing validation.
- A complicated Web UI.
- Organization identity verification.
- Mobile browser support.
- Perfect production trust scoring.

The first goal is to prove:

> A browser can report the certificate it sees, WebNotary can compare that against independently collected evidence, and WebNotary can return a simple trust state without placing the live observer in the browser's request path.

---

# Security Boundary to Preserve

The most important rule in the project is:

> **A client can request an investigation, but a client can never create trust.**

WebNotary trust must come from independently collected evidence.
