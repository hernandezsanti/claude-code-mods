# Records docs/demo.gif. Run it from the root of the repository:
#
#   vhs docs/demo.tape
#
# Needs vhs (https://github.com/charmbracelet/vhs), Node 23.6 or newer and git.
# Everything happens in a new temporary git repository.

Output docs/demo.gif

Require node
Require git

Set Shell "bash"
Set FontSize 18
Set Width 1100
Set Height 660
Set Padding 24
Set TypingSpeed 22ms
Set Theme "Catppuccin Mocha"

Hide
Type `export PATH="$PWD/demo:$PATH" PS1='\[\e[1;36m\]$\[\e[0m\] ' && cd "$(mktemp -d)" && git init -q && git checkout -q -b feature/ABC-12-login-redirect && clear`
Enter
Sleep 500ms
Show

Type "git branch --show-current"
Enter
Sleep 1.2s

Type `run-hook.sh commit-ticket 'git commit -m "fix stuff"'`
Enter
Sleep 3s

Type `run-hook.sh commit-ticket 'git commit -m "[ABC-12] Fix login redirect"'`
Enter
Sleep 2s

Type `run-hook.sh guard-actions 'gh run rerun 4821 --failed'`
Enter
Sleep 3.5s

Type `run-hook.sh guard-actions 'gh run view 4821 --log-failed'`
Enter
Sleep 3s
