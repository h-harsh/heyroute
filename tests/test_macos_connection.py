import importlib.util
import os
from pathlib import Path
import plistlib
import socket
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("connection", Path(__file__).resolve().parents[1] / "scripts/macos-connection.py")
connection = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connection)


class FakeCommands:
    def __init__(self):
        self.active = False
        self.fail_auth = False
        self.fail_bootstrap = False
        self.calls = []

    def __call__(self, args, **options):
        self.calls.append(args)
        code = 0
        if args[0] == "/usr/bin/ssh":
            code = 255 if self.fail_auth else 0
        elif args[1] == "print":
            code = 0 if self.active else 113
        elif args[1] == "bootstrap":
            code = 5 if self.fail_bootstrap else 0
            self.active = not self.fail_bootstrap
        elif args[1] == "bootout":
            self.active = False
        return subprocess.CompletedProcess(args, code, "", "fixture failure" if code else "")


class ConnectionTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix="heyroute-connection-")
        self.addCleanup(self.scratch.cleanup)
        self.fake = FakeCommands()
        self.service = connection.ConnectionService(Path(self.scratch.name), os.getuid(), self.fake)
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            self.port = probe.getsockname()[1]

    def test_install_stop_restart_and_uninstall(self):
        self.service.install("private-server", self.port)
        self.assertTrue(self.fake.active)
        self.assertEqual(self.service.file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.service.log.stat().st_mode & 0o777, 0o600)
        config = plistlib.loads(self.service.file.read_bytes())
        self.assertTrue(config["KeepAlive"])
        self.assertIn(f"127.0.0.1:{self.port}", config["ProgramArguments"])
        self.assertIn("BatchMode=yes", config["ProgramArguments"])
        self.assertNotIn("StrictHostKeyChecking=no", config["ProgramArguments"])
        self.service.stop()
        self.assertFalse(self.fake.active)
        self.assertTrue(self.service.file.exists())
        self.service.restart()
        self.assertTrue(self.fake.active)
        self.service.uninstall()
        self.assertFalse(self.fake.active)
        self.assertFalse(self.service.file.exists())
        self.assertTrue(self.service.log.exists(), "uninstall retains private diagnostic logs")

    def test_authentication_failure_never_installs_persistent_retry(self):
        self.fake.fail_auth = True
        with self.assertRaises(RuntimeError):
            self.service.install("private-server", self.port)
        self.assertFalse(self.service.file.exists())
        self.assertFalse(self.fake.active)

    def test_bootstrap_failure_rolls_back_config(self):
        self.fake.fail_bootstrap = True
        with self.assertRaises(RuntimeError):
            self.service.install("private-server", self.port)
        self.assertFalse(self.service.file.exists())
        self.assertFalse(self.fake.active)

    def test_occupied_port_is_never_taken_over(self):
        with socket.socket() as occupied:
            occupied.bind(("127.0.0.1", 0))
            occupied.listen()
            with self.assertRaisesRegex(ValueError, "occupied"):
                self.service.install("private-server", occupied.getsockname()[1])
        self.assertFalse(self.service.file.exists())
        self.assertFalse(any(call[0] == "/usr/bin/ssh" for call in self.fake.calls))

    def test_recently_closed_connections_do_not_block_restart(self):
        with socket.socket() as listener:
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
            listener.listen()
            with socket.create_connection(("127.0.0.1", port)) as client:
                with listener.accept()[0] as peer:
                    peer.shutdown(socket.SHUT_WR)
                    self.assertEqual(client.recv(1), b"")
        # The closed socket can remain in TIME_WAIT, but no listener owns the port.
        self.service.check_port_free(port)

    def test_idempotent_install_and_target_change_refusal(self):
        self.service.install("private-server", self.port)
        before = self.service.file.read_bytes()
        self.service.install("private-server", self.port)
        with self.assertRaisesRegex(ValueError, "Another target"):
            self.service.install("other-server", self.port)
        self.assertEqual(self.service.file.read_bytes(), before)
        self.assertEqual(sum(call[1] == "bootstrap" for call in self.fake.calls), 1)

    def test_symlink_and_modified_config_refusal(self):
        self.service.file.parent.mkdir(parents=True)
        outside = Path(self.scratch.name) / "outside.plist"
        outside.write_text("leave intact")
        self.service.file.symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "symlink"):
            self.service.install("private-server", self.port)
        self.assertEqual(outside.read_text(), "leave intact")
        self.service.file.unlink()
        self.service.install("private-server", self.port)
        config = plistlib.loads(self.service.file.read_bytes())
        config["ProgramArguments"][0] = "/bin/other-program"
        self.service.file.write_bytes(plistlib.dumps(config))
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            self.service.stop()
        self.assertTrue(self.fake.active)

    def test_unsafe_inputs_never_invoke_commands(self):
        for alias, port in [("-oProxyCommand=anything", 1080), ("name; command", 1080),
                            ("user@example.com", 1080), ("private-server", 0), ("private-server", True)]:
            with self.assertRaises(ValueError):
                self.service.install(alias, port)
        self.assertEqual(self.fake.calls, [])

    def test_status_never_equates_loaded_job_with_connected_tunnel(self):
        self.assertEqual(self.service.status(), "Not installed.")
        self.service.install("private-server", self.port)
        self.assertIn("listener unavailable", self.service.status())
        self.service.stop()
        self.assertIn("Stopped", self.service.status())


if __name__ == "__main__":
    unittest.main()
