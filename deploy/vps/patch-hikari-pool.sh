#!/usr/bin/env bash
# Patch /opt/vibely/config/application-local.yaml — Hikari pool + disable show-sql.
set -euo pipefail

CONFIG="/opt/vibely/config/application-local.yaml"
[[ -f "$CONFIG" ]] || { echo "Missing $CONFIG" >&2; exit 1; }

cp -a "$CONFIG" "${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"

python3 <<'PY'
from pathlib import Path

path = Path("/opt/vibely/config/application-local.yaml")
lines = path.read_text(encoding="utf-8").splitlines()

if any("maximum-pool-size" in ln for ln in lines):
    print("hikari.maximum-pool-size already set")
else:
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        if line.strip() == "datasource:" and i > 0 and lines[i - 1].strip() == "spring:":
            j = i + 1
            while j < len(lines) and lines[j].startswith("    ") and not lines[j].strip().startswith("hikari:"):
                out.append(lines[j])
                j += 1
            out.append("    hikari:")
            out.append("      maximum-pool-size: 20")
            i = j - 1
        i += 1
    path.write_text("\n".join(out) + "\n", encoding="utf-8")
    print("Added datasource.hikari.maximum-pool-size")

lines = path.read_text(encoding="utf-8").splitlines()
if any("show-sql:" in ln for ln in lines):
    path.write_text(
        "\n".join(
            "    show-sql: false" if ln.strip().startswith("show-sql:") else ln
            for ln in lines
        )
        + "\n",
        encoding="utf-8",
    )
    print("Set jpa.show-sql=false")
elif not any(ln.strip() == "jpa:" for ln in lines):
    text = path.read_text(encoding="utf-8")
    marker = "  datasource:"
    if marker in text:
        text = text.replace(marker, "  jpa:\n    show-sql: false\n  datasource:", 1)
    else:
        text = "spring:\n  jpa:\n    show-sql: false\n" + text
    path.write_text(text, encoding="utf-8")
    print("Inserted jpa.show-sql=false")
PY

grep -A1 'hikari:' "$CONFIG" || true
grep 'show-sql' "$CONFIG" || true

systemctl restart vibely
sleep 3
systemctl is-active vibely
curl -s -o /dev/null -w "feed HTTP %{http_code} in %{time_total}s\n" \
  "http://127.0.0.1:8080/api/feed/for-you?size=2"
