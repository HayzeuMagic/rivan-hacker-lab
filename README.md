# Rivan Hacker Lab

Rivan Hacker Lab is the official hands-on red-team training laboratory of Rivan Cybersecurity Institute. The platform is built around real HTTP handlers, browser targets, API behavior, cookies, sessions, simulated Kali terminals, and independently resettable challenge state.

## Curriculum

The current curriculum is:

1. **Broken Access Control / IDOR** - `hr.internal.lab`
2. **Authentication & Session Security** - `portal.internal.lab`
3. **SSRF & Internal Service Discovery** - `scanner.internal.lab`
4. **SQL Injection** - `shop.aurora.internal.lab`
5. **Credential Attacks** - `auth.harborpoint.internal.lab`
6. **Network Service Exploitation** - `10.20.30.10` (ats-srv01)
7. **SMB / Windows Network Attack** - `10.20.50.20` (FILESRV)
8. **Linux Privilege Escalation** - `10.20.40.10` (web-srv01)
9. **Lateral Movement** - `172.16.30.40` (fin-db01, internal segment)

The lab network is fictional and scoped to `10.20.0.0/16`. No requests should be sent to public websites, real organizations, or external infrastructure.

## Architecture

- **Web targets** (challenges 1-5) are real Next.js HTTP services. Each target processes requests server-side, maintains HTTP session cookies, exposes realistic status codes, and records progress from backend interactions.
- **Terminal challenges** (challenges 6-9) run against simulated Kali terminal machines in `src/lib/lab/` that emulate nmap, ftp, netcat, smbclient, enum4linux, ssh, and shell behavior with realistic outputs.
- Vulnerability behavior belongs in the target service boundary and must not be implemented as command recognition or frontend-only flag detection.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Open `http://localhost:3000` after starting the development server.

## Documentation

- [Challenge 1 - Broken Access Control](docs/challenge-1-broken-access-control.md)
- [Challenge 2 - Authentication & Session Security](docs/challenge-2-authentication-session-security.md)
- [Challenge 3 - SSRF & Internal Service Discovery](docs/challenge-3-ssrf-internal-service-discovery.md)
- [Challenge 4 - SQL Injection](docs/challenge-4-sql-injection.md)
- [Challenge 5 - Credential Attacks](docs/challenge-5-credential-attacks.md)
- [Challenge 6 - Network Service Exploitation](docs/challenge-6-network-service-exploitation.md)
- [Challenge 7 - SMB / Windows Network Attack](docs/challenge-7-smb-windows-network-attack.md)
- [Challenge 8 - Linux Privilege Escalation](docs/challenge-8-linux-privilege-escalation.md)
- [Challenge 9 - Lateral Movement](docs/challenge-9-lateral-movement.md)
