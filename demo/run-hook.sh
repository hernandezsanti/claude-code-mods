#!/usr/bin/env bash
# Usage: demo/run-hook.sh <commit-ticket|guard-actions> '<bash command>'
#
# Builds the Bash tool call that Claude Code would pass to the mod, pipes it as
# JSON into demo/run-hook.ts, and prints the decision of the mod. The command
# itself never runs.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "usage: $0 <commit-ticket|guard-actions> '<bash command>'" >&2
  exit 2
fi

here=$(cd "$(dirname "$0")" && pwd)

node -e 'process.stdout.write(JSON.stringify({
  tool_name: "Bash",
  tool_input: { command: process.argv[1] },
  cwd: process.argv[2],
}))' "$2" "$PWD" | node "$here/run-hook.ts" "$1"
