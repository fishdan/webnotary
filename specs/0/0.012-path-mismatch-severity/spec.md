# Feature Specification: Path-Mismatch Conflict Severity

**Feature Branch**: `0.012-path-mismatch-severity`  
**Created**: 2026-08-14  
**Status**: Implementing  
**Depends on**: 0.007, 0.008, conflict detail on `/v1/check`

## Intent

Keep fingerprint comparison unchanged. Interpret conflicts as **path vs public observation**, not “illegitimate certificate.”

- Browser leaf that loaded the page already passed **local PKI**.
- WebNotary conflict means that leaf **differs** from independently observed leaf(es) for the hostname.
- Primary user story: possible **proxy / middlebox / unexpected path**, not a generic scare.
- Avoid loud UX when multi-cert public surface is expected (e.g. large CDNs).

## In Scope

- Trust-policy classifier: conflict `severity` = `info` | `attention` | `alert` (MVP uses `info` + `attention`; `alert` reserved)
- API: extend `conflict` object with `severity`, `signals`, `summary`
- Extension: badge / notification / archive / popup copy driven by severity
- Archive upsert by situation signature (host + leaves); notify on new/changed situation, and only sticky-notify for `attention`+

## Out of Scope

- CDN allowlists
- Multi-observer consensus gate for `alert`
- Changing top-level statuses (`valid` | `unknown` | `conflict` stay)
- Claiming PKI fraud or “fake Google cert”

## Acceptance

1. Sibling conflict on a host with ≥2 observed leaves → `severity: "info"`.
2. Sibling conflict with 1 observed leaf and client FP not in CT inventory → `severity: "attention"`.
3. Client FP in CT inventory on conflict → at most `info`.
4. Extension does not sticky-notify on `info`; does on `attention`.
5. Copy mentions path / public observation and browser PKI acceptance — not “illegitimate.”
