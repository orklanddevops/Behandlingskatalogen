"""Exercise VM command dispatch without Docker, sudo, downloads, or real services."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


class VmCommandsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="polly-vm-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / "scripts").mkdir()
        shutil.copy(ROOT / "scripts/vm.sh", self.root / "scripts/vm.sh")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "calls.jsonl"
        self.env = dict(os.environ, PATH=str(self.bin) + ":" + os.environ["PATH"],
                        VM_TEST_LOG=str(self.log))
        fake = """#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
name = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ["VM_TEST_LOG"], "a") as log:
    log.write(json.dumps([name] + args) + "\\n")
if name == "git" and args[:1] == ["status"]:
    print(os.environ.get("VM_TEST_DIRTY", ""), end="")
if name == "docker" and "up" in args:
    sys.exit(int(os.environ.get("VM_TEST_UP_EXIT", "0")))
"""
        for command in ("docker", "git"):
            path = self.bin / command
            path.write_text(fake)
            path.chmod(0o755)

    def run_vm(self, action, *args):
        return subprocess.run(["bash", "scripts/vm.sh", action, *args],
                              cwd=self.root, env=self.env, text=True, capture_output=True)

    def calls(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_deploy_waits_and_preserves_credentials(self):
        result = self.run_vm("deploy")
        self.assertEqual(result.returncode, 0, result.stderr)
        config = self.root / ".env.vm"
        original = config.read_text()
        self.assertIn("VM_BIND_ADDRESS=127.0.0.1", original)
        self.assertEqual(len(original.splitlines()[0].split("=")[1]), 64)
        self.assertEqual(config.stat().st_mode & 0o777, 0o600)
        self.assertTrue(any(call[-6:] == ["up", "-d", "--build", "--wait",
                                          "--wait-timeout", "300"] for call in self.calls()))
        self.assertEqual(self.run_vm("deploy").returncode, 0)
        self.assertEqual(config.read_text(), original)

    def test_deploy_preserves_explicit_certificate(self):
        bundle = self.root / ".vm-ca.pem"
        bundle.write_text("approved public certificate fixture")
        result = self.run_vm("deploy")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(bundle.read_text(), "approved public certificate fixture")

    def test_certificate_import_requires_explicit_path(self):
        source = self.root / "approved-ca.pem"
        source.write_text("approved public certificate fixture")
        self.env["VM_CA_CERT_FILE"] = str(source)
        result = self.run_vm("deploy")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / ".vm-ca.pem").read_text(), source.read_text())

    def test_failed_health_check_fails_deploy(self):
        self.env["VM_TEST_UP_EXIT"] = "1"
        result = self.run_vm("deploy")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("Deployment ready", result.stdout)

    def test_update_refuses_tracked_edits(self):
        self.env["VM_TEST_DIRTY"] = " M readme.md\n"
        self.assertNotEqual(self.run_vm("update").returncode, 0)
        self.assertFalse(any("pull" in call for call in self.calls()))

    def test_update_fast_forwards_then_deploys(self):
        result = self.run_vm("update")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        pull = calls.index(["git", "pull", "--ff-only"])
        build = next(i for i, call in enumerate(calls) if "--build" in call)
        self.assertLess(pull, build)

    def test_stop_keeps_database_volume(self):
        self.assertEqual(self.run_vm("stop").returncode, 0)
        self.assertEqual(self.calls()[-1][-1], "down")
        self.assertFalse(any("--volumes" in call or "-v" in call for call in self.calls()))

    def test_logs_forward_service_argument(self):
        self.assertEqual(self.run_vm("logs", "backend").returncode, 0)
        self.assertEqual(self.calls()[-1][-5:], ["logs", "--follow", "--tail", "100", "backend"])

    def test_config_does_not_print_secrets(self):
        self.assertEqual(self.run_vm("config").returncode, 0)
        self.assertEqual(self.calls()[-1][-2:], ["config", "--quiet"])

    def test_invalid_action_does_not_create_credentials(self):
        self.assertEqual(self.run_vm("invalid").returncode, 2)
        self.assertFalse((self.root / ".env.vm").exists())


if __name__ == "__main__":
    unittest.main()
