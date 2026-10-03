# Песочница release-please: дизайн

Дата: 2026-10-03

## Назначение

Отрепетировать релизный процесс для задачи [frontend#18](https://github.com/Cringe-Driven-Development-Team/frontend/issues/18) — монорепо `frontend-packages` команды CDD с релизами через release-please и публикацией в npm.

Репа нужна только ментору. Результат — список находок и конфиг, готовый к переносу в `frontend-packages`.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Инструмент релизов | release-please, manifest-режим |
| npm-скоуп | `@wely674378-team` (организация ментора в npm) |
| Публикация из CI | npm trusted publishing (OIDC), без токена в секретах |
| От чьего имени открывается Release PR | встроенный `GITHUB_TOKEN`; в организации `TP-Prepare` включается «Allow GitHub Actions to create and approve pull requests» |
| Release PR | один общий на все пакеты |

## Состав репы

```
package.json                    private, workspaces: packages/*
tsconfig.base.json              общий конфиг TypeScript
packages/core/                  @wely674378-team/core
packages/addon/                 @wely674378-team/addon
release-please-config.json
.release-please-manifest.json
.github/workflows/ci.yml        проверки на PR
.github/workflows/release.yml   Release PR и публикация
docs/superpowers/specs/         эта спека
docs/findings.md                находки по итогам прогона
README.md                       назначение, команды, ссылки на спеку и находки
```

### Пакеты

| Пакет | Версия на старте | Зависимости |
|---|---|---|
| `@wely674378-team/core` | 1.0.0 | нет |
| `@wely674378-team/addon` | 0.1.0 | `core` в `peerDependencies` (`^1.0.0`) и в `devDependencies` (`workspace:*`) |

- В каждом пакете одна функция, один тест (`bun test`), сборка tsdown в ESM с типами, скрипты `typecheck`, `test`, `build`.
- Версии инструментов закреплены, как в библиотеках CDD: bun 1.4.2, tsdown 0.23.0, TypeScript 7.0.2.
- Связка `addon → core` повторяет `zustand → react`.
- Стартовые версии выбраны намеренно: пакеты уже имеют версии, но тегов release-please в репе нет — как при переезде существующих библиотек. Одна версия выше 1.0, другая ниже: правила подъёма для них разные.

### Требования к `package.json` пакетов

- `repository.url` — `git+https://github.com/TP-Prepare/release-please-playground.git`, `repository.directory` — путь пакета. При несовпадении с адресом репы npm отклоняет публикацию через trusted publishing.
- `publishConfig.access: public`.
- `files: ["dist"]`.

## Релизный процесс

1. PR с conventional commits вливается в `main` merge-коммитом.
2. На push в `main` запускается `release.yml`, job `release-please` с правами `contents: write` и `pull-requests: write`.
3. release-please открывает или обновляет Release PR: версии в `package.json`, `CHANGELOG.md` каждого затронутого пакета, `.release-please-manifest.json`.
4. Мерж Release PR — следующий запуск того же workflow создаёт теги и GitHub Releases и отдаёт выходы `releases_created` и `paths_released`.
5. Job `publish` публикует в npm выпущенные пакеты.

### Конфиг release-please

```json
{
  "release-type": "node",
  "include-component-in-tag": true,
  "plugins": [
    { "type": "node-workspace", "updatePeerDependencies": true }
  ],
  "packages": {
    "packages/core": { "component": "core" },
    "packages/addon": { "component": "addon" }
  }
}
```

- Теги: `core-v1.0.1`, `addon-v0.2.0`.
- Плагин `node-workspace` при релизе `core` правит диапазон зависимости в `addon` и поднимает `addon` на patch.
- Манифест на старте: `packages/core` — `1.0.0`, `packages/addon` — `0.1.0`.
- Правила подъёма для версий ниже 1.0 — по умолчанию; фактическое поведение фиксируется в находках.

### Типы коммитов

| Тип | Результат |
|---|---|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` или `BREAKING CHANGE:` в теле | major |
| `test:`, `docs:`, `chore:`, `refactor:`, `style:` | релиза нет |

### CI

`ci.yml` на `pull_request`: `bun install --frozen-lockfile`, `bun run build`, `bun run typecheck`, `bun run test`. Сборка первой: `addon` импортирует собранный `core`.

На Release PR этот workflow не запускается: PR, созданный через `GITHUB_TOKEN`, не вызывает другие workflow. Ограничение принято; обязательных проверок на `main` нет.

## Публикация

### Job `publish`

- Условие: `releases_created == 'true'`.
- Матрица по `paths_released`: один запуск на выпущенный пакет, `fail-fast: false`.
- Права: `contents: read`, `id-token: write`. Секрета `NPM_TOKEN` нет.
- Шаги: `actions/checkout@v7`, `oven-sh/setup-bun@v2` (bun 1.4.2), `actions/setup-node@v7` (Node 24, `registry-url: https://registry.npmjs.org`), `bun install --frozen-lockfile`, `bun run build`, `npm publish` в каталоге пакета.
- Публикует `npm`, а не `bun`: `bun publish` не поддерживает trusted publishing. Нужны npm 11.5.1+ и Node 22.14+; актуальный Node 24 этому удовлетворяет.

### Разовая настройка

Выполняет ментор, по порядку:

1. В настройках организации `TP-Prepare`, затем репы включить «Allow GitHub Actions to create and approve pull requests».
2. Первая публикация руками: `npm login`, затем `npm publish` из `packages/core` (1.0.0) и `packages/addon` (0.1.0). Trusted publishing настраивается только для пакета, который уже есть в реестре.
3. Для каждого пакета на npmjs.com добавить Trusted Publisher: GitHub Actions, организация `TP-Prepare`, репозиторий `release-please-playground`, workflow `release.yml`.
4. После первой успешной публикации из CI включить в настройках каждого пакета «Require two-factor authentication and disallow tokens».

Шаги 1–3 выполняются после сценария 0 и до сценария 1: первая публикация идёт из `main` с уже влитым каркасом. Шаг 4 — между сценариями 6 и 7.

### Если публикация упала

Тег и GitHub Release к этому моменту созданы, release-please повторно их не создаёт. После устранения причины job перезапускается через «Re-run failed jobs».

## Известные особенности

Фиксируются в находках с вариантами решения; в песочнице не чинятся.

- **`bun.lock` отстаёт.** Release PR меняет версии в `package.json`, но не в `bun.lock`. `bun install --frozen-lockfile` при этом проходит; обычный `bun install` у разработчика обновит lockfile.
- **`workspace:*` в опубликованном пакете.** `npm publish` не переписывает протокол `workspace:`, строка остаётся в `devDependencies` опубликованного `addon`. На установку у потребителей не влияет.
- **Нет CI на Release PR.** См. раздел «CI».

## Сценарии проверки

Каждый сценарий — отдельный PR, влитый в `main` merge-коммитом.

| № | Что вливаем | Что проверяем |
|---|---|---|
| 0 | Каркас (`chore:`) | Workflow отрабатывает без тегов в репе, Release PR не появляется |
| 1 | `fix:` в `core` | `core` → 1.0.1; трогает ли плагин `addon`, если диапазон `^1.0.0` подходит; после мержа Release PR — тег, GitHub Release, версия в npm без токена |
| 2 | `feat:` в `addon` | Поднимается только `addon`; какая версия получается из 0.1.0 |
| 3 | `test:` и `docs:` в пакете | Release PR не появляется |
| 4 | `fix:` только в корневых файлах | Релиза пакетов нет |
| 5 | `feat!:` в `core` | `core` → 2.0.0; что происходит с peer-диапазоном и версией `addon` |
| 6 | `feat:` в `core` и `fix:` в `addon` одним PR | Один Release PR на оба пакета, оба публикуются |
| 7 | `fix:` после включения «disallow tokens» | Публикация из CI по-прежнему проходит |

Сценарий 0 — каркас из ветки `chore/scaffold`: он сверяется с этой спекой, расхождения правятся в той же ветке.

### Распределение ролей

- Исполнитель создаёт ветки и PR сценариев и вливает их в `main`.
- Release PR мержит ментор: этот мерж публикует в npm, опубликованную версию нельзя переиспользовать.
- После каждого релиза исполнитель проверяет теги, GitHub Release, лог workflow и `npm view`.

## Результат

`docs/findings.md`:

- таблица по сценариям: ожидание, факт, ссылки на PR и запуск workflow;
- итоговые `release-please-config.json` и `release.yml` для переноса;
- список разовых шагов настройки;
- открытые вопросы с вариантами решения: `bun.lock`, `workspace:*` в опубликованном `package.json`, правила для версий ниже 1.0, CI на Release PR.

### Критерий готовности

Все восемь сценариев прогнаны и записаны, хотя бы одна публикация прошла из CI без токена, конфиг готов к переносу.

## Не входит

- oxlint и oxfmt.
- Перенос истории коммитов из других репозиториев.
- README-инструкция для студентов.
- GitHub App и запасной путь публикации с токеном npm.
- Правки в frontend#18 — предлагаются отдельно по итогам прогона.
