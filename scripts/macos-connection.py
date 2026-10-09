#!/usr/bin/env python3
"""Manage one user-local OpenSSH LaunchAgent. No third-party packages."""

import argparse
import os
from pathlib import Path
import plistlib
import re
import socket
import subprocess
import sys
import tempfile

LABEL = "io.heyroute.ssh"


def validate_target(alias, port):
    if not isinstance(alias, str) or not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9._-]*", alias):
        raise ValueError("Use a hostname or alias from your existing SSH config.")
    if type(port) is not int or not 1 <= port <= 65535:
        raise ValueError("Use a port from 1 to 65535.")


def ssh_arguments(alias, port):
    validate_target(alias, port)
    return ["/usr/bin/ssh", "-N", "-T", "-D", f"127.0.0.1:{port}",
            "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
            "-o", "ConnectionAttempts=1", "-o", "ExitOnForwardFailure=yes",
            "-o", "ServerAliveInterval=10", "-o", "ServerAliveCountMax=3",
            "--", alias]


class ConnectionService:
    def __init__(self, home, uid, run=subprocess.run):
        self.home = Path(home)
        self.uid = uid
        self.run = run
        self.domain = f"gui/{uid}"
        self.target = f"{self.domain}/{LABEL}"
        self.file = self.home / "Library" / "LaunchAgents" / f"{LABEL}.plist"
        self.logs = self.home / "Library" / "Logs" / "HeyRoute"
        self.log = self.logs / "ssh.log"

    def command(self, args, check=True):
        result = self.run(args, capture_output=True, text=True, timeout=25)
        if check and result.returncode:
            raise RuntimeError(result.stderr.strip() or f"Command failed ({result.returncode}).")
        return result

    def loaded(self):
        return self.command(["/bin/launchctl", "print", self.target], check=False).returncode == 0

    def config(self, alias, port):
        return {"Label": LABEL, "ProgramArguments": ssh_arguments(alias, port),
                "KeepAlive": True, "ThrottleInterval": 10, "ExitTimeOut": 5,
                "ProcessType": "Background", "Umask": 0o077,
                "StandardErrorPath": str(self.log)}

    def saved(self):
        if self.file.is_symlink():
            raise ValueError("Refusing a symlink at the connection config path.")
        if not self.file.exists():
            raise ValueError("Connection is not installed.")
        info = self.file.stat()
        if info.st_uid != self.uid or info.st_mode & 0o077:
            raise ValueError("Connection config must be owned by you with mode 0600.")
        data = plistlib.loads(self.file.read_bytes())
        if not isinstance(data, dict):
            raise ValueError("Unexpected connection config; inspect it manually.")
        args = data.get("ProgramArguments", [])
        if not isinstance(args, list) or len(args) < 5:
            raise ValueError("Unexpected connection config; inspect it manually.")
        try:
            alias = args[-1]
            port = int(args[4].removeprefix("127.0.0.1:"))
            if data != self.config(alias, port):
                raise ValueError("Unexpected connection config; inspect it manually.")
        except (IndexError, TypeError, AttributeError):
            raise ValueError("Unexpected connection config; inspect it manually.") from None
        return alias, port

    def check_port_free(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            # Match OpenSSH's bind behavior: TIME_WAIT is not a live listener.
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("127.0.0.1", port))
            except OSError:
                raise ValueError("The local port is occupied. Stop the foreground connection or choose another port.") from None

    def prepare_logs(self):
        if self.logs.is_symlink() or self.log.is_symlink():
            raise ValueError("Refusing a symlink at the local log path.")
        self.logs.mkdir(parents=True, mode=0o700, exist_ok=True)
        if self.logs.stat().st_uid != self.uid:
            raise ValueError("Local log directory is not owned by you.")
        self.logs.chmod(0o700)
        fd = os.open(self.log, os.O_CREAT | os.O_APPEND | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
        try:
            if os.fstat(fd).st_uid != self.uid:
                raise ValueError("Local log file is not owned by you.")
            os.fchmod(fd, 0o600)
        finally:
            os.close(fd)

    def install(self, alias, port):
        validate_target(alias, port)
        if self.file.exists() or self.file.is_symlink():
            if self.saved() != (alias, port):
                raise ValueError("Another target is installed. Uninstall it before changing targets.")
            self.start()
            return
        if self.loaded():
            raise ValueError("A job with this label is already loaded without this config; inspect it manually.")
        self.check_port_free(port)
        # Establish noninteractive authentication before enabling indefinite retries.
        self.command(["/usr/bin/ssh", "-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10",
                      "-o", "ConnectionAttempts=1", "--", alias, "true"])
        self.prepare_logs()
        self.file.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
        payload = plistlib.dumps(self.config(alias, port), sort_keys=False)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.file.parent, delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            # Exclusive publication: never overwrite a config created concurrently.
            os.link(temporary, self.file)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        try:
            self.start()
        except Exception:
            # Roll back only this newly created configuration; keep local diagnostics.
            self.command(["/bin/launchctl", "disable", self.target], check=False)
            self.command(["/bin/launchctl", "bootout", self.target], check=False)
            self.file.unlink()
            raise

    def start(self):
        _, port = self.saved()
        if self.loaded():
            return
        self.check_port_free(port)
        self.prepare_logs()
        self.command(["/bin/launchctl", "enable", self.target])
        self.command(["/bin/launchctl", "bootstrap", self.domain, str(self.file)])

    def stop(self):
        self.saved()
        self.command(["/bin/launchctl", "disable", self.target])
        if self.loaded():
            self.command(["/bin/launchctl", "bootout", self.target])

    def restart(self):
        self.saved()
        if self.loaded():
            self.command(["/bin/launchctl", "kickstart", "-k", self.target])
        else:
            self.start()

    def uninstall(self):
        self.stop()
        self.file.unlink()

    def status(self):
        if not self.file.exists() and not self.file.is_symlink():
            return "Not installed."
        _, port = self.saved()
        if not self.loaded():
            return "Stopped. Use start to restore login startup and reconnection."
        # A listening port is not proof of the remote application's availability.
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5) as probe:
                probe.sendall(bytes([5, 1, 0]))
                listening = probe.recv(2) == bytes([5, 0])
        except OSError:
            listening = False
        return ("Job loaded; local SOCKS5 listener responding. Remote app access is not checked." if listening else
                "Job loaded; local SOCKS5 listener unavailable. Check the private SSH log and authentication.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    install = sub.add_parser("install", help="Install login startup and automatic SSH restart")
    install.add_argument("alias", help="Existing private SSH config alias")
    install.add_argument("--port", type=int, default=1080)
    for action in ["start", "stop", "restart", "status", "uninstall"]:
        sub.add_parser(action)
    args = parser.parse_args()
    if sys.platform != "darwin" or os.getuid() == 0:
        parser.error("Run this on macOS as your regular logged-in user, without sudo.")
    service = ConnectionService(Path.home(), os.getuid())
    try:
        if args.action == "install":
            service.install(args.alias, args.port)
        elif args.action == "status":
            print(service.status())
            return
        else:
            getattr(service, args.action)()
        print(f"Connection {args.action} complete. Run status and verify a private page.")
    except (ValueError, RuntimeError, OSError, subprocess.TimeoutExpired, plistlib.InvalidFileException) as error:
        parser.exit(1, f"HeyRoute: {error}\n")


if __name__ == "__main__":
    main()
