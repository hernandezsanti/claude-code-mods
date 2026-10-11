# claude-code-mods

Four small [Claude Code](https://code.claude.com/docs) mods. Two of them check the Bash commands Claude runs and block commits without a ticket and CI reruns. One tells Claude when a git worktree can be removed after it opens a pull request. One warns you when memory or disk is low.

![A terminal where commit-ticket blocks git commit -m "fix stuff" on the branch feature/ABC-12-login-redirect and allows "[ABC-12] Fix login redirect", and guard-actions blocks gh run rerun and allows gh run view.](docs/demo.gif)

The demo runs the real decision code of two mods with [`demo/run-hook.sh`](demo/run-hook.sh), so the commands are only checked and never run. Inside Claude Code the same code runs on every Bash command that Claude tries to run.

## Install

Claude Code loads every plugin in `~/.claude/skills/<name>` in the next session. Clone this repository, then link the mods you want from its root:

```sh
for m in commit-ticket guard-actions close-worktree live-resources; do
  ln -s "$PWD/$m" ~/.claude/skills/$m
done
```

To disable a mod, remove its link. To check a mod before you link it, run `claude plugin validate commit-ticket` and `claude plugin test commit-ticket`. The requirements are below.

## Why hooks and not instructions

You can write rules like "always put the ticket in the commit message" in `CLAUDE.md`, but Claude can forget them in a long session. `commit-ticket` and `guard-actions` check every Bash command before it runs, block the ones that break a rule, and tell Claude the reason and what to do instead. The logic of each mod is plain TypeScript in `hooks/lib.ts`, with unit tests next to it.

The rules are fixed in the code. There is no config file. If your ticket format or your CI rules are different, fork the repository and change `hooks/lib.ts`.

## Status and requirements

These are personal tools that I use every day. There are no releases and no stability promise, and the behavior can change.

- A Claude Code version that supports mods (plugins with function hooks). If `claude plugin test --help` works, your version has them. I use Claude Code 2.1.296.
- `live-resources` works only on macOS, because it reads memory with `vm_stat`.
- `guard-actions` and `close-worktree` are about the GitHub CLI (`gh`). `commit-ticket` and `close-worktree` need `git`.
- The demo script needs Node 23.6 or newer. The mods themselves do not need Node.

## commit-ticket

This mod reads the message of every `git commit` that Claude runs. When the branch name has a ticket, like `feature/ABC-5-something`, the message must start with a ticket in brackets, like `[ABC-5] Fix overflow`. If it does not, the mod blocks the commit and suggests the message with the ticket of the branch. It also blocks commits that only fix linting or formatting, like `[ABC-5] Fix linting`, because the result of an autofix (`eslint --fix`, `prettier --write`) should go inside the commit of the change that caused it.

The mod does not check branches without a ticket, merge commits, or messages that it cannot read with confidence, like `-F file` or `--amend --no-edit`. To skip the check once, add the comment `# ok-commit` at the end of the command.

## guard-actions

This mod blocks `gh run watch`, `gh run rerun` and `gh pr checks --watch`, because every rerun or wait for CI uses GitHub Actions minutes, and many organizations pay for them. Read-only commands like `gh run view` or `gh run list` are allowed, also inside a `sleep` loop. When Claude opens a second pull request in the same session, the mod shows a message that suggests one integration pull request instead.

To run a blocked command once, add the comment `# ok-actions` at the end of the command.

## close-worktree

After Claude runs `gh pr create` from a git worktree, this mod checks the worktree. If it has no uncommitted files and no unpushed commits, it tells Claude that the worktree can be removed and gives the exact `git worktree remove` command. If something is still pending, it tells Claude what is missing and asks it not to remove the worktree. The mod only gives advice. It never deletes anything.

Worktrees that nobody removes stay on disk, and many of them can fill it. The local and remote branches stay after the worktree is removed, so you can create it again with `git worktree add` if the review asks for changes.

## live-resources

In interactive sessions, this mod checks free memory and free disk space every 30 seconds. When memory goes under 2.5 GB or disk goes under 10 GB, it shows a status line and a short message, and the status line also counts the running test runners (jest, vitest, rspec, playwright, pytest and others). Under 1 GB of memory or 5 GB of disk, the status line is marked as critical. When everything is fine, it shows nothing.

It exists because test runners that run in parallel can use all the memory of a laptop and freeze it.

## Try a mod without Claude Code

`demo/run-hook.sh` builds the Bash tool call that Claude Code would pass to a mod, pipes it as JSON into [`demo/run-hook.ts`](demo/run-hook.ts), and prints the decision. It supports `commit-ticket` and `guard-actions`, and it never runs the command:

```sh
demo/run-hook.sh guard-actions 'gh run watch 123'
```

To record the GIF again, install [VHS](https://github.com/charmbracelet/vhs) and run `vhs docs/demo.tape` from the root of the repository. The tape works in a new temporary git repository.

## Development

The logic of each mod is in `hooks/lib.ts`, with its tests in `hooks/lib.test.ts`. The file `hooks/register.ts` only connects that logic to the hook events of Claude Code.

```sh
claude plugin validate <mod>   # checks the manifest and the hooks
claude plugin test <mod>       # runs the *.test.ts files of the mod
```

## License

MIT. See [LICENSE](LICENSE).
