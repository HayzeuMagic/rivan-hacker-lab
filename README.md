# Northstar Logistics Cyberlab

Northstar Logistics Cyberlab is an isolated, authorized security training environment built with Next.js.

## Current deployment state

Only the following challenges are deployed and exposed:

1. **Broken Access Control / IDOR** (`hr.internal.lab`)
2. **Authentication & Session Security** (`portal.internal.lab`)
3. **SSRF & Internal Service Discovery** (`scanner.internal.lab`)

Challenges 4 and 5 are intentionally not exposed in the user-facing dashboard.

## Quick start

```bash
npm install
npm run dev -- -p 3005
```

Open `http://localhost:3005`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Documentation

See the docs hub: [docs/README.md](docs/README.md)
