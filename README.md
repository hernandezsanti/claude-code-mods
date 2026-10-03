# claude-mods

Mods personales de Claude Code (plugins de function hooks). Cada carpeta es un plugin con `.claude-plugin/plugin.json` y `hooks/`.

| Mod | Qué hace |
|---|---|
| `recursos-vivos` | Avisa solo cuando falta RAM (< 2,5 G) o disco (< 10 G); muestra también los test runners corriendo. |
| `guarda-actions` | Bloquea `gh run watch`, `gh run rerun`, `gh pr checks --watch` y el polling de CI con `sleep`; avisa al abrir el segundo PR de la sesión. Salida de emergencia: `# ok-actions` al final del comando. |
| `aviso-sesion` | Suena Glass cuando termina un turno de más de 20 s, y Ping si termina con una pregunta (solo macOS). |
| `cierra-worktree` | Tras `gh pr create` desde un worktree, dice si ya se puede cerrar (limpio y pusheado) o qué falta. Solo avisa, no borra. |
| `commit-ticket` | Bloquea commits sin `[TICKET]` cuando la rama lleva ticket (`feature/ABC-5-algo`), y los commits solo de linting o formato. Salida de emergencia: `# ok-commit`. |

## Instalación (todas las sesiones)

Claude Code carga cualquier plugin que esté en `~/.claude/skills/<nombre>` (como `<nombre>@skills-dir`), así que alcanza con un enlace simbólico por mod:

```sh
for m in recursos-vivos guarda-actions aviso-sesion cierra-worktree commit-ticket; do
  ln -s "$PWD/$m" ~/.claude/skills/$m
done
```

## Desarrollo

```sh
claude plugin validate <mod>   # manifest y módulo
claude plugin test <mod>       # los *.test.ts del mod
```

La lógica pura vive en `hooks/lib.ts` (con su `lib.test.ts`); `hooks/register.ts` solo conecta eventos. Para type-check, una vez cargado el mod: `tsc -p <mod>/.claude-plugin/types/tsconfig.json --noEmit`.
