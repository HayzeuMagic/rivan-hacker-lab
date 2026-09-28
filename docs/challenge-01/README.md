# Challenge 1 — Broken Access Control / IDOR

## What You Will Learn

In simple terms:

- An **ID** is a number used to request a specific record (example: employee `1001`).
- **Authentication** means “you are logged in.”
- **Authorization** means “you are allowed to view this specific record.”

This challenge demonstrates an IDOR issue:
- You log in as one user.
- You change an employee ID value.
- The server incorrectly returns another employee’s data.

## Before You Start

1. Make sure the lab is running on `http://localhost:3005`.
2. Keep the PowerShell window open where `npm run dev` is running.
3. Open your browser.

IMPORTANT:
- Do not close the running lab terminal.
- If you stop the server, pages and API calls will fail.

## Step 1 — Open the Challenge Page

1. Open your browser.
2. Click the address bar.
3. Enter:

```text
http://localhost:3005/challenges/idor-broken-access-control
```

4. Press Enter.

What You Should See:
- A dark page titled **Broken Access Control / IDOR**.
- A button labeled **Open target**.
- A button labeled **Reset lab**.
- An **Evidence** panel.

## Step 2 — Open the HR Target

1. On the challenge page, click **Open target**.
2. A new tab opens to the HR app.

Direct URL (same page):

```text
http://localhost:3005/targets/hr
```

What You Should See:
- Header text **Employee HR Portal**.
- Right panel section **Employee sign-in**.
- Input labels **Email address** and **Password**.
- Main section **Employee directory** with **Employee ID** input and **View profile** button.

## Step 3 — Sign In with the Lab Account

1. In **Email address**, enter:

```text
analyst@rivan.internal
```

2. In **Password**, enter:

```text
rivan-analyst
```

3. Click **Sign in**.

What You Should See:
- The response panel (dark JSON box) shows:

```json
{"status":200,"authenticated":true}
```

If credentials are wrong, you will see:

```json
{"status":401,"error":"Invalid email or password"}
```

## Step 4 — Request Your Own Record

1. In the **Employee ID** field, enter:

```text
1001
```

2. Click **View profile**.

What You Should See:
- JSON with `status: 200` and employee record `id: "1001"`.
- Example values include `Jordan Lee` and `Operations`.

## Step 5 — Trigger the IDOR Condition

1. Click inside **Employee ID**.
2. Replace `1001` with:

```text
1002
```

3. Click **View profile**.

What You Should See:
- JSON with `status: 200`.
- Record for employee `1002` (this is the vulnerability).
- Response includes:
	- `internalResource`: `/api/restricted-briefing`
	- `flag`: `CYBERLAB{idor_broken_access_control}`

## Step 6 — Submit the Flag in the Challenge Page

1. Return to the challenge tab (`/challenges/idor-broken-access-control`).
2. In the **Lab status** section, find the flag input (placeholder `CYBERLAB{...}`).
3. Enter:

```text
CYBERLAB{idor_broken_access_control}
```

4. Click **Submit**.

What You Should See:
- Status message: **Flag accepted. Challenge complete.**
- A green confirmation label: **Challenge complete**.

If the flag is wrong, you should see:

```text
Restricted resource access required.
```

or

```text
Submission rejected.
```

## Step 7 — Verify Completion

On the same challenge page, verify:

1. Evidence count reaches `5/5`.
2. Checkmarks appear for all objectives.
3. Challenge status confirms completion.

## How to Reset the Challenge

1. On the challenge page, click **Reset lab**.

What You Should See:
- Status message changes to:

```text
Session cleared. Start a fresh investigation.
```

- Evidence resets back to incomplete.

You can now solve it again from Step 2.

## Verified API Endpoints (Reference)

- Login: `POST /api/hr/api/login`
- Employee lookup: `GET /api/hr/api/employees?id=...`
- Progress: `GET /api/hr/api/progress`
- Submit: `POST /api/hr/submit`
- Reset: `POST /api/hr/reset`

## Troubleshooting

### Problem: Page does not load

Fix:
1. Verify dev server is running.
2. Re-run:

```text
$env:PORT="3005"; npm run dev
```

3. Refresh the page.

### Problem: `401` when viewing employee

Cause:
- You are not logged in yet.

Fix:
1. Go to **Employee sign-in**.
2. Use the exact credentials from Step 3.
3. Click **Sign in**.

### Problem: No flag input appears on challenge page

Cause:
- You have not triggered the restricted briefing condition yet.

Fix:
1. In HR target, request employee ID `1002`.
2. Return to challenge page.
3. Wait 1–2 seconds for evidence refresh.

### Problem: Challenge does not complete

Fix:
1. Confirm you submitted the exact flag:

```text
CYBERLAB{idor_broken_access_control}
```

2. If still stuck, click **Reset lab** and repeat steps carefully.

## Challenge Complete

You are finished when all are true:

- Lab status says **Flag accepted. Challenge complete.**
- Evidence panel shows all objectives completed.
- Completion indicator is visible on the challenge page.
