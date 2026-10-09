# HeyRoute

Route selected browser domains through a local SSH SOCKS5 proxy. Public source;
personal infrastructure and browser configuration must remain outside this repo.

## Commands
- `npm test` — unit and controller tests.
- `npm run check` — source, permissions, and public-content checks.
- `npm run test:browser` — isolated Chromium routing experiment.
- `npm run package` — generate a clean extension archive under `dist/`.

## Conventions
- Plain JavaScript, ES modules, Manifest V3; no runtime dependencies or build step.
- Commits: `type: imperative subject`, at most 72 characters. Add a body only for
  a non-obvious reason. One logical change per commit; stage explicit paths.
- Use the owner's configured Git author and committer. Never add co-author,
  generated-by, assistant attribution, or signed-off-by trailers.
- Work on `codex/` feature branches. Do not rewrite history or push without a request.
- Keep prose concise. Put architecture detail in `docs/implementation-plan.md`.
- Use example.com / reserved .test domains in docs, tests, and screenshots.
- Source is MIT licensed. Keep the license notice in redistribution artifacts.

## Workflow
Read `.ai/STATE.md`, `TODO.md`, and `docs/decisions.md` before continuing work.
Plan, implement, test, observe browser behavior, and review the diff.
Keep the plan and state honest about unobserved personal-profile checks.
Present exact commit messages and paths for approval before committing.
Record a finished increment in state; Git history is the change log.

## Verification
Follow `docs/verify.md`. A unit test is not proof of browser routing.
Use disposable browser profiles for automated experiments; never read or copy an
existing profile's cookies, password databases, or Preferences file.

## Never
- Commit personal domains, server IPs, SSH aliases, email addresses, credentials,
  keys, browser profiles, HAR files, or personal screenshots.
- Add host, tabs, cookies, history, scripting, webRequest, or nativeMessaging
  permissions without a reviewed need. The MVP needs only proxy and storage.
- Treat ON as proof of an SSH connection. It means the routing rule is installed.
- Include DIRECT as a fallback for selected domains.
- Override a required corporate proxy or managed browser policy.
- Alter or disconnect the company VPN for testing.
- Use `--no-verify`, blanket staging, force pushes, or change Git author identity.
