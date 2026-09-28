# Rivan Cybersecurity Institute Lab Documentation

This folder is the authoritative learner documentation for this repository.

IMPORTANT:
- This documentation is written for complete beginners.
- Every workflow in these guides was verified against the running application.
- Only Challenges 1–3 are active.

## Start Here

1. Read the project entry guide: [../README.md](../README.md)
2. Start the lab on `http://localhost:3005/`
3. Complete challenges in order:
   - [Challenge 1 — Broken Access Control / IDOR](challenge-01/README.md)
   - [Challenge 2 — Authentication & Session Security](challenge-02/README.md)
   - [Challenge 3 — SSRF & Internal Service Discovery](challenge-03/README.md)

## What is Implemented in This Repository

- Frontend: Next.js App Router (React + TypeScript)
- Backend APIs: Next.js route handlers under `src/app/api`
- Storage: in-memory session/progress state (`Map` objects)
- Database: none
- Docker / Docker Compose: not present
- Required env file: none for local default run

## Verified Targets

- `hr.internal.lab` → Employee HR Portal
- `portal.internal.lab` → Internal Operations Portal
- `scanner.internal.lab` → URL Inspection Service

Internal service used by Challenge 3:
- `internal-admin.internal.lab` (reachable through scanner flow)

## Verified Local URLs

- Dashboard: `http://localhost:3005/`
- Challenge 1 page: `http://localhost:3005/challenges/idor-broken-access-control`
- Challenge 2 page: `http://localhost:3005/challenges/authentication-session-security`
- Challenge 3 page: `http://localhost:3005/challenges/ssrf-internal-service-discovery`
- HR target: `http://localhost:3005/targets/hr`
- Portal target: `http://localhost:3005/targets/portal`
- Scanner target: `http://localhost:3005/targets/scanner`

## Optional Hostname Routing

If your hosts file maps internal hostnames to `127.0.0.1`, these host-based routes work:

```text
http://hr.internal.lab:3005/
http://portal.internal.lab:3005/
http://scanner.internal.lab:3005/
```

## Verified Reset Endpoints

- Challenge 1 reset: `POST /api/hr/reset`
- Challenge 2 reset: `POST /api/portal/reset`
- Challenge 3 reset: `POST /api/scanner/reset`

## Verification Commands

Run from the project root:

```text
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

All commands above passed during documentation QA.
