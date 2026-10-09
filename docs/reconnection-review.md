# Reconnection increment review

## What changed

An optional macOS user LaunchAgent now starts and supervises system SSH. The
manager installs, reports status, starts/stops/restarts and removes only its own
validated config. It refuses occupied ports and unrelated/symlinked configs;
preflights noninteractive authentication and rolls back failed installation.
SSH remains loopback-only with normal host verification, keepalives, bounded
connection attempts and launch throttling. No extension runtime files changed.

## Verification and tests

31 tests passed, including 9 manager tests for lifecycle, authentication/bootstrap
failure, active-port refusal, TIME_WAIT, unsafe input, idempotence and config guards.
Actual macOS SSH process replacement, repeated refused connections/recovery,
explicit stop/start and private TLS HTTPS passed. Real terminal WSS input/output
survived recovery. Authenticated safe app navigation and dashboard filtering
passed; isolated Chromium routing recipe was rerun and passed. Detailed results
and remaining owner/physical lifecycle observations are in verification-results.md.

## Edge cases, decisions and assumptions

Uses macOS launchd instead of a second supervisor or external package. Python
3.9+ manages the job; the running job uses only system OpenSSH and existing SSH
configuration. Persistent authentication/network failures need owner action.
Automatic recovery can take tens of seconds. Start/stop are separate from the
extension toggle. Other platforms keep foreground mode. Trading, deploys and
coding messages are excluded from connectivity acceptance.

The new provisional decision records launchd's supervision, security boundaries
and remaining physical observations. Alias, plist, logs and terminal screenshots
remain outside public Git. The existing MIT, direct-routing and fail-closed
decisions still apply. Initial main history is already published with green CI.

## Proposed commit

`feat: add managed SSH reconnection on macOS`

Exact staging paths:
- `scripts/macos-connection.py`, `tests/test_macos_connection.py`, `package.json`
- `scripts/check.mjs`, `scripts/public-check.mjs`, `.github/workflows/verify.yml`, `.gitignore`
- `README.md`, `SECURITY.md`, `docs/decisions.md`, `docs/verify.md`
- `docs/reconnection-plan.md`, `docs/reconnection-review.md`, `docs/verification-results.md`
- `TODO.md`, `.ai/STATE.md`

State records publication of initial history, new checks and owner/physical
proof owed. TODO removes completed reconnection and interactive acceptance,
retaining specific manual lifecycle checks and future distribution. On approval,
state records the local commit acceptance/publication status. Use existing owner
identity, no attribution trailers. Publish only with explicit approval.
