# Challenge 7 - SMB / Windows Network Attack

## Purpose

Kestrel Freight Group exposes a Windows Server 2022 file server (`FILESRV`) to the lab segment. It was configured to tolerate guest access during a share migration that never finished. The learner enumerates the server, mines the exposed shares, and uses recovered credentials to reach the restricted Dept-IT share.

All interaction runs through the in-page Kali terminal. SMB, RDP, and RPC are exposed; SMB is the attack surface.

## Scope

| Item | Value |
| --- | --- |
| Company | Kestrel Freight Group |
| Target | `10.20.50.20` (`FILESRV.internal.lab`) |
| Lab network | `10.20.0.0/16` |
| Guest-readable shares | `PUBLIC`, `Backups` |
| Restricted share | `Dept-IT` |
| Recovered credential | `bsmith` / `BSM-2024-Backup!` |
| Primary vulnerability | Guest-readable share disclosing service credentials |
| Flag | `RIVAN{smb_guest_share_loot}` |

## Learning Objectives

- Identify SMB services and Windows host fingerprinting with nmap.
- Enumerate shares anonymously with `smbclient -L -N` and `enum4linux`.
- Mine share contents for credential disclosures.
- Authenticate to a restricted share with recovered credentials.
- Explain share ACL hygiene and credential-rotation remediation.

## Required Evidence

1. The Windows target is scanned and SMB identified.
2. Exposed SMB shares are enumerated.
3. A guest-readable share is accessed.
4. Usable credentials are recovered from share data.
5. The restricted Dept-IT share is authenticated to.
6. `flag.txt` is retrieved from the restricted share.
7. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/smb-windows-network-attack` and select **Reset lab**. Reset restores share contents, sessions, evidence, and flag state.

### Step 1 - Scan and Enumerate Shares

```bash
nmap -sV 10.20.50.20
smbclient -L //10.20.50.20 -N
```

Anonymous listing returns `ADMIN$`, `C$`, `IPC$`, `print$`, `PUBLIC`, `Backups`, and `Dept-IT`. `enum4linux -a 10.20.50.20` or `netexec smb 10.20.50.20` produce the same share map plus user detail.

### Step 2 - Mine the Guest Shares

```bash
smbclient //10.20.50.20/PUBLIC -N
smb: \> ls
smb: \> get readme.txt
```

`PUBLIC\readme.txt` explains the migration and points at the Backups share. In `Backups`:

```bash
smbclient //10.20.50.20/Backups -N
smb: \> ls
smb: \> get svc-accounts.txt
```

`svc-accounts.txt` is a service-account handover naming `bsmith` / `BSM-2024-Backup!` with read/write scope on the Dept-IT share. `it-ops-notes.txt` corroborates it.

### Step 3 - Authenticate to the Restricted Share

Guest access to Dept-IT is correctly denied; the misconfiguration is the guest-readable Backups share. Use the recovered credential:

```bash
smbclient //10.20.50.20/Dept-IT -U bsmith%BSM-2024-Backup!
smb: \> ls
smb: \> get flag.txt
```

`flag.txt` contains `RIVAN{smb_guest_share_loot}`. Submit the exact value.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Target scanned | `nmap` against the host |
| Shares enumerated | `smbclient -L`, `enum4linux`, or `netexec`/`crackmapexec` |
| Guest share accessed | `smbclient //host/PUBLIC -N` or `//host/Backups -N` |
| Credentials recovered | `svc-accounts.txt` is read or downloaded |
| Restricted share reached | Authenticated `smbclient //host/Dept-IT -U bsmith%...` |
| Flag retrieved | `flag.txt` is read or downloaded from Dept-IT |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must restore the original share files, close all SMB sessions, and clear evidence and flag state. The `bsmith` password returns to its seeded value.

## Instructor Notes

The chain deliberately separates the misconfiguration (guest-readable Backups) from the objective (Dept-IT). Learners who try to brute-force Dept-IT or attack `ADMIN$` should find those paths correctly closed. The realistic artifact is the handover document: credentials in share data are one of the most common real-world SMB findings.

## Remediation

**Vulnerability:** Guest-accessible SMB share disclosing service-account credentials.

**Attack surface:** SMB shares on a Windows file server exposed to the lab segment.

**Impact:** Unauthenticated attackers recover credentials and read the restricted Dept-IT share.

**Root cause:** Guest access was enabled for a migration and never revoked, and a credential-bearing handover file was left in the share.

**Remediation:** Disable guest and anonymous SMB access, audit share ACLs for `Everyone`/`Guest` grants, purge credential material from shares and rotate exposed accounts, enforce SMB signing, and alert on anonymous share enumeration.
