# Challenge 01 — Broken Access Control / IDOR

## 1. Objective
Demonstrate that a logged-in low-privilege user can access another employee’s record by changing the object identifier (`id`) in an HR API request.

## 2. Target
`hr.internal.lab`

## 3. Application
Employee HR Portal used for internal directory/profile lookups.

## 4. Learning objectives
- HTTP request/response analysis
- Authentication vs authorization
- IDOR (Insecure Direct Object Reference)

## 5. Prerequisites
- Node.js and npm installed
- Project dependencies installed
- Local hosts mapping configured (for hostname simulation)

## 6. Starting the lab
```bash
npm install
npm run dev -- -p 3005
```

## 7. Verify the target
- Browser: open `http://localhost:3005/targets/hr`
- Optional hostname mode (after hosts file mapping): open `http://hr.internal.lab:3005/`

## 8. Challenge walkthrough
1) Login using the target page (`/targets/hr`):
- Email: `analyst@northstar.internal`
- Password: `northstar-analyst`

2) Request your own employee record:
- Method: `GET`
- Endpoint: `/api/hr/api/employees?id=1001`
- Headers: browser session cookie (`hr_session`) after login
- Expected: `200` + employee `1001`

3) Test object authorization by changing ID:
- Method: `GET`
- Endpoint: `/api/hr/api/employees?id=1002`
- Expected: `200` + unauthorized employee data (intentional vulnerability)

4) Retrieve restricted briefing:
- Method: `GET`
- Endpoint: `/api/hr/api/restricted-briefing`
- Expected: `200` + flag payload

5) Submit completion flag from challenge page:
- Method: `POST`
- Endpoint: `/api/hr/submit`
- Body:
```json
{"flag":"CYBERLAB{idor_broken_access_control}"}
```
- Expected: `200` and `{ "accepted": true }`

## 9. Why it works
The server checks if the user is authenticated but intentionally fails to enforce object-level authorization for `id=1002`.

## 10. Completion condition
- Unauthorized record is accessed
- Correct flag is submitted

## 11. How to verify completion
- Open challenge page: `/challenges/idor-broken-access-control`
- Evidence list shows all checks completed
- UI shows challenge complete state

## 12. Resetting the challenge
- Method: `POST`
- Endpoint: `/api/hr/reset`
- Expected: session and progress cleared

## 13. Troubleshooting
- Target does not resolve: use `/targets/hr` directly, or add host mapping.
- Connection refused: ensure dev server is running on port `3005`.
- API returns `500`: restart dev server and retry.
- Session not maintained: confirm cookie support is enabled.
- Challenge doesn’t complete: verify `/api/hr/api/restricted-briefing` succeeds before submit.
- Reset doesn’t work: call `/api/hr/reset` again and refresh page.
- Frontend cannot reach backend: verify same origin (`localhost:3005`).

## 14. Expected behavior
- `id=1001` works after login.
- `id=1002` incorrectly returns data (intentional IDOR).
- Reset restores fresh state.

## 15. Security lesson
Authentication alone is not authorization. Every object access must be validated against the authenticated principal.

## 16. Developer notes
- Backend route: `src/app/api/hr/[...path]/route.ts`
- Progress endpoint: `/api/hr/api/progress`
- Session cookie name: `hr_session`
