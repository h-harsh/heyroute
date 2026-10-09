# Verification results — 2026-10-09

## Automated and source checks

| Check | Observed result |
| --- | --- |
| Unit/controller/content/commit tests | All 22 passed |
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
remaining app sign-in and existing-profile restart/outage/disable remain proof
owed. Fixture success does not establish those real-app behaviors.

## Review findings

No runtime packages, network fetches, remote code, page access, cookies, history,
native messaging, analytics or credential collection. Personal credentials stay
in the existing SSH/browser setup. The powerful proxy permission and DIRECT
unmatched-host behavior are documented. Local helper is foreground-only;
network changes can require a restart. No publication has occurred.
