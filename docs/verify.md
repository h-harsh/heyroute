# Verification

## Automated gates

1. `npm test` → all routing, controller, public-content, and commit-convention
   tests pass; invalid input, conflicts, and failed settings persistence are covered.
2. `npm run check` → syntax passes; exactly proxy/storage permissions; no host
   access, runtime network calls, sync storage, or common personal artifacts.
3. `npm run test:browser` → actual extension loads into an isolated Chromium
   profile. HTTP, HTTPS, WS, WSS selected requests use the test SOCKS fixture;
   unmatched requests and another profile bypass it. Stop proxy: selected HTTP
   and HTTPS fail with zero direct origin hits; unmatched HTTP still succeeds.
   Recovery, restart persistence, popup disable, and zero UI exceptions pass.
4. `npm run package` and `unzip -l dist/heyroute-0.1.0.zip` → only manifest,
   extension JS, HTML, CSS, and MIT notice; no test data or local settings.
5. `git diff --check` → no whitespace errors. Review staged files and every
   proposed commit for personal information and attribution trailers.

Install development dependencies with `npm ci`; install the matching Chromium
with `npx playwright install chromium` if unavailable. These are test-only.

## Existing profile acceptance (not covered by fixtures)

Keep the company VPN connected. Start SSH using your local config; confirm the
loopback listener and the remote egress without recording values publicly.
Load `extension/` in the chosen profile. Enter personal hostnames only in local
settings and enable after reading the direct-routing notice.

For each private app: observe a page beyond the old network denial; verify
authentication normally, and an interactive feature/socket where applicable.
Confirm ordinary browsing remains usable. The owner observes a company-only
page at the same time. No company VPN changes are permitted for these checks.

Stop SSH and reload a selected page with caching disabled: a network error
must appear. Restart SSH and reload: it recovers. Disable HeyRoute: the original
network behavior returns. Restart Chrome: stored preferences and routing state
agree. Do not expose logged-in screenshots, cookies, hostnames, or credentials.

Report observed and unobserved checks separately. Automated routing success
does not establish corporate access or authenticated real-app behavior.
