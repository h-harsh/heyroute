# Security boundaries

HeyRoute is a small browser routing tool, not a system VPN, anonymity service,
network sandbox, or device-wide kill switch.

## Permissions and data

`proxy` can change routing across the installed Chrome profile. Our PAC limits
the intended behavior to saved hostnames, but that limit is code rather than a
Chrome permission boundary. `storage` saves preferences locally. It is not a
secret vault. Do not store credentials, private keys, or access tokens in it.

No host permissions, content scripts, cookies, history, tabs, request interception,
native messaging, remote code, analytics, external requests, or account service.
The extension pages have `connect-src 'none'`. A recent error records only
Chrome's generic error code and time in session storage, not URLs or details.

Domain input is validated before insertion into a PAC script. The proxy endpoint
is pinned to 127.0.0.1. Any local process able to connect to the SSH SOCKS listener
can use it while it is running; loopback binding does not authenticate that process.

## Routing limits

Selected new TCP URL requests receive only a SOCKS5 proxy entry; no DIRECT
fallback. PAC is mandatory. Destination DNS for SOCKS5 URL requests is resolved
at the proxy. This does not prevent all speculative DNS activity or prove an
absence of every possible DNS leak. UDP/WebRTC, desktop applications, caches,
service-worker responses, and existing sockets are outside this scope.

The rules are installed only for regular windows in the selected profile.
Incognito is deliberately unsupported. Disabling or removing the extension,
changing its rules, another extension, or managed policy can change protection.
The UI shows effective ownership rather than equating a saved ON preference
with active routing. It cannot prove SSH or an origin application is reachable.

Unmatched hosts use DIRECT while enabled. Existing system HTTP/PAC proxy logic
cannot be delegated to by this PAC. Known non-direct proxy configurations and
managed/competing controllers block enabling. A hidden system proxy in `system`
mode cannot be reliably inspected by this extension: acknowledgement is required.
Do not enable in a profile that requires a corporate HTTP/PAC proxy.

SSH authentication and host-key verification are OpenSSH's responsibility.
Keep keys outside the repository. Do not disable host-key verification or
TLS validation for real websites. The self-signed TLS bypass in automated tests
applies only to a disposable test browser, never to installation instructions.

## Reporting

Do not post credentials, personal hostnames, profile data, or network captures
in a public issue. Use GitHub's private vulnerability reporting when available.
For non-sensitive defects, provide a generic reproduction using reserved test
domains. The public-content check is a heuristic, not proof that a commit is safe.
