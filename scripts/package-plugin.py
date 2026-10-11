#!/usr/bin/env python3
"""Validate the portable source package and inspect the archive it produces."""
import json
import argparse
import re
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--plugin", default="smpt-mail-plugin", help="Plugin directory name under plugins/")
arguments = parser.parse_args()
PLUGIN = (ROOT / "plugins" / arguments.plugin).resolve()
assert PLUGIN.parent == (ROOT / "plugins").resolve()
manifest = json.loads((PLUGIN / "plugin.json").read_text())
compatibility = json.loads((PLUGIN / ".codex-plugin/plugin.json").read_text())
extension = manifest["extensions"]["com.openai"]
interface = extension["interface"]

assert manifest["name"] == PLUGIN.name == compatibility["name"]
assert manifest["version"] == compatibility["version"]
assert re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"])
assert interface == compatibility["interface"]
assert "apps" not in manifest and "apps" not in extension and "hooks" not in manifest
assert not (PLUGIN / ".app.json").exists()
assert not any(key in manifest for key in ("interface", "mcpServers", "skills"))
assert 0 < len(interface["displayName"]) <= 30
assert 0 < len(interface["shortDescription"]) <= 30
assert 0 < len(interface["longDescription"]) <= 4000
prompts = interface["defaultPrompt"]
assert 1 <= len(prompts) <= 3 and len(set(prompts)) == len(prompts)
assert all(0 < len(prompt) <= 128 and "\n" not in prompt for prompt in prompts)
for key in ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"):
    assert interface[key].startswith("https://mcp.softlian.com/")
for key, minimum in (("logo", 256), ("composerIcon", 48)):
    asset = (PLUGIN / interface[key]).resolve()
    assert asset.is_relative_to(PLUGIN.resolve())
    data = asset.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) <= 5 * 1024 * 1024
    width, height = struct.unpack(">II", data[16:24])
    assert width == height and minimum <= width <= 4096

mcp = json.loads((PLUGIN / "mcp.json").read_text())
assert len(mcp["mcpServers"]) == 1
server = mcp["mcpServers"][manifest["name"]]
assert server["type"] == "streamable-http" and server["url"] == "https://mcp.softlian.com/mail"
auth = server.get("extensions", {}).get("com.openai", {}).get("auth")
if auth is not None:
    assert auth["type"] == "oauth" and auth["client"]["mode"] == "dcr"
    assert "clientSecret" not in auth and "clientSecret" not in auth["client"]
    assert auth["resource"] == server["url"]
    assert auth["baseScopes"] == ["mail:read", "mail:send", "followups:write"]
    for key in ("authorizationServerBase", "authorizationUrl", "tokenUrl", "registrationUrl"):
        assert auth[key].startswith("https://mcp.softlian.com")
legacy = json.loads((PLUGIN / ".mcp.json").read_text())
assert legacy["mcpServers"][manifest["name"]]["url"] == server["url"]

cases = extension["review"]["test_cases"]
assert len(cases["positive"]) == 5 and len(cases["negative"]) == 3
sources = (ROOT / "src/index.ts").read_text() + (ROOT / "src/followup-tools.ts").read_text()
tool_names = set(re.findall(r'registerTool\("([^"\n]+)"', sources))
for case in cases["positive"]:
    assert all(isinstance(case[key], str) and case[key].strip()
               for key in ("prompt", "description", "tools_triggered", "expected_behavior"))
    assert set(case["tools_triggered"].split(", ")).issubset(tool_names)
for case in cases["negative"]:
    assert case["prompt"].strip() and case["description"].strip()
skill = PLUGIN / "skills/email-followups/SKILL.md"
assert "name: email-followups" in skill.read_text() and "description:" in skill.read_text()

files = sorted(path for path in PLUGIN.rglob("*") if path.is_file())
assert all(not path.is_symlink() for path in PLUGIN.rglob("*"))
assert all(path.suffix not in (".env", ".log") and path.name != ".dev.vars" for path in files)
output = ROOT / "work" / f"{PLUGIN.name}-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, f"{PLUGIN.name}/{path.relative_to(PLUGIN).as_posix()}")
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert len(archive.namelist()) == len(files)
    packaged = json.loads(archive.read(f"{PLUGIN.name}/plugin.json"))
    assert packaged == manifest
    for key in ("logo", "composerIcon"):
        assert f"{PLUGIN.name}/{interface[key].removeprefix('./')}" in archive.namelist()
print(f"Validated {len(files)} files, {len(tool_names)} tools, 5 positive and 3 negative cases.")
print(output)
print("Source archive only: deployment, a new demo, host tests, and portal checks remain.")
