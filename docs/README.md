# Northstar Logistics Cyberlab Documentation

Northstar Logistics is an isolated, authorized security training lab focused on practical web and network exploitation patterns in a controlled environment.

## Architecture overview
- Framework: Next.js App Router (frontend + route-handler APIs)
- State: in-memory per-challenge session/progress stores
- Targets:
  - `hr.internal.lab` → Employee HR Portal
  - `portal.internal.lab` → Operations Portal
  - `scanner.internal.lab` → URL Inspection Service
- Internal objective service (for SSRF lab): `internal-admin.internal.lab` (backend-internal route boundary)

## Active challenges
Only these challenges are implemented and exposed:
1. Broken Access Control / IDOR
2. Authentication & Session Security
3. SSRF & Internal Service Discovery

Challenges 4 and 5 are intentionally not exposed in the user-facing dashboard.

## Prerequisites
- Node.js 20+ (tested on Node 22)
- npm 10+

## Start the complete lab
```bash
npm install
npm run dev -- -p 3005
```

Open:
- Dashboard: `http://localhost:3005/`
- Challenge targets:
  - `http://localhost:3005/targets/hr`
  - `http://localhost:3005/targets/portal`
  - `http://localhost:3005/targets/scanner`

## Optional hostname simulation
Add hosts-file entries to map lab hostnames to localhost:
```text
127.0.0.1 hr.internal.lab
127.0.0.1 portal.internal.lab
127.0.0.1 scanner.internal.lab
```
Then browse:
- `http://hr.internal.lab:3005/`
- `http://portal.internal.lab:3005/`
- `http://scanner.internal.lab:3005/`

## Network topology (logical)
- Lab scope: `10.20.0.0/16` (training narrative)
- Exposed app listener: localhost port `3005`
- SSRF internal boundary: scanner route can request internal admin route server-side

## Run quality checks
```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Reset behavior
Each challenge has an independent reset endpoint:
- Challenge 01: `POST /api/hr/reset`
- Challenge 02: `POST /api/portal/reset`
- Challenge 03: `POST /api/scanner/reset`

## Troubleshooting
- App fails to start: run `npm install` again and retry.
- `next` not recognized: dependencies were not installed in this workspace.
- Target hostname not resolving: use `/targets/*` routes or update hosts file.
- Session not maintained: verify browser cookies are enabled.
- Challenge progress not updating: refresh challenge page; verify corresponding `/api/*/api/progress` endpoint.

## Challenge guides
- [Challenge 01](challenge-01/README.md)
- [Challenge 02](challenge-02/README.md)
- [Challenge 03](challenge-03/README.md)
