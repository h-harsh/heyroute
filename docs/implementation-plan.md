# HeyRoute implementation plan

## Outcome

Keep an existing Chrome profile and its sign-ins. Send an explicit list of
private domains through a local SOCKS5 proxy provided by SSH, while other
domains use direct connections on the current network, including its VPN.
This is browser routing, not a second system VPN or a device-wide kill switch.

## Scope and architecture

Use Manifest V3, plain ES modules, and Chrome's proxy API. No runtime packages,
server, account, telemetry, native host, content scripts, or build pipeline.
Permissions: `proxy` and `storage`. Local storage holds non-secret preferences;
session storage may hold a generic recent proxy error. No synchronized storage.

1. **Core:** validate preferences and generate an inline PAC script.
2. **Controller:** serialize changes; apply, verify, or clear profile proxy settings.
3. **Background worker:** internal messages, startup reconciliation, and badge status.
4. **Options:** port, exact domains, optional `*.example.com` rules, and direct-routing acknowledgement.
5. **Popup:** actual routing state, enable/disable, and settings link.
6. **External SSH:** keys and server configuration stay outside Chrome and this repo.

The proxy host is fixed to 127.0.0.1. Port defaults to 1080. No remote proxy
credentials are accepted. A rule matches its exact hostname; `*.example.com`
matches its subdomains only, never its apex or lookalike suffixes. Reject URLs,
paths, ports in domains, invalid labels, IP literals, single-label names, and
localhost/local names. Limit rules to 100 and total input to 8 KiB.

Matching requests return a single `SOCKS5 127.0.0.1:<port>` entry. Unmatched
requests return `DIRECT`. Mark the PAC mandatory. Do not add a direct fallback
to matching rules. Chrome performs SOCKS5 destination DNS at the proxy.

## Network and security boundaries

Default is disabled with an empty domain list. Save is not enable. Enabling
requires valid rules and explicit acknowledgement that other sites use direct
connections and that no separate required corporate HTTP/PAC proxy is present.
Refuse known non-direct proxy settings and settings controlled by another
extension or managed policy. Clearing HeyRoute's setting restores the lower
priority configuration rather than overwriting it with a fabricated default.
Apply only to `regular_only`; no incognito support in the MVP.

Do not call a routing badge connected: the extension does not probe the SSH
listener. An enabled rule can exist while SSH is offline. Disabling/uninstalling
the extension removes its protection. UDP/WebRTC, desktop tools, cached content,
and already-open sockets are outside the routing guarantee. Changes require
reloading affected pages and closing old interactive sessions.

Keep source generic. Personal acceptance evidence stays outside the public
repo. No credentials in Chrome storage, Git, fixtures, terminal output, or UI.
No remote code or auto-updating local extension. The proxy permission still has
profile-wide power; minimal permissions are not a security sandbox for routing.

## Implementation sequence

### 1. Project conventions and plan
- Create concise AGENTS, contribution rules, decisions, TODO, state, and verify recipe.
- Respect the existing author/committer; prohibit all attribution trailers.
- Maintain a clean public-source boundary. The owner selected MIT.

### 2. Routing and state
- Implement input normalization, exact matching, and deterministic PAC generation.
- Implement disabled/active/blocked/error states and serialized message handling.
- Check Chrome's effective setting after applying; roll back on persistence failure.
- Reconcile on installation/update and startup. Make OFF available after bad config.
- Cover invalid input, control conflicts, rollback, fail-closed lists, and restart.

### 3. Browser UI
- Build accessible options and compact popup with local-only settings.
- Render data using textContent. Provide clear empty, validation, conflict, and error copy.
- Expose the current settings and actual ownership without logging private domains.
- Include a deliberate local reset and an obvious disable control.

### 4. Isolated routing experiment
- Launch a disposable Chromium profile with the real extension installed.
- Use test-only HTTP and SOCKS fixtures bound to loopback and reserved .test names.
- Prove selected HTTP/HTTPS traffic and WebSocket upgrades cross SOCKS.
- Prove an unselected domain bypasses SOCKS and continues loading.
- Stop SOCKS: selected requests must fail with zero direct-origin hits.
- Re-enable SOCKS; prove recovery, persistence after restart, UI validation, and disable.
- Capture only generic UI screenshots under ignored test-results.

### 5. Personal-profile acceptance
- Verify SSH while the company VPN remains connected.
- Inventory private app hostnames outside this public repo.
- Check each origin's source-IP ACL and any localhost-only routing needs.
- Load the extension into the owner-selected Chrome profile; configure local settings.
- Observe private app pages, authentication where available, and interactive sockets.
- Observe ordinary browsing alongside company work access. Owner verifies company-only pages.
- Record only redacted results publicly; no cookies, profile files, hosts, or screenshots.

### 6. Review and delivery
- Run syntax, unit/controller, actual-browser, permission, and public-content checks.
- Package only extension files and the MIT notice; inspect the archive contents.
- Review diff and commit messages; obtain commit approval. Never push unasked.
- Suggested history: `chore: establish project conventions`,
  `docs: define routing architecture and verification`,
  `feat: add selective SSH proxy routing`.

## Definition of ready

Checks pass; browser experiments demonstrate routing and failure behavior;
source and artifacts are reviewed; remaining personal acceptance is explicitly
tracked. No claim that a real private application works without observing it.
Public publication and Chrome Web Store submission are separate.

## References

- [Chrome proxy API](https://developer.chrome.com/docs/extensions/reference/api/proxy)
- [Chrome setting lifecycle and precedence](https://developer.chrome.com/docs/extensions/reference/api/types)
- [Chromium proxy and SOCKS5 behavior](https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md)
- [Playwright extension testing](https://playwright.dev/docs/chrome-extensions)
