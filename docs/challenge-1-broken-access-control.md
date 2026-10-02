# Challenge 1 - Broken Access Control / IDOR

## Purpose

Northstar Logistics has exposed an employee portal for internal HR operations. The learner receives a legitimate low-privileged employee session, maps the portal API, and tests whether the server enforces authorization for each requested employee resource.

The intended finding is an insecure direct object reference (IDOR). The server authenticates the learner but incorrectly trusts the employee identifier supplied in the request. The learner must access a second employee's restricted record and use the information in that record to retrieve the challenge flag.

This challenge must use real HTTP requests handled by the portal backend. Completion must never depend on recognizing a typed command or a frontend-only string.

## Scope

| Item | Value |
| --- | --- |
| Company | Northstar Logistics |
| Target | `http://hr.internal.lab` |
| Lab network | `10.20.0.0/16` |
| Attacker account | `analyst@northstar.internal` |
| Authorized employee record | `1001` |
| Restricted employee record | `1002` |
| Primary vulnerability | Broken object-level authorization / IDOR |
| Flag | `RIVAN{idor_broken_access_control}` |

## Learning Objectives

- Distinguish authentication from authorization.
- Identify object identifiers in browser and API traffic.
- Test access-control boundaries with a controlled identifier change.
- Validate an IDOR finding using server responses and impact.
- Explain the server-side remediation for object-level authorization.

## Required Evidence

The lab should record meaningful backend events rather than a fixed command sequence:

1. A valid low-privileged login creates an authenticated session.
2. The learner accesses the employee directory or profile feature.
3. An employee object identifier is identified from a real request.
4. The learner tests a second identifier.
5. The server returns the unauthorized employee record to the learner.
6. The restricted record is used to retrieve the flag.
7. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/idor-broken-access-control` and select **Start lab** or **Reset lab**. A reset must clear the authenticated session, evidence, flag state, and server-side challenge progress.

The portal target should open in a separate browser tab. The target itself, not the challenge page, owns login state and HTTP behavior.

### Step 1 - Login Normally

Use the credentials supplied by the lab:

```text
Username: analyst@northstar.internal
Password: supplied-by-lab
```

Expected behavior:

- A successful login sets an HTTP-only session cookie.
- The dashboard identifies the learner as a standard employee.
- The learner cannot see administrator-only HR functions.

An invalid password should return a normal `401 Unauthorized` response and should not reveal whether another account exists.

### Step 2 - Explore the Employee Feature

Use the portal normally and inspect the request made by the employee directory or profile page. The expected resource shape is:

```http
GET /api/employees/1001 HTTP/1.1
Host: hr.internal.lab
Cookie: hr_session=...
```

The response for the learner's own record may contain ordinary profile data such as name, department, title, and employee number. The frontend should not reveal the restricted record or flag in its source.

### Step 3 - Test the Authorization Boundary

Repeat the request with the other object identifier:

```http
GET /api/employees/1002 HTTP/1.1
Host: hr.internal.lab
Cookie: hr_session=...
```

A correctly protected application would return `403 Forbidden` or an equivalent non-disclosing response. The intentionally vulnerable application returns employee `1002` because it checks that the learner is logged in but fails to verify that the requested object belongs to the learner.

The important evidence is the server response, not the fact that the identifier was edited.

### Step 4 - Retrieve and Submit the Flag

The unauthorized record contains a restricted internal resource reference. Follow that reference through the actual API to retrieve the flag, then submit the exact value in the challenge workspace.

The flag must not appear in the employee `1001` response, the challenge page source, public JavaScript or metadata, or progress endpoints before the restricted resource is accessed.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Login | Backend creates a valid authenticated session |
| Resource identified | Employee API is accessed successfully |
| Authorization tested | A second employee identifier is requested |
| Unauthorized resource accessed | Backend returns employee `1002` to the low-privileged session |
| IDOR confirmed | Restricted record or linked resource is accessed |
| Flag retrieved | Intended restricted API response contains the flag |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must invalidate all HR sessions and restore the initial employee records. It must also clear challenge evidence, submitted flag state, temporary API access tokens, and generated audit events used by the lab.

Reset must not require a browser reload to take effect.

## Realistic Error Behavior

- Missing session: `401 Unauthorized`.
- Unknown employee identifier: `404 Not Found`.
- Correctly protected unrelated record: `403 Forbidden`.
- Malformed identifier: `400 Bad Request`.
- The vulnerable `1002` request: normal successful JSON response, with no message announcing the flaw.

## Instructor Notes

The vulnerability is caused by missing server-side ownership enforcement. The vulnerable handler effectively loads the employee selected by the URL without comparing its owner to the authenticated principal. Do not implement completion as `if (id === "1002")`; the API should load records and make its response produce the evidence.

## Remediation

**Vulnerability:** Broken object-level authorization / IDOR.

**Attack surface:** Employee profile and linked internal-resource API endpoints.

**Impact:** Any authenticated employee can read another employee's private HR information and follow references intended for a different role.

**Root cause:** Authentication is checked, but authorization is not enforced for the requested object.

**Remediation:** Resolve the authenticated principal on the server and authorize every object access against that principal and its role. Prefer opaque identifiers where appropriate, but do not treat unpredictable identifiers as authorization. Add automated tests for cross-user access, return non-disclosing errors, and log denied access attempts.
