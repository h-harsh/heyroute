# Initial increment review

## What changed

Selected hostname requests use a loopback SSH SOCKS5 connection in one Chrome
profile. Other hosts use DIRECT over the current network/VPN. The existing
profile keeps its sign-ins. Defaults are disabled; save does not enable.

## Verification and tests

See [observed results](verification-results.md): 22 tests and actual Chromium
routing passed. Tests cover validation, exact/wildcard boundaries, conflicts,
rollback, restart reconciliation, serialized changes and attribution guards.
Real owner-profile page access passed after selecting the company VPN; the
remaining interactive and existing-profile lifecycle checks are proof owed.

## Edge cases, decisions and assumptions

Handles invalid rules, corrupt stored preferences, competing extensions/policy,
settings persistence failures and proxy outages. Selected domains have no direct
fallback while rules are installed. UDP/WebRTC, existing sockets, disabled or
uninstalled extension, and desktop apps are outside scope. Separate corporate
HTTP/PAC proxies are unsupported. ON indicates installed rules, not tunnel health.

Decisions record the small public workflow, Chrome/SSH architecture, explicit
DIRECT behavior, bounded failure protection and owner-selected MIT license.
The MVP uses an explicit owner-maintained host inventory and foreground SSH;
automatic discovery/reconnection is deferred. Personal infrastructure remains
outside public source.

## Proposed commits and exact staging paths

1. `chore: establish project conventions`
   - `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `.editorconfig`, `.gitattributes`, `.gitignore`, `LICENSE`
2. `docs: define routing architecture and verification`
   - `README.md`, `SECURITY.md`, `TODO.md`, `.ai/STATE.md`, `docs/decisions.md`,
     `docs/implementation-plan.md`, `docs/verify.md`, `docs/verification-results.md`, `docs/review.md`
3. `feat: add selective SSH proxy routing`
   - `extension/manifest.json`, `extension/core.js`, `extension/controller.js`, `extension/background.js`,
     `extension/ui.js`, `extension/options.html`, `extension/options.js`, `extension/popup.html`,
     `extension/popup.js`, `extension/ui.css`, `package.json`, `package-lock.json`,
     `scripts/check.mjs`, `scripts/check-commit.mjs`, `scripts/public-check.mjs`,
     `scripts/setup-hooks.mjs`, `scripts/connect.sh`, `scripts/package.mjs`,
     `tests/core.test.js`, `tests/controller.test.js`, `tests/public-check.test.js`,
     `tests/commit.test.js`, `tests/browser-smoke.mjs`, `.githooks/commit-msg`,
     `.githooks/pre-commit`, `.github/workflows/verify.yml`

Use the existing owner author/committer. No attribution trailers. No push.
State records readiness, test outcomes and remaining acceptance; TODO removes the
implemented task and carries lifecycle/interactive proof owed, commit approval,
optional reconnection and future distribution. On approval, state records the
commit outcome and TODO removes the completed commit-review task.
