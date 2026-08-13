# WebNotary Constitution

Version: 1.1

This constitution defines the engineering principles governing the WebNotary repository.

It adapts the FishDev default constitution for WebNotary's public-interest Internet security mission.

This constitution is authoritative once adopted by this repository.

All humans and AI assistants working within the repository must follow these principles.

---

# I. Constitution Supremacy

This constitution governs all engineering activity within the repository.

Specifications, plans, tasks, implementations, reviews, commits, and AI behavior must comply with this constitution.

If a conflict exists between this constitution and an implementation decision, the constitution prevails.

---

# II. Spec-Driven Development

All work must originate from a specification.

No code change is too small to require specification.

This includes:

* Features
* Bug fixes
* Refactors
* Documentation updates
* Dependency upgrades
* Configuration changes
* Typographical corrections

Every meaningful change must be traceable to:

1. A specification
2. A task
3. A progress log entry

If no specification exists, create one before implementing work.

If no task exists, create one before implementing work.

Implementation without specification is prohibited.

---

# III. Repository State Is Authoritative

The repository is the source of truth.

Authoritative project knowledge exists only in:

* Constitution files
* Specifications
* Tasks
* Progress logs
* Handoff files
* Source code
* Tests
* Version control history

Human memory is not authoritative.

AI memory is not authoritative.

Prior conversations are not authoritative.

When uncertainty exists, consult the repository.

---

# IV. Clean Code

Code should follow the principles described by Robert C. Martin and Martin Fowler.

Code should be:

* Readable
* Maintainable
* Testable
* Refactorable
* Understandable by a new engineer

Prefer:

* Small functions
* Clear naming
* Single responsibility
* Explicit behavior
* Low coupling
* High cohesion

Code should be written for future maintainers, not merely for current execution.

---

# V. Refactoring Is Continuous

Refactoring is encouraged when it improves maintainability.

However:

Refactoring must remain within the scope of the current specification and task.

Large architectural changes require explicit specification.

Unrelated refactoring should not be mixed into feature work.

We strive for high TOCA scores based on the principles in TOCA.ai.

---

# VI. Narrow Task Scope

Work should remain narrowly focused on the active task.

Avoid unrelated changes.

Avoid opportunistic improvements outside the specification.

Avoid expanding scope without explicit approval.

The goal is predictable, reviewable progress.

Initial WebNotary development must stay deliberately small. Prove the minimum end-to-end system before adding distributed observers, richer trust policy, privacy improvements, or scale work.

---

# VII. Testing First

Testing is a first-class deliverable.

Preferred order:

1. Test-first development
2. Test development concurrent with implementation
3. Test-after-development (discouraged)

Code without validation is incomplete.

Every feature should have a corresponding validation strategy.

Security-sensitive components (hostname validation, SSRF destination filtering, certificate hashing, trust-state transitions, and abuse controls) require explicit automated tests before they are considered complete.

---

# VIII. Local and CI Validation

Tests should be executable:

1. Locally by developers
2. Automatically within CI/CD pipelines

Prefer test frameworks that support both environments.

Examples include:

* JUnit
* Jest
* Vitest
* PyTest
* Playwright
* Cypress
* Schemathesis

Avoid testing approaches that only work in a single environment when practical alternatives exist.

---

# IX. Version-Controlled Data Model and Infrastructure

Operational data model and infrastructure changes must be version controlled.

WebNotary's primary operational database is DynamoDB. Prefer infrastructure as code (Terraform preferred) for:

* DynamoDB tables, keys, attributes, TTL, and indexes
* SQS queues and dead-letter queues
* Lambda functions, IAM roles, and concurrency limits
* API Gateway configuration
* S3 buckets used for evidence retention
* CloudWatch alarms and related operational controls

Do not over-design secondary indexes until an actual access pattern requires them.

Manual production schema or infrastructure changes are prohibited except during emergencies and must be reconciled into version control immediately afterward.

Relational migration tools such as Flyway apply only if an RDBMS is later introduced by explicit specification.

---

# X. Git History Preservation

Version control history is valuable.

Never:

* Rewrite history unnecessarily
* Destroy work without authorization
* Reset or clean repositories without approval

Human work must never be discarded without explicit permission.

When uncertainty exists, stop and ask.

---

# XI. Progress Over Conversation

Project knowledge should be recorded in repository artifacts.

Important decisions belong in:

* Specifications
* Progress logs
* Handoff files
* Documentation

Do not rely on chat history to preserve project state.

A future engineer should be able to understand the project without access to prior conversations.

---

# XII. Human Reviewability

Every change should be understandable during review.

A reviewer should be able to determine:

* What changed
* Why it changed
* Which task it satisfies
* How it was tested

without reading AI conversations.

Repository artifacts should contain sufficient context.

---

# XIII. Reproducibility

Any engineer should be able to:

* Clone the repository
* Install dependencies
* Run tests
* Build the project

using documented procedures.

Avoid tribal knowledge.

Avoid undocumented setup steps.

Prefer automation over manual processes.

---

# XIV. Explicit Dependencies

Dependencies introduce long-term maintenance obligations.

Before introducing a dependency:

1. Evaluate maturity
2. Evaluate maintenance status
3. Evaluate community adoption
4. Evaluate security posture

Dependency selection should be deliberate.

When practical, document the rationale for introducing significant dependencies.

---

# XV. Technology Neutrality and Infrastructure Minimalism

Technology choices should be based on suitability, maintainability, and operational value.

Avoid adopting technologies primarily because they are fashionable.

Prefer:

* Stability
* Maintainability
* Simplicity
* Long-term support

over novelty.

For WebNotary operations, prefer AWS serverless services. Do not introduce EC2, ECS, nginx, App Runner, VPCs, NAT gateways, load balancers, or other persistent compute unless a later requirement is explicitly specified and justified.

---

# XVI. Security by Default

Security is a continuous responsibility.

Repositories should:

* Track dependency vulnerabilities
* Review security issues regularly
* Protect secrets appropriately
* Follow least-privilege principles

Secrets must never be committed to source control.

Security audits should be performed regularly and recorded in project history.

Assume the public WebNotary protocol and client source are fully public. Do not depend on hidden API keys, extension obfuscation, or secrecy for safety.

---

# XVII. AI Transparency

AI assistance is permitted and encouraged.

Work should be judged by:

* Correctness
* Maintainability
* Testability
* Documentation quality
* Security

not by whether it was produced by a human or an AI.

AI-generated code is subject to the same standards as human-generated code.

---

# XVIII. Specification Structure

Specifications are organized by release and feature.

Required structure:

```text
specs/
  <release-number>/
    <release>.<feature-number>-<feature-name>/
```

Examples:

```text
specs/
  0/
    0.001-user-authentication/
    0.002-registration/
    0.003-profile-management/

  1/
    1.001-reporting/
    1.002-admin-tools/
```

Rules:

* Release numbers start at 0
* Feature numbers increment sequentially within a release
* Feature names should be descriptive
* Specification directories are permanent project history

Specifications should contain, when applicable:

* spec.md
* plan.md
* tasks.md
* manualtester.md
* notes.md

---

# XIX. Progress Logging

Repositories must maintain an ongoing project history.

Progress logs should record:

* Decisions
* Implementations
* Test results
* Architectural changes
* Deployment events
* Significant discussions

The progress log is the project's operational memory.

---

# XX. Completion Criteria

Work is not complete until:

* Specification exists
* Task exists
* Implementation exists
* Testing exists
* Progress log updated
* Constitution remains satisfied

Implementation alone does not constitute completion.

---

# XXI. WebNotary Trust Boundary

The most important security rule in this project is:

> A client can request an investigation, but a client can never create trust.

Clients are untrusted. A browser extension may report what certificate it sees, but a client report must never be sufficient to mark a certificate as trusted.

Observers establish evidence. WebNotary-controlled or independently operated observers connect to a hostname themselves and record the certificate actually presented.

Certificate Transparency is evidence, not trust. A certificate appearing in CT proves that it was publicly logged, not that the legitimate site is serving it.

Client sightings and independent observations must remain distinct in the data model and in all trust-policy logic.

Only independent observation may cause WebNotary to trust a hostname/certificate relationship.

---

# XXII. Public Trust Semantics

The public browser-facing API must distinguish at least:

* `VALID`
* `UNKNOWN`
* `CONFLICT`

Unknown does not mean malicious.

Keep the browser extension simple. The backend decides trust policy. The extension asks whether a hostname/certificate pair is valid and presents the returned state clearly.

Do not expose complicated observer policy to the extension unless there is a demonstrated need.

Evolve trust-policy code in isolation so production policy can change without breaking the extension protocol.

During initial development, a single observer may be sufficient to prove the pipeline. Production trust should eventually require multiple genuinely independent perspectives. Multiple AWS regions are geographically useful but are not fully independent. At least one observer should eventually operate outside AWS.

---

# XXIII. Abuse and Cost Controls

Unknown requests must not create unbounded work.

An attacker who understands the public protocol must not be able to turn one cheap API request into expensive writes, probes, or fan-out.

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

Required controls include, as the corresponding systems are introduced:

* Strict request validation and maximum hostname/request lengths
* Verification deduplication by hostname
* TTL for temporary/pending records
* API Gateway throttling
* Lambda concurrency limits
* SQS retry limits and dead-letter handling
* Strict SSRF protections and public-destination-only networking
* Port 443 only for the initial observer
* CT inventory as a gate before expensive verification once CT ingestion exists
* CloudWatch alarms and AWS billing alerts

A client-provided unknown fingerprint must not automatically create an authoritative certificate record.

Do not allow public requests to turn WebNotary into a general-purpose scanner or SSRF service.

---

# XXIV. Evidence Architecture

Separate collection from serving. CT ingestion and historical seeding may run independently from the public WebNotary service.

Preserve raw evidence.

* Operational trust and current state belong in DynamoDB.
* Large immutable observation history belongs in S3.

Do not model WebNotary as one ever-growing document per domain.

Do not put unlimited raw observations into DynamoDB.

DynamoDB answers:

> What does WebNotary currently know?

S3 answers:

> What evidence has WebNotary ever collected?

---

# XXV. Client Privacy and Local Trust

Avoid background browsing telemetry.

Once a browser has locally trusted a hostname/certificate pair, it should not repeatedly query WebNotary for normal page loads.

Local trust cache entries must include at least:

* hostname
* certificate fingerprint
* validation time
* certificate expiration

Local trust must not live forever.

The public lookup path must never wait on a live TLS probe. Verification work is asynchronous.

---

# XXVI. Observer Integrity

The observer's job is to tell WebNotary what a hostname presents from that observer's network location.

An observer must not attempt to force a server to present a client-reported certificate.

Observers must validate hostname syntax, reject non-public destinations, defend against DNS rebinding, connect only to the allowed port set, capture the presented chain, perform normal PKI validation, and record fingerprints, remote IP, timestamp, and observer identity.

As multi-observer support is introduced, observers should eventually cryptographically sign their observations so an aggregator cannot fabricate what an observer reported.

---

# Guiding Principle

Build systems that a competent engineer can understand, verify, test, maintain, and extend years later.

Favor clarity over cleverness.
Favor discipline over convenience.
Favor documented knowledge over remembered knowledge.
Favor specifications over assumptions.
Favor maintainability over novelty.

For WebNotary specifically: favor independent evidence over client claims, favor bounded public cost over convenience, and favor a small proven pipeline over premature global infrastructure.
