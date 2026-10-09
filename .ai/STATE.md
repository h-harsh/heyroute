# STATE — HeyRoute — codex/initial-routing — 2026-10-09

## Now
First increment ready — remaining personal acceptance is tracked below.
Owner approved the three local commits in docs/review.md. No push authorized.

## Just finished
- Implemented the MV3 extension, local-only settings, loopback SOCKS5 PAC and SSH helper.
- Added MIT licensing, public-source conventions, attribution guards and CI checks.
- Passed 22 tests, source/permission checks and isolated Chromium HTTP/HTTPS/WS/WSS routing.
- Observed proxy outage without direct fallback, recovery, profile isolation, restart and disable in fixtures.
- Fixed restart restoration and covered it with a controller regression test.
- Owner loaded/enabled the extension. Four real private apps freshly loaded after selecting the company VPN;
  two retained authenticated access. Owner reports concurrent access working.
- Network switching interrupted SSH; restarting the foreground helper restored routing.
- Reviewed the extension archive: 10 runtime files plus the MIT notice, without local settings.
- HAPI session navigation loaded on the company VPN; interactive writes were not exercised.

## Proof owed
Real-app interactive/socket behavior and remaining app authentication. Existing-profile
tunnel stop/recovery, disable and restart remain unobserved; fixtures cover them.
A specific company-only page was not independently inspected. No personal acceptance
details, screenshots, browser data, server aliases or domains belong in this repo.

## Next up
Collect the remaining owner-profile observations in TODO.md. Consider optional
SSH reconnection/autostart after owner review. Never push without a request.
