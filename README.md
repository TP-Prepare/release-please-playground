# release-please-playground

Песочница для обкатки [release-please](https://github.com/googleapis/release-please) в монорепе на bun workspaces. Проверяем здесь то, что потом переносится в `frontend-packages` команды CDD.

## Что внутри

| Пакет | Путь | Стартовая версия |
|---|---|---|
| `@wely674378-team/core` | `packages/core` | 1.0.0 |
| `@wely674378-team/addon` | `packages/addon` | 0.1.0 |

`addon` зависит от `core` через `peerDependencies`, а в разработке берёт его из воркспейса — так же, как стейт-менеджер зависит от React.

```sh
bun install
bun run build      # сначала сборка: addon импортирует собранный core
bun run typecheck
bun run test
```

## Как устроен релиз

1. PR с conventional commits вливается в `main` merge-коммитом.
2. Workflow `Release` запускает release-please. Он смотрит коммиты с прошлого релиза и по затронутым путям решает, у каких пакетов поднять версию.
3. release-please открывает или обновляет Release PR: версии в `package.json`, `CHANGELOG.md` пакета, `.release-please-manifest.json`.
4. Мерж Release PR создаёт тег (`core-v1.1.0`) и GitHub Release, после чего job `publish` собирает и публикует в npm только выпущенные пакеты.

| Тип коммита | Что происходит |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` или `BREAKING CHANGE:` в теле | major |
| `test:`, `docs:`, `chore:`, `refactor:`, `style:` | релиза нет |

Настройки — в `release-please-config.json`, текущие версии — в `.release-please-manifest.json`.

## Что нужно настроить один раз

- GitHub: `Settings → Actions → General → Allow GitHub Actions to create and approve pull requests`. Без этого release-please не откроет Release PR.
- npm: у каждого пакета в `Settings → Trusted Publisher` — GitHub Actions, репозиторий `TP-Prepare/release-please-playground`, workflow `release.yml`.

## Сценарии проверки

- [ ] `fix:` в `packages/core` — patch у `core`; поднимает ли плагин `node-workspace` заодно `addon` из-за peer-диапазона.
- [ ] `feat:` в `packages/addon` — поднимается только `addon`.
- [ ] `test:` и `docs:` — Release PR не появляется.
- [ ] `feat!:` в `packages/core` — major у `core`; что происходит с peer-диапазоном `addon`.
- [ ] Мерж Release PR — тег, GitHub Release, версия в npm без ручных команд.
