# Decisions

## 2026-10-09 — initial-routing/small-public-project (provisional)
Use concise project-owned conventions, without vendoring a private workflow pack.
Public files contain generic examples; personal settings and acceptance stay local.

## 2026-10-09 — initial-routing/chrome-ssh (provisional)
Keep the existing browser profile. Use an inline PAC and a loopback-only SOCKS5
endpoint. SSH authentication remains outside the extension. A Firefox migration
and full virtual machine add friction without meeting the immediate need better.

## 2026-10-09 — initial-routing/direct-routing (provisional)
PAC cannot delegate unmatched hosts to the previous system PAC. Unmatched hosts
use DIRECT over the current network/VPN. Refuse known proxy conflicts and ask for
an acknowledgement before enabling. Never silently claim corporate proxies are preserved.

## 2026-10-09 — initial-routing/failure-scope (provisional)
Selected domains receive no DIRECT fallback; PAC is mandatory. This is a browser
request behavior, not a VPN kill switch. Disable, uninstall, UDP, and existing
connections remain outside the guarantee and must be documented.

## 2026-10-09 — initial-routing/mit-license (provisional)
The owner selected MIT for public reuse. Keep the copyright and license notice
with distributed source and extension archives.

## 2026-10-09 — D-automatic-reconnection (provisional)
Use the built-in macOS user LaunchAgent manager to supervise system OpenSSH.
KeepAlive restarts SSH; server keepalives detect dead connections. Bounded
connection attempts and launch throttling avoid a tight failure loop. A private
local plist holds the existing alias, not keys/passwords. Noninteractive SSH is
preflighted before installation; no extra browser permissions or packages.
Stop disables login startup; uninstall retains diagnostics. Authentication or
network blocks still require owner action. Physical sleep/wake and login startup
need separate observation. If changing this, preserve loopback binding, normal
host verification, explicit stop semantics and the public/private boundary.
