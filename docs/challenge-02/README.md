# Challenge 2 — Authentication & Session Security

## What You Will Learn

This challenge teaches four key ideas:

1. **Authentication**: proving who you are (login).
2. **Session**: the server remembers login state using a cookie.
3. **Password recovery**: how reset flows should work.
4. **Vulnerability**: a predictable reset token can let an attacker reset an admin password.

In this lab, the reset token follows a predictable format:

```text
rivan-<employeeNumber>
```

For the admin account, that token is:

```text
rivan-2048
```

## Before You Start

1. Confirm lab is running on `http://localhost:3005`.
2. Keep the dev server terminal open.
3. Open a browser.

IMPORTANT:
- This guide uses exact UI labels from the current app.
- Enter values exactly as written.

## Step 1 — Open the Challenge Page

1. Open your browser.
2. Go to:

```text
http://localhost:3005/challenges/authentication-session-security
```

What You Should See:
- Page title **Authentication & Session Security**.
- Button **Open target**.
- Button **Reset lab**.
- Evidence panel.

## Step 2 — Open the Portal Target

1. Click **Open target**.

Direct URL (same page):

```text
http://localhost:3005/targets/portal
```

What You Should See:
- Header **Internal Operations Portal**.
- Section **Password recovery**.
- Section **Reset password**.
- Right panel **Portal sign-in**.
- Button **Open operations control room**.

## Step 3 — Trigger Password Recovery

1. In section **Password recovery**, click field **Recovery email**.
2. Enter:

```text
operations-admin@rivan.internal
```

3. Click **Request**.

What You Should See:
- JSON response panel contains:

```json
{"status":200,"accepted":true}
```

## Step 4 — Reset Admin Password with Predictable Token

1. In section **Reset password**, fill the fields exactly:

- **Email address**

```text
operations-admin@rivan.internal
```

- **Recovery token**

```text
rivan-2048
```

- **New password**

```text
rivan-admin-lab
```

2. Click **Set new password**.

What You Should See:
- JSON response panel contains:

```json
{"status":200,"passwordChanged":true}
```

If token is wrong, expected response is:

```json
{"status":400,"error":"Invalid or expired reset request"}
```

## Step 5 — Sign In as Operations Admin

1. In **Portal sign-in**, enter:

- **Email address**

```text
operations-admin@rivan.internal
```

- **Password**

```text
rivan-admin-lab
```

2. Click **Sign in**.

What You Should See:
- JSON response panel contains:

```json
{"status":200,"authenticated":true}
```

## Step 6 — Open Restricted Admin Function

1. Click **Open operations control room**.

What You Should See:
- JSON response contains:
	- `title`: `Operations control room`
	- `message`: `Privileged cybersecurity controls are available.`
	- `flag`: `CYBERLAB{session_security_failure}`

## Step 7 — Submit the Flag in the Challenge Page

1. Go back to challenge tab:

```text
http://localhost:3005/challenges/authentication-session-security
```

2. In the flag field (placeholder `CYBERLAB{...}`), enter:

```text
CYBERLAB{session_security_failure}
```

3. Click **Submit**.

What You Should See:
- Status message:

```text
Flag accepted. Challenge complete.
```

## Step 8 — Verify Completion

Confirm all of these are true:

1. Evidence panel reaches `4/4`.
2. `Flag submitted` objective is checked.
3. Refreshing the page keeps completion status.

## How to Reset the Challenge

1. On the challenge page, click **Reset lab**.

What You Should See:
- Status message:

```text
Lab reset. Start a fresh authentication investigation.
```

- Evidence resets to incomplete.

After reset, the admin password returns to:

```text
rivan-operations
```

## Verified API Endpoints (Reference)

- Login: `POST /api/portal/api/auth/login`
- Recovery: `POST /api/portal/api/auth/recovery`
- Reset password: `POST /api/portal/api/auth/reset`
- Admin page data: `GET /api/portal/api/admin`
- Progress: `GET /api/portal/api/progress`
- Submit: `POST /api/portal/submit`
- Reset challenge: `POST /api/portal/reset`

## Troubleshooting

### Problem: Login fails with `Invalid email or password`

Fix:
1. Re-check spelling.
2. Ensure you reset password first.
3. Use exactly:

```text
operations-admin@rivan.internal
rivan-admin-lab
```

### Problem: Reset fails with `Invalid or expired reset request`

Fix:
1. Run recovery step again (click **Request**).
2. Use token exactly:

```text
rivan-2048
```

3. Click **Set new password** again.

### Problem: `Open operations control room` does not show flag

Cause:
- You are not signed in as admin session.

Fix:
1. Sign in with admin credentials from Step 5.
2. Click **Open operations control room** again.

### Problem: Challenge does not mark complete

Fix:
1. Verify submitted flag is exactly:

```text
CYBERLAB{session_security_failure}
```

2. If still not complete, click **Reset lab** and redo Steps 3–7.

## Challenge Complete

You are done when:

- Lab status says **Flag accepted. Challenge complete.**
- Evidence shows all four checks complete.
- Refresh keeps completion state.
