# HeyRoute

Route selected websites through your own SSH SOCKS proxy, directly from Chrome.
Keep your existing browser profile, accounts, and company VPN connection.

HeyRoute has no accounts, paid proxy service, telemetry, or runtime dependencies.
It routes browser requests; it does not start SSH or create a second system VPN.

## How it works

```text
Selected hostname → localhost SOCKS5 → encrypted SSH → your server → website
Other hostname    → direct connection over your current network/VPN
```

Only `proxy` and `storage` permissions are requested. Your private hostnames and
proxy port stay in that profile's local extension storage. SSH keys remain in
your normal SSH setup. No cookies, passwords, page content, or browser history
are read. The proxy permission still gives profile-wide routing power; review
the [security boundaries](SECURITY.md) before enabling.

**Important:** while enabled, unmatched sites use DIRECT. They still follow the
OS's network/VPN routes, but a separate required system HTTP/PAC proxy is not
preserved. HeyRoute refuses known conflicts with other proxies and managed
policies, and requires acknowledgement of direct routing.

## Install locally

1. Clone this repository. No npm install is needed to use the extension.
2. Open the Chrome profile you want to use, then `chrome://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select `extension/`.
4. Pin HeyRoute. Open **Settings** and enter your private hostnames, one per line.
5. Set the local proxy port (default 1080), read the routing notice, and save.

Install only in the intended profile. There is no Chrome Sync configuration,
automatic update service, or incognito support. Updates are manual: review/pull
changes and click the extension's reload button. New installs start disabled.

## Start your connection

Use your own existing SSH configuration alias; do not put it or keys in this repo.

```sh
sh scripts/connect.sh private-server
```

Or run OpenSSH directly:

```sh
ssh -N -T -D 127.0.0.1:1080 \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 private-server
```

Keep the terminal open. Press Ctrl+C to stop. SSH verifies the server's host key
and authenticates normally. If a company VPN is connected, it must allow this
SSH connection; HeyRoute cannot bypass a network block.
Changing VPNs or networks can interrupt SSH. Rerun the command if the connection
closes; foreground mode does not reconnect automatically. For macOS login startup
and reconnection, use the optional managed connection below.

### Automatic reconnection on macOS

Optional: use Python 3.9+ to install a per-user LaunchAgent. Stop the foreground
SSH command first; the installer refuses an occupied port.

```sh
python3 scripts/macos-connection.py install private-server
python3 scripts/macos-connection.py status
```

macOS starts system OpenSSH at login and restarts it after disconnections, with
10-second launch throttling. Keepalives detect an unresponsive peer; reconnection
can take tens of seconds. Reload affected tabs after recovery. The installed job
uses your existing SSH config and requires noninteractive authentication. It
cannot unlock your key, approve a new host key, or bypass a blocked SSH connection.

```sh
python3 scripts/macos-connection.py restart
python3 scripts/macos-connection.py stop
python3 scripts/macos-connection.py start
python3 scripts/macos-connection.py uninstall
```

Stop also disables login startup until start. Uninstall removes the connection
config, retaining logs. The generated plist is under `~/Library/LaunchAgents/`;
private SSH diagnostics are in `~/Library/Logs/HeyRoute/ssh.log`. Both are outside
this repo, with user-only permissions. Logs can grow during sustained failures;
inspect them locally. Python and the checkout are not needed by the running job.
Disabling HeyRoute in Chrome does not stop SSH; use the stop command too.

Enable routing from HeyRoute. The **Routing enabled** label means Chrome has
installed the rules; it does not prove the SSH tunnel is connected.

## Rules and behavior

- `app.example.com` matches exactly that hostname.
- `*.example.com` matches subdomains, including nested subdomains, but not `example.com`.
- Selected HTTP/HTTPS and WS/WSS requests use SOCKS5. Chrome resolves selected
  destination hostnames at the proxy. Add separate API/socket hostnames if needed.
- Selected requests have no direct fallback. If the proxy stops, they fail;
  unmatched sites can continue using direct connections.
- Reload affected tabs after changes and close old interactive sessions.
- Disable routing to restore lower-priority proxy settings. Removing the
  extension also removes its routing protection. Clear saved rules in Settings.

An origin's firewall may reject SSH-proxied traffic even when it accepts a VPN
peer. For an app on the SSH server itself, the operator may need a local origin
route or a narrowly scoped trusted-source rule. Do not make the app public or
disable its authentication to solve this.

## Development

Use Node.js 22+ and Python 3.9+:

```sh
npm ci
npm run setup:hooks
npm test
npm run check
npx playwright install chromium
npm run test:browser
npm run package
```

The browser experiment uses an isolated profile, temporary test certificates,
and local fixtures. It never loads your existing profile or SSH keys. Playwright
is a development dependency only. Packaging requires the `zip` command and
includes only the extension files and MIT notice. See [verification](docs/verify.md),
[the implementation plan](docs/implementation-plan.md), and
[contribution conventions](CONTRIBUTING.md).

## Status and license

Early local experiment; not a Chrome Web Store release. Personal-profile and
real-site acceptance is tracked separately from automated fixture tests.
Source is available under the [MIT license](LICENSE).
