# release-please-playground

Песочница для обкатки release-please в монорепе на bun workspaces перед переносом в `frontend-packages` команды CDD.

```sh
bun install
bun run build      # сначала сборка: addon импортирует собранный core
bun run typecheck
bun run test
```

- Дизайн: [docs/superpowers/specs/2026-10-03-release-please-playground-design.md](docs/superpowers/specs/2026-10-03-release-please-playground-design.md)
- Находки: [docs/findings.md](docs/findings.md)
