# Rahtk Mail — platform-provisioned mailboxes

Real mailboxes served by the **Postfix + Dovecot** instance that already runs on this
server, provisioned from the admin dashboard
(`/dashboard/domains` → **Professional Email**).

## Why not Plesk mail hosting?

Adding the merchant domains to Plesk generates conflicting nginx vhosts that break the
stores. So this feature is **fully additive** — it never touches Plesk-owned config:

| Layer | Plesk-owned (untouched) | Ours (isolated) |
| --- | --- | --- |
| Postfix domain map | `hash:/var/spool/postfix/plesk/virtual_domains` | `hash:/etc/postfix/rahtk_mail_domains` |
| Postfix mailbox map | `hash:/var/spool/postfix/plesk/vmailbox` | `hash:/etc/postfix/rahtk_vmailbox` |
| Postfix transport | `hash:/var/spool/postfix/plesk/transport` | `hash:/etc/postfix/rahtk_transport` |
| Dovecot passdb | `15-plesk-auth.conf` (auto-generated) | `conf.d/05-rahtk-mail.conf` |
| Dovecot password file | `/var/lib/plesk/mail/local/local.db` (Berkeley DB) | `/etc/dovecot/rahtk-mail.passwd` |

Plesk's `passdb` is tried first; Dovecot **falls through** to our `passdb rahtk` on
failure, so both keep working independently.

User lookup (`mail_path`) still comes from Plesk's `userdb sql`
(`/var/lib/plesk/mail/userdb/userdb.db`), and we add rows to its `mailbox_quota`
table — purely additive.

## Why the standard `virtual` transport?

Plesk's `plesk_virtual` transport reports `status=sent` **without actually delivering**
to mailboxes it doesn't own. Our domains are therefore routed to Postfix's built-in
`virtual` transport, which delivers into the Maildir directly.

`virtual_minimum_uid = 30` is required for that (Plesk mailboxes run as uid/gid 30).
This is safe because Plesk itself uses `plesk_virtual`, not `virtual`.

## Source of truth

    /etc/rahtk-mail/mailboxes.tsv

Three tab-separated columns:

    <email> <TAB> <active: 0|1> <TAB> <password hash (SHA512-CRYPT)>

Everything else (Postfix maps, `.db` files, Dovecot passwd-file, `main.cf` values) is
**derived**. `sync` rebuilds it all and is idempotent and self-healing.

`/etc/rahtk-mail/postfix-baseline.env` stores Plesk's original `main.cf` values so that
`sync` can restore them instead of duplicating our entries on every run.

## Durability

Plesk rewrites `main.cf` and Dovecot config on its own schedule. So
`rahtk-mail-sync.timer` re-applies everything **on boot (+120s) and every 10 minutes**:

    systemctl status  rahtk-mail-sync.timer
    systemctl start   rahtk-mail-sync.service   # force a re-apply now
    journalctl -u     rahtk-mail-sync.service   # see what it did

Verified: after Plesk resets `main.cf` *or* wipes our map lines entirely, `sync`
restores both Plesk's values and ours.

## Installation

    install -m 0755 rahtk-mail-admin /usr/local/sbin/rahtk-mail-admin
    install -m 0644 rahtk-mail-sync.service /etc/systemd/system/
    install -m 0644 rahtk-mail-sync.timer   /etc/systemd/system/
    install -m 0440 sudoers-rahtk-mail-admin /etc/sudoers.d/rahtk-mail-admin
    install -m 0644 05-rahtk-mail.conf      /etc/dovecot/conf.d/

    visudo -c                                            # validate sudoers
    systemctl daemon-reload
    systemctl enable --now rahtk-mail-sync.timer

The API user (`rahtk`) needs passwordless sudo for this one binary:

    rahtk ALL=(root) NOPASSWD: /usr/local/sbin/rahtk-mail-admin

## API

`DomainService` shells out via sudo (same pattern as `PleskService`):

    sudo -n /usr/local/sbin/rahtk-mail-admin <command> <args>

Admin endpoints (`DomainController`, SuperAdmin / SupportStaff-Admin only):

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/admin/domains/email-setups` | list (incl. `mxRecords`, `expectedMx`, `mxVerified`) |
| `POST` | `/api/v1/admin/domains/email-setups` | create a real mailbox; returns `generatedPassword` **once** |
| `PUT` | `/api/v1/admin/domains/email-setups/{id}/toggle` | enable / disable |
| `PUT` | `/api/v1/admin/domains/email-setups/{id}/password` | change password |
| `GET` | `/api/v1/admin/domains/email-setups/{id}/verify-mx` | re-check DNS MX |
| `DELETE` | `/api/v1/admin/domains/email-setups/{id}` | delete mailbox + Maildir |

MX verification uses DNS-over-HTTPS (`dns.google`), so no extra dependency is needed.

## Required at the domain registrar

For **inbound** mail from the outside to arrive, each domain needs:

    MX   10   mail.rahtk.sa.

`mail.rahtk.sa` → `50.6.196.176`. Until that record exists, `mxVerified` stays `false`
and only mail originating on this server is delivered.

## Manual operations

    sudo -n /usr/local/sbin/rahtk-mail-admin list
    sudo -n /usr/local/sbin/rahtk-mail-admin status  info@example.com
    sudo -n /usr/local/sbin/rahtk-mail-admin create  info@example.com 'StrongPass123'
    sudo -n /usr/local/sbin/rahtk-mail-admin password info@example.com 'NewPass123'
    sudo -n /usr/local/sbin/rahtk-mail-admin disable info@example.com
    sudo -n /usr/local/sbin/rahtk-mail-admin delete  info@example.com
    sudo -n /usr/local/sbin/rahtk-mail-admin sync

Diagnostics:

    doveadm auth test info@example.com 'StrongPass123'
    doveadm mailbox status -u info@example.com messages INBOX
    tail -f /var/log/maillog

## Conventions

- Maildir: `/var/qmail/mailnames/<domain>/<localpart>/Maildir` (owner `popuser`, uid/gid 30)
- Password hashes: `doveadm pw -s SHA512-CRYPT` (same scheme Plesk uses)
- Passwords accepted by the API: `[A-Za-z0-9!@#%*^&+=._-]{8,64}` — no spaces or quotes,
  so they survive the `sudo` argv without shell-quoting hazards.
- No secrets belong in this directory. `mailboxes.tsv` (which holds the hashes) lives
  only on the server and is never committed.
