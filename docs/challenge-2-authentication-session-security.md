# Challenge 2 - Authentication & Session Security

## Purpose

Northstar Logistics uses a separate employee portal for operations staff. The learner investigates its login, password-recovery, and session behavior to identify one coherent authentication weakness: a predictable password-reset token.

The application must perform the workflow through real HTTP handlers, cookies, and server-side account records. The frontend must not decide whether the learner is authenticated and must not contain the flag.

## Scope

| Item | Value |
| --- | --- |
| Company | Northstar Logistics |
| Target | `http://portal.internal.lab` |
| Lab network | `10.20.0.0/16` |
| Primary vulnerability | Predictable password-reset token |
| Intended account | `operations-admin@northstar.internal` |
| Flag | `RIVAN{session_security_failure}` |

## Learning Objectives

- Trace a real login and password-recovery workflow.
- Understand how cookies represent authentication state.
- Recognize why reset tokens must be random, single-use, and short-lived.
- Demonstrate authentication impact without relying on a known password.
- Explain secure session invalidation and account-recovery design.

## Vulnerability Choice

This lab focuses on predictable recovery tokens only. It does not combine IDOR, SQL injection, credential stuffing, or multiple unrelated session flaws.

The vulnerable recovery service derives the reset token from a low-entropy, observable account attribute such as the employee number. The recovery email preview or normal response does not disclose the token. The learner must inspect the request flow and infer or test the token construction from behavior exposed by the application.

The intended demonstration is that a recovery token can be predicted and replayed to set a new password for the operations administrator. A successful login with that account creates a privileged session and unlocks the restricted operations page.

## Required Evidence

1. The login and recovery mechanisms are discovered through the portal.
2. A real password-reset request is submitted for an existing account.
3. The reset workflow's token behavior is analyzed through HTTP responses and controlled requests.
4. A valid reset token is demonstrated without reading server files or a database dump.
5. The administrator password is changed through the actual reset endpoint.
6. The learner logs in and receives an authenticated administrator session.
7. The restricted operations function is accessed and returns the flag.
8. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/authentication-session-security` and select **Start lab** or **Reset lab**. Reset must invalidate all sessions, delete outstanding reset tokens, restore account passwords, clear evidence, and clear flag state.

### Step 1 - Inspect Login and Recovery

The portal should expose ordinary navigation for:

```text
Login
Forgot password
Remember me
Account settings
Logout
```

A normal login request should resemble:

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{"email":"analyst@northstar.internal","password":"...","rememberMe":false}
```

Successful login should set a secure session cookie. Failed login should return `401 Unauthorized` without confirming whether the account exists.

### Step 2 - Start Password Recovery

Submit the administrator address through the ordinary recovery form:

```http
POST /api/auth/recovery HTTP/1.1
Content-Type: application/json

{"email":"operations-admin@northstar.internal"}
```

The application should return a generic accepted response. It must not place the reset token in HTML, JavaScript, local storage, public metadata, or an unauthenticated progress endpoint.

### Step 3 - Analyze Token Behavior

Use the observable recovery behavior and controlled requests to determine how the vulnerable token is formed. The intended token is deterministic for the reset request and account state, rather than generated from a cryptographically secure random source.

The reset endpoint should behave naturally:

```http
POST /api/auth/reset HTTP/1.1
Content-Type: application/json

{"email":"operations-admin@northstar.internal","token":"<derived-token>","newPassword":"..."}
```

A wrong, expired, or already-used token returns `400 Bad Request` or `401 Unauthorized`. A valid token changes the password once and invalidates that token.

### Step 4 - Demonstrate Authentication Impact

Log in using the new password. The server must issue a new administrator session and reject the old session if the application policy invalidates sessions after password reset.

Access the restricted operations function through the authenticated session. Only that server-side authorization decision may return the flag.

## Session Requirements

- Session identifiers are generated server-side and stored in an HTTP-only cookie.
- The browser cannot mark itself authenticated by changing a frontend variable.
- Logout invalidates the server-side session.
- Resetting the administrator password invalidates prior administrator sessions.
- Unauthenticated restricted requests return `401 Unauthorized`.
- Standard-user restricted requests return `403 Forbidden`.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Authentication discovered | Login and recovery endpoints are reached |
| Recovery behavior analyzed | A real recovery request and response are recorded |
| Vulnerability identified | A token prediction is accepted by the reset handler |
| Authentication impact demonstrated | Password reset succeeds and creates a new session |
| Restricted functionality accessed | Administrator-only endpoint returns normally |
| Flag retrieved | Restricted endpoint returns the completion flag |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must restore the account database, invalidate all cookies and sessions, remove recovery tokens, restore the initial administrator password, and return evidence to `0/N`. The reset must be implemented on the backend and must not expose the flag.

## No Flag Leakage

The flag must not be present in login or recovery responses, frontend source or JavaScript bundles, challenge metadata, session cookies, reset-token error messages, or unauthenticated status endpoints. It becomes available only from the intended restricted operation after the administrator session is established.

## Instructor Notes

The vulnerable behavior should be implemented as an actual token-generation defect, for example a deterministic derivation from a server-side account value. Do not implement `if (token === "expected")` in the frontend or mark completion when a particular string is typed. The backend must validate the token, mutate the account record, invalidate sessions, and then authorize the restricted function.

## Remediation

**Vulnerability:** Predictable password-reset token and unsafe recovery workflow.

**Attack surface:** Password recovery, reset-token validation, login, and administrator session creation.

**Impact:** An unauthenticated attacker can reset a privileged account password and obtain authenticated access to restricted operations.

**Root cause:** The reset token is derived from predictable account data instead of generated with a cryptographically secure random source and bound to a short-lived server-side record.

**Remediation:** Generate high-entropy random, single-use, short-lived tokens; store only a hash of each token; rate-limit and monitor recovery attempts; return uniform recovery responses; invalidate existing sessions after a privileged reset; require appropriate re-authentication for sensitive account changes; and test token unpredictability and replay resistance.
