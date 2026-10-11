// Runs the decision of a gating mod on one Bash tool call, outside Claude Code.
//
// It reads the tool call as JSON on stdin, for example
//   {"tool_name":"Bash","tool_input":{"command":"git commit -m \"x\""},"cwd":"/tmp/repo"}
// and calls the same functions that the mod's hooks/register.ts calls. The
// command itself never runs. Needs Node 23.6 or newer (it runs .ts files).

import { execFileSync } from 'node:child_process'

import { checkCommit, extractMessage } from '../commit-ticket/hooks/lib.ts'
import { checkCommand } from '../guard-actions/hooks/lib.ts'

type ToolCall = { tool_name: string; tool_input: { command: string }; cwd: string }

const mod = process.argv[2]
const call: ToolCall = JSON.parse(await new Response(process.stdin).text())
const command = call.tool_input.command

function decide(): string | null {
  if (mod === 'guard-actions') {
    const verdict = checkCommand(command)
    return 'deny' in verdict ? verdict.deny : null
  }
  if (mod === 'commit-ticket') {
    if (extractMessage(command) === null) return null
    // Like register.ts: the branch comes from git, in the directory of the call.
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: call.cwd, encoding: 'utf8' })
    return checkCommit(command, branch.trim())
  }
  console.error(`run-hook: unknown mod "${mod}" (use commit-ticket or guard-actions)`)
  process.exit(2)
}

const reason = decide()
const width = Math.min(process.stdout.columns || 100, 100) - 2
const wrap = (text: string): string =>
  text.replace(new RegExp(`(.{1,${width}})(\\s+|$)`, 'g'), '  $1\n').trimEnd()

console.log(`\x1b[2m  Claude runs:\x1b[0m ${command}`)
if (reason === null) {
  console.log(`\x1b[1;32m  ${mod}: allowed\x1b[0m\n`)
} else {
  console.log(`\x1b[1;31m  ${mod}: blocked\x1b[0m`)
  console.log(`\x1b[33m${wrap(reason)}\x1b[0m\n`)
}
