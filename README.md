# Rivan Cybersecurity Institute

## Cybersecurity Training Laboratory

Rivan Cybersecurity Institute is an authorized, isolated cybersecurity lab for learning web security testing safely.

In this project, you will complete exactly three hands-on challenges:

1. Broken Access Control / IDOR
2. Authentication & Session Security
3. SSRF & Internal Service Discovery

IMPORTANT:
- This lab is for authorized training only.
- Only Challenges 1–3 are active.
- Challenges 4 and 5 are not part of this learner guide.

## Before You Begin

Follow this checklist first.

1. You need **Node.js** and **npm**.
	 - Node.js runs the lab.
	 - npm installs the project packages.
2. You need a modern browser (Chrome, Edge, or Firefox).
3. You need a terminal (Windows PowerShell is used in this guide).

### Verify Node.js and npm

1. Press the Windows key.
2. Type **Windows PowerShell**.
3. Click **Windows PowerShell**.
4. Type this command and press Enter:

```text
node -v
```

5. Type this command and press Enter:

```text
npm -v
```

What You Should See:
- A Node.js version (for example `v22.x.x`).
- An npm version (for example `10.x.x`).

If either command fails, install Node.js from the official website, then reopen PowerShell and run the commands again.

## Step 1 — Start the Laboratory

1. Open **Windows PowerShell**.
2. Copy and run this command:

```text
Set-Location -Path "C:\Users\Administrator\Desktop\rivan-hacker-lab"
```

3. Install dependencies:

```text
npm install
```

4. Start the lab on port `3005`:

```text
$env:PORT="3005"; npm run dev
```

What You Should See:
- Next.js startup output.
- A line that includes local access on port `3005`.

NOTE:
- Keep this PowerShell window open while using the lab.
- Stopping this command will stop the lab.

## Step 2 — Open the Website

1. Open Google Chrome (or your browser of choice).
2. Click the address bar.
3. Enter this URL:

```text
http://localhost:3005/
```

4. Press Enter.

What You Should See:
- A dark-themed dashboard with the heading **Rivan Cybersecurity Institute**.
- Three challenge cards:
	- `idor-broken-access-control`
	- `authentication-session-security`
	- `ssrf-internal-service-discovery`

## Step 3 — Choose a Challenge

1. On the dashboard, find the challenge card you want.
2. Click the **Open target** button on that card.
3. Follow the corresponding guide:

- [Challenge 1 Guide](docs/challenge-01/README.md)
- [Challenge 2 Guide](docs/challenge-02/README.md)
- [Challenge 3 Guide](docs/challenge-03/README.md)

## Optional Hostname Mode (Advanced but Useful)

This lab supports host-based routing:
- `hr.internal.lab`
- `portal.internal.lab`
- `scanner.internal.lab`

If your hosts file maps those names to localhost, you can browse:

```text
http://hr.internal.lab:3005/
http://portal.internal.lab:3005/
http://scanner.internal.lab:3005/
```

If you do not set hostnames, use `http://localhost:3005/targets/...` URLs in each challenge guide.

## Verified Tech Stack (for transparency)

- Frontend: Next.js App Router + React + TypeScript
- Backend: Next.js route handlers (`/api/...`)
- Storage: In-memory Maps (no external database)
- Containers: No Docker or Docker Compose in this repository
- Environment files: none required for default local run

## Troubleshooting (Quick)

### Problem: `npm run dev -- -p 3005` fails

Use the verified command instead:

```text
$env:PORT="3005"; npm run dev
```

### Problem: `http://localhost:3005` does not load

1. Confirm the dev server terminal is still running.
2. If it stopped, run:

```text
$env:PORT="3005"; npm run dev
```

### Problem: “Invalid email or password”

You entered incorrect credentials. Use the exact values shown in each challenge guide.

## Quality Checks (Developer Verification)

Run from project root:

```text
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Full Documentation Hub

Open [docs/README.md](docs/README.md) for the complete lab manual.
