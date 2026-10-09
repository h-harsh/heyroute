# Verification results — 2026-10-09

## Automated and source checks

| Check | Observed result |
| --- | --- |
| Unit/controller/content/commit tests | All 22 JavaScript tests passed |
| Connection manager tests | All 9 Python tests passed |
| Source syntax and permission boundary | Passed; proxy/storage only |
| Actual extension UI | Empty validation, save without enabling and effective ownership passed |
| Selected HTTP/HTTPS/WS/WSS | Passed through real loopback SOCKS fixture with destination hostnames |
| Unselected hosts and second profile | Passed; bypassed SOCKS |
| SOCKS outage | Selected HTTP/HTTPS failed with zero direct-origin hits; ordinary browsing continued |
| Recovery, restart, disable | Passed in disposable Chromium profile |
| UI exceptions | None observed in options flow |
| Package | 10 extension files and MIT notice; no local settings or fixture artifacts |

The restart test exposed missing restoration of an explicitly enabled PAC when
Chrome cleared its override. Worker-load reconciliation now restores it only
over a controllable direct/system base. A regression test covers this behavior;
policy, other-extension and existing web-proxy conflicts remain protected.

## Owner-profile trial

The owner loaded/configured/enabled the unpacked extension. Initial page checks
were on the personal VPN; the owner corrected that state and switched to the
company VPN. The network switch interrupted the foreground SSH connection.
Restarting the helper restored it. Fresh Chrome reloads then reached four
private applications: two authenticated pages, one dashboard and one login page.
The owner reports concurrent access working on the company VPN.
HAPI navigation also loaded its session list without changing session data.

Private hostnames, server mappings and detailed acceptance are recorded outside
this public repo. HTTPS validation was retained for real destinations. A specific
company-only page was not independently inspected. Real interactive sockets,
remaining app sign-in and existing-profile restart/outage/disable were proof
owed at initial delivery. The follow-up observations below resolve part of this debt.

## Review findings

No runtime packages, network fetches, remote code, page access, cookies, history,
native messaging, analytics or credential collection. Personal credentials stay
in the existing SSH/browser setup. The powerful proxy permission and DIRECT
unmatched-host behavior are documented. The initial helper was foreground-only;
the macOS follow-up adds optional supervised reconnection. No publication had
occurred at first delivery; initial history is now on the public main branch.

## Reconnection and interactive follow-up

- Public main contains the three approved initial commits; GitHub Verify passed.
- Installed the optional per-user LaunchAgent. Private plist/log permissions
  passed; actual system SSH listens only on loopback. No VPN edits were made.
- Terminated only its SSH child: launchd replaced it and private TLS HTTPS
  returned 200 in 0.6 seconds without a manual SSH restart.
- Separate temporary LaunchAgent/loopback-relay fixture observed two refused
  SSH attempts. Enabling the relay restored authenticated SSH and private HTTPS
  automatically. Fixture job, sockets and files were removed afterward.
- Explicit stop left the service unloaded and listener absent. A fresh selected
  page in the owner profile showed ERR_PROXY_CONNECTION_FAILED; GitHub loaded.
  Start restored the listener and private access. HAPI's terminal reconnected.
- A disposable terminal command returned markers before and after recovery over
  real WSS. The terminal was exited; no coding tasks or project edits were sent.
- Owner signed into the remaining private app. Authenticated overview/activity/
  preflight navigation, deployment-app project navigation and static dashboard
  filtering passed. No trading, deployment or production mutations were performed.
- Reran the complete isolated Chromium routing recipe from the actual checkout;
  HTTP/HTTPS/WS/WSS, outage/recovery, profile isolation, restart and disable passed.

The live handover reproduced a false occupied-port refusal caused by TCP TIME_WAIT.
A regression test failed before the fix. The probe now matches OpenSSH's
SO_REUSEADDR behavior; active listeners are still refused. All 31 tests pass.

Owner confirmed extension disable/re-enable, Chrome quit/reopen, private apps
without manually starting SSH, and a refreshed company-only page all passed.
These lifecycle checks are owner-observed. Physical login/reboot/sleep-wake remain unobserved.
No claim is made that every app operation or arbitrary desktop traffic was tested.
