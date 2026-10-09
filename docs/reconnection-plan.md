# Automatic reconnection increment

Use a per-user macOS LaunchAgent running system OpenSSH directly. No shell
supervisor, credential storage, runtime dependency or browser permission change.
Python 3.9+ is needed only to manage the service; the installed connection runs
`/usr/bin/ssh` and survives moving/removing the development checkout.

1. Push the approved initial history to the empty public repository's main branch.
2. Add a generic macOS installer/status/start/stop/restart/uninstall tool.
3. Validate private alias/port, refuse occupied ports and unrelated configs, and
   preflight noninteractive SSH before enabling persistent retries.
4. Configure loopback-only SOCKS, normal host-key validation, SSH keepalives,
   bounded connection attempts, launchd KeepAlive/throttling and private logs.
5. Test lifecycle, failed authentication/bootstrap rollback, conflicts and unsafe input.
6. Replace only the known foreground trial with the managed connection. Observe
   stop/failure/restart, new process identity, SOCKS reachability and private-page recovery.
7. Observe safe real-app navigation and a disposable terminal echo while company VPN
   stays selected. No trades, production deploys or autonomous coding messages.
8. Review exact changed paths/message; obtain commit approval and then publish.

Logs and the generated plist remain in the user's Library, outside public Git.
Stop disables login startup until start; uninstall removes just the validated
connection config and keeps private logs. No sudo, VPN edits, public DNS or ACL
changes. Authentication/key-agent or corporate network failures still require
owner attention. Retries do not guarantee access when SSH is blocked.

Success means: actual managed SSH recovers after a terminated process and failed
attempt, selected Chrome traffic recovers, the listener remains loopback-only,
and observed interactive results are recorded with any remaining proof owed.
Login/reboot and physical sleep/wake are separate owner observations.

Reference: [Apple's user-agent guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
and the installed `launchd.plist(5)` / `launchctl(1)` / `ssh_config(5)` manuals.
