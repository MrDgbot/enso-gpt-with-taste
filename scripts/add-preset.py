#!/usr/bin/env python3
"""Add or update a custom EnsoCode preset layered on GPT with Taste, with your MCP servers.

  python3 scripts/add-preset.py                         all MCP servers, name "Taste"
  python3 scripts/add-preset.py --mcp semble --role-from PPP

Quit EnsoCode first: it rewrites settings.json from memory while running.
"""
import argparse, json, shutil, subprocess, sys, time, uuid
from pathlib import Path

PLUGIN_PRESET = "plugin:mrdgbot.gpttaste:taste"
DEFAULT_SETTINGS = Path.home() / "Library/Application Support/enso-code/settings.json"

p = argparse.ArgumentParser()
p.add_argument("--name", default="Taste")
p.add_argument("--mcp", action="append", help="MCP server name; repeat. Default: every configured server")
p.add_argument("--role-from", help="copy the custom role (systemPromptId) of this preset")
p.add_argument("--settings", type=Path, default=DEFAULT_SETTINGS)
a = p.parse_args()

procs = subprocess.run(["ps", "-axo", "comm"], capture_output=True, text=True, check=True).stdout
if "EnsoCode.app/Contents/MacOS/EnsoCode" in procs:
    sys.exit("EnsoCode is running. Quit it first, then rerun.")

data = json.loads(a.settings.read_text())
state = data["enso-settings"]["state"]
servers = {m["name"]: m["id"] for m in state.get("mcpServers", [])}
names = a.mcp or list(servers)
missing = [n for n in names if n not in servers]
if missing:
    sys.exit(f"MCP servers not found: {missing}. Available: {list(servers)}")

preset = next((x for x in state["presets"] if x["name"] == a.name), None)
created = preset is None
if created:
    preset = {"name": a.name, "id": str(uuid.uuid4())}
    state["presets"].append(preset)
preset.update({"skillIds": [], "mcpServerIds": [servers[n] for n in names], "pluginPresetId": PLUGIN_PRESET})
if a.role_from:
    src = next((x for x in state["presets"] if x["name"] == a.role_from), None)
    if not src or not src.get("systemPromptId"):
        sys.exit(f"preset {a.role_from!r} has no custom role")
    preset["systemPromptId"] = src["systemPromptId"]

shutil.copy2(a.settings, a.settings.with_name(f"settings.json.bak-taste-{time.strftime('%Y%m%d%H%M%S')}"))
a.settings.write_text(json.dumps(data, ensure_ascii=False, indent=2))
print(("added" if created else "updated"), json.dumps(preset, ensure_ascii=False))
