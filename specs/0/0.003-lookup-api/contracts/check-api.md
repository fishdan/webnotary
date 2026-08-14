# API Contract: POST /v1/check

## Request

```http
POST /v1/check
Content-Type: application/json
```

```json
{
  "hostname": "example.com",
  "certificateSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `hostname` | string | Required; normalized per 0.001 (DNS hostname, not IP) |
| `certificateSha256` | string | Required; 64 hex chars (case-insensitive in) |

Max body size: **4096** bytes.

## Success response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{ "status": "valid" }
```

```json
{ "status": "unknown" }
```

```json
{ "status": "conflict" }
```

Conflict responses **may** include detail (backward compatible; clients may ignore):

```json
{
  "status": "conflict",
  "conflict": {
    "reason": "sibling_observed",
    "knownCertificateSha256s": [
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    ]
  }
}
```

| `conflict.reason` | Meaning |
|-------------------|---------|
| `sibling_observed` | Another observed/trusted leaf exists for this hostname |
| `stored_conflict` | This pair is already stored as `CONFLICT` |
| `acquire_mismatch` | Live acquire observer saw a different leaf than the client |

## Error response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "invalid_request",
  "message": "human-readable reason"
}
```

| HTTP | When |
|------|------|
| 400 | Validation/normalization failure, empty/oversized body, invalid JSON |
| 500 | Unexpected handler/infrastructure failure |

No `301` field on success. No internal DynamoDB status on any response.
