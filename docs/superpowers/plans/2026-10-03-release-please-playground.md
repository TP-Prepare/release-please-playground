# Песочница release-please: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Прогнать восемь сценариев релиза в монорепе на bun workspaces и получить список находок и конфиг release-please для переноса в `frontend-packages`.

**Architecture:** Два тестовых пакета (`core`, `addon` с peer-зависимостью от `core`), release-please в manifest-режиме с плагином `node-workspace`, один workflow `release.yml`: Release PR, после его мержа — публикация выпущенных пакетов через npm trusted publishing. Каждый сценарий — отдельный PR в `main`; результаты копятся в `docs/findings.md`.

**Tech Stack:** bun 1.4.2, TypeScript 7.0.2, tsdown 0.23.0, `googleapis/release-please-action@v5`, GitHub Actions, npm trusted publishing (OIDC).

**Spec:** `docs/superpowers/specs/2026-10-03-release-please-playground-design.md`

## Global Constraints

- Репа: `TP-Prepare/release-please-playground`, локально `F:\Github\TP-Prepare\release-please-playground`.
- Пакеты: `@wely674378-team/core` (старт 1.0.0), `@wely674378-team/addon` (старт 0.1.0).
- Версии инструментов закреплены: bun 1.4.2, tsdown 0.23.0, TypeScript 7.0.2.
- Коммиты: `<тип>: <что сделано>` по-русски со строчной буквы; последняя строка — `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- PR сценариев вливаются только merge-коммитом: `gh pr merge <N> --merge --delete-branch`.
- Описание каждого PR заканчивается строкой `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Release PR мержит только пользователь.** Исполнитель его не мержит, не закрывает и не правит.
- **Настройки организации GitHub и пакетов в npm меняет только пользователь.** Исполнитель их только читает.
- Секрета `NPM_TOKEN` в репе нет и не появляется.
- Каждая опубликованная версия необратима: перед просьбой смержить Release PR исполнитель показывает пользователю, какие версии уйдут в npm.
- Версии «ожидаем» в сценариях — гипотезы. Расхождение с фактом — это находка, а не ошибка: записать и идти дальше. Останавливаться нужно, только если упал workflow.

## Review Focus

Что спека подразумевает, но ни один сценарий сам не ловит:

1. **Release PR не создаётся из-за выключенной настройки Actions** — ожидается понятная проверка до сценария 1, а не красный workflow. Проверка — Task 3, Step 4.
2. **Job `publish` падает на `fromJSON('')`, когда релиза нет** — ожидается, что job пропущен, а workflow зелёный. Проверка — Task 2, Step 7.
3. **Выходы `releases_created` / `paths_released` у action v5 называются иначе** — тогда `publish` молча не запустится. Проверка — Task 4, Step 6.
4. **npm на раннере старше 11.5.1** — публикация упадёт с ошибкой авторизации. В job добавляется шаг `npm --version`, значение сверяется в Task 4, Step 6.
5. **Ручная первая публикация `addon` с `workspace:*`** — ожидается, что пакет опубликуется; что попало в реестр — Task 3, Step 4.

## Общая процедура сценария

Задачи 4–9 ссылаются на эти шаги по буквам.

- **A. Ветка:** `git switch main && git pull --ff-only && git switch -c <ветка>`
- **B. Локальная проверка:** `bun install --frozen-lockfile && bun run build && bun run typecheck && bun run test` — всё с кодом 0.
- **C. PR и мерж:** `git push -u origin <ветка>`, `gh pr create --base main` с заголовком из коммита и описанием в одну-две строки, `gh pr checks --watch` (зелёный `CI / check`), `gh pr merge --merge --delete-branch`.
- **D. Release workflow:** `git fetch origin`, затем `gh run list --workflow release.yml --branch main --limit 1 --json databaseId,headSha`. `headSha` должен совпасть с `git rev-parse origin/main`; если нет — запуск ещё не создан, повторить через несколько секунд. Затем `gh run watch <databaseId> --exit-status` — код 0.
- **E. Release PR:** `gh pr list --label "autorelease: pending" --json number,title,url`, затем `gh pr diff <N>` — выписать новые версии, изменённые файлы, текст changelog.
- **F. Передача пользователю:** показать номер Release PR и версии, которые уйдут в npm; **ждать, пока пользователь смержит**.
- **G. Проверка релиза:** шаг D для нового запуска; `git fetch --tags && git tag --list`; `gh release list --limit 5`; `npm view <пакет> version`; `npm view <пакет> --json | jq '.dist.attestations'` (не `null`). Если job `publish` упал: тег и Release уже созданы, поэтому чинить причину и перезапускать `gh run rerun <id> --failed`, новый релиз не делать.
- **H. Запись:** `git switch docs/findings`, дописать строку сценария в `docs/findings.md`, `git commit`, вернуться на `main`.

---

### Task 1: Спека и план в `main`

**Files:**
- Уже есть в ветке `docs/spec`: `docs/superpowers/specs/2026-10-03-release-please-playground-design.md`, `docs/superpowers/plans/2026-10-03-release-please-playground.md`

- [ ] **Step 1: Закоммитить план в `docs/spec`**

```bash
git switch docs/spec
git add docs/superpowers/plans/2026-10-03-release-please-playground.md
git commit -m "docs: план реализации песочницы release-please"
```

- [ ] **Step 2: PR и мерж**

`git push -u origin docs/spec`, `gh pr create --base main` с заголовком «docs: спека и план песочницы release-please», `gh pr merge --merge --delete-branch`.
Expected: PR влит; workflow в репе ещё нет, запусков Actions нет.

---

### Task 2: Сценарий 0 — каркас

**Files:**
- Modify: `README.md` (сократить до минимального)
- Modify: `.github/workflows/release.yml` (шаг `npm --version` перед `npm publish`)
- Остальные файлы ветки `chore/scaffold` — сверить со спекой, менять только при расхождении.

**Interfaces:**
- Produces: `greet(name: string): string` в `packages/core/src/index.ts`; `greetAll(names: string[]): string[]` в `packages/addon/src/index.ts`; тесты в `packages/*/test/index.test.ts`; корневые скрипты `build`, `typecheck`, `test`.

- [ ] **Step 1: Подтянуть `main` в ветку**

```bash
git switch chore/scaffold && git merge main
```

- [ ] **Step 2: Сверить каркас со спекой**

Пройти по разделам спеки «Пакеты», «Требования к `package.json` пакетов», «Конфиг release-please», «CI», «Job `publish`» и сравнить с файлами ветки. Расхождения исправить, совпадения не трогать.

- [ ] **Step 3: Сократить `README.md`**

````markdown
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
````

- [ ] **Step 4: Добавить в job `publish` шаг `- run: npm --version` перед `npm publish`**

- [ ] **Step 5: Локальная проверка**

Шаг B общей процедуры, затем `actionlint .github/workflows/*.yml`.
Expected: всё с кодом 0.

- [ ] **Step 6: Коммит, PR, мерж**

```bash
git add -A
git commit -m "chore: каркас приведён к спеке"
```

Шаг C общей процедуры.

- [ ] **Step 7: Проверить Release workflow**

Шаг D. Затем `gh run view <id> --json jobs --jq '.jobs[] | "\(.name) \(.conclusion)"'` и `gh pr list --label "autorelease: pending" --json number --jq length`.
Expected: `release-please success`, job `publish` в статусе `skipped`, открытых Release PR — `0`.

- [ ] **Step 8: Завести файл находок**

```bash
git switch main && git pull --ff-only && git switch -c docs/findings
```

Создать `docs/findings.md` с заголовком и таблицей `| № | Сценарий | Ожидали | Получили | PR | Запуск |`, заполнить строку сценария 0, закоммитить `docs: находки, сценарий 0`. Ветку не пушить до Task 10.

---

### Task 3: Разовая настройка (шаги пользователя)

**Files:** нет.

- [ ] **Step 1: Собрать пакеты из `main`**

```bash
git switch main && git pull --ff-only
bun install --frozen-lockfile && bun run build
```

- [ ] **Step 2: Попросить пользователя и ждать**

Передать пользователю список:
1. `TP-Prepare` → Settings → Actions → General → включить «Allow GitHub Actions to create and approve pull requests»; то же в настройках репы.
2. `! npm login`, затем `! npm publish` из `packages/core` и из `packages/addon`.
3. На npmjs.com у каждого пакета → Settings → Trusted Publisher → GitHub Actions: организация `TP-Prepare`, репозиторий `release-please-playground`, workflow `release.yml`.

- [ ] **Step 3: Дождаться подтверждения пользователя**

- [ ] **Step 4: Проверить результат**

```bash
gh api orgs/TP-Prepare/actions/permissions/workflow --jq .can_approve_pull_request_reviews
gh api repos/TP-Prepare/release-please-playground/actions/permissions/workflow --jq .can_approve_pull_request_reviews
npm view @wely674378-team/core version
npm view @wely674378-team/addon version
npm view @wely674378-team/addon devDependencies peerDependencies
```

Expected: `true`, `true`, `1.0.0`, `0.1.0`. Вывод последней команды записать в находки (что стало с `workspace:*`). Если хоть одно значение не совпало — остановиться и сообщить пользователю, сценарий 1 не начинать.

---

### Task 4: Сценарий 1 — `fix:` в `core`, первый релиз из CI

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/index.test.ts`

- [ ] **Step 1: Ветка `scenario/1-fix-core`** (шаг A)

- [ ] **Step 2: Падающий тест**

```ts
test("greet обрезает пробелы", () => {
	expect(greet("  CDD ")).toBe("Hello, CDD!");
});
```

Run: `bun test` в `packages/core`. Expected: FAIL.

- [ ] **Step 3: `greet` обрезает пробелы в имени** — тест проходит.

- [ ] **Step 4: Коммит `fix: greet обрезает пробелы в имени`, шаги B и C**

- [ ] **Step 5: Release PR** (шаги D, E)

Ожидаем: `core` 1.0.0 → 1.0.1, `packages/core/CHANGELOG.md` создан, манифест обновлён. Зафиксировать факт: изменился ли `addon` (версия, peer-диапазон).

- [ ] **Step 6: Передать пользователю и проверить релиз** (шаги F, G)

Ожидаем: тег `core-v1.0.1`, GitHub Release, job `Publish packages/core` зелёный, `npm view @wely674378-team/core version` → `1.0.1`, attestations не `null`.
Из лога job выписать вывод `npm --version` (должно быть ≥ 11.5.1). Если job `publish` в статусе `skipped` при созданном релизе — имена выходов action не совпали: `gh run view <id> --log` по job `release-please`, поправить `release.yml` отдельным PR `fix:` в корне и записать в находки.

- [ ] **Step 7: Проверить `bun.lock` после релиза**

```bash
git switch main && git pull --ff-only
bun install --frozen-lockfile; echo "exit=$?"
bun install && git status --short bun.lock
git checkout bun.lock
```

Ожидаем: `exit=0`, затем `bun.lock` изменён (версия `core` в нём отставала). Факт записать в находки.

- [ ] **Step 8: Запись** (шаг H)

---

### Task 5: Сценарий 2 — `feat:` в `addon`

**Files:**
- Modify: `packages/addon/src/index.ts`
- Test: `packages/addon/test/index.test.ts`

**Interfaces:**
- Produces: `greetPair(a: string, b: string): string`

- [ ] **Step 1: Ветка `scenario/2-feat-addon`** (шаг A)

- [ ] **Step 2: Падающий тест**

```ts
test("greetPair", () => {
	expect(greetPair("a", "b")).toBe("Hello, a! Hello, b!");
});
```

- [ ] **Step 3: `greetPair` через `greet` из `core`** — тест проходит (перед тестом `bun run build`).

- [ ] **Step 4: Коммит `feat: greetPair`, шаги B и C**

- [ ] **Step 5: Release PR** (шаги D, E)

Ожидаем: меняется только `addon`, 0.x → следующая minor. Зафиксировать точную версию и то, что `core` не затронут.

- [ ] **Step 6: Передать пользователю, проверить релиз, записать** (шаги F, G, H)

Ожидаем: один job `Publish packages/addon`; версия `core` в npm не изменилась.

---

### Task 6: Сценарии 3 и 4 — коммиты без релиза

**Files:**
- Test: `packages/core/test/index.test.ts`
- Create: `packages/core/README.md`
- Modify: `package.json` (корень)

- [ ] **Step 1: Сценарий 3, ветка `scenario/3-no-release`** (шаг A)

Два коммита:
- `test: greet с кириллицей` — тест `expect(greet("Мир")).toBe("Hello, Мир!")`;
- `docs: README пакета core` — `packages/core/README.md` с названием пакета и одной строкой описания.

- [ ] **Step 2: Шаги B, C, D; проверить отсутствие Release PR**

Run: `gh pr list --label "autorelease: pending" --json number --jq length`
Expected: `0`.

- [ ] **Step 3: Сценарий 4, ветка `scenario/4-root-fix`** (шаг A)

В корневой `package.json` добавить скрипт `"check": "bun run build && bun run typecheck && bun run test"`. Коммит `fix: общий скрипт check в корне`.

- [ ] **Step 4: Шаги B, C, D; проверить отсутствие Release PR**

Expected: `0`. Если Release PR появился — записать, какой пакет и почему (по `gh pr diff`), PR не трогать и сообщить пользователю.

- [ ] **Step 5: Запись обоих сценариев** (шаг H)

---

### Task 7: Сценарий 5 — `feat!:` в `core`

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/index.test.ts`

- [ ] **Step 1: Ветка `scenario/5-breaking-core`** (шаг A)

- [ ] **Step 2: Падающий тест**

```ts
test("greet бросает ошибку на пустом имени", () => {
	expect(() => greet("  ")).toThrow("name is empty");
});
```

- [ ] **Step 3: `greet` бросает `Error("name is empty")`, если имя после обрезки пустое** — тесты `core` и `addon` проходят.

Коммит трогает только `packages/core`: так подъём `addon` в Release PR будет целиком работой плагина.

- [ ] **Step 4: Коммит `feat!: greet бросает ошибку на пустом имени`, шаги B и C**

- [ ] **Step 5: Release PR** (шаги D, E)

Ожидаем: `core` → 2.0.0. Зафиксировать факт: новый peer-диапазон `core` в `packages/addon/package.json`, новая версия `addon`, что написано в changelog `addon`.

- [ ] **Step 6: Передать пользователю, проверить релиз, записать** (шаги F, G, H)

Ожидаем: теги и публикация для каждого пакета, который поднял Release PR.

---

### Task 8: Сценарий 6 — два пакета одним PR

**Files:**
- Modify: `packages/core/src/index.ts`, `packages/addon/src/index.ts`
- Test: `packages/core/test/index.test.ts`, `packages/addon/test/index.test.ts`

**Interfaces:**
- Produces: `farewell(name: string): string` в `core`

- [ ] **Step 1: Ветка `scenario/6-both`** (шаг A)

- [ ] **Step 2: Первый коммит — `feat: farewell` в `core`**

Тест: `expect(farewell("CDD")).toBe("Bye, CDD!")`. Сначала падает, после реализации проходит.

- [ ] **Step 3: Второй коммит — `fix: greetAll пропускает пустые имена` в `addon`**

Тест: `expect(greetAll(["a", " ", "b"])).toEqual(["Hello, a!", "Hello, b!"])`. Сначала падает (после `bun run build`), после реализации проходит.

- [ ] **Step 4: Шаги B и C**

- [ ] **Step 5: Release PR** (шаги D, E)

Ожидаем: один Release PR на оба пакета; `core` → следующая minor, `addon` → следующая patch.

- [ ] **Step 6: Передать пользователю, проверить релиз, записать** (шаги F, G, H)

Ожидаем: два job `Publish …`, оба зелёные; обе версии в npm.

---

### Task 9: Сценарий 7 — публикация после «disallow tokens»

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/index.test.ts`

- [ ] **Step 1: Попросить пользователя и ждать**

На npmjs.com у обоих пакетов → Settings → Publishing access → «Require two-factor authentication and disallow tokens». Дождаться подтверждения.

- [ ] **Step 2: Ветка `scenario/7-disallow-tokens`** (шаг A)

- [ ] **Step 3: Падающий тест, затем реализация**

```ts
test("farewell обрезает пробелы", () => {
	expect(farewell(" CDD ")).toBe("Bye, CDD!");
});
```

- [ ] **Step 4: Коммит `fix: farewell обрезает пробелы`, шаги B и C**

- [ ] **Step 5: Release PR, передача пользователю, проверка релиза, запись** (шаги D–H)

Ожидаем: публикация `core` из CI проходит так же, как до включения настройки.

---

### Task 10: Находки в `main`

**Files:**
- Modify: `docs/findings.md`

- [ ] **Step 1: Дописать `docs/findings.md`**

После таблицы сценариев — три раздела:
- **Что переносим:** ссылки на итоговые `release-please-config.json` и `.github/workflows/release.yml` и список того, что меняется при переносе (скоуп, пути пакетов, имя репы и workflow в Trusted Publisher).
- **Разовая настройка:** шаги из спеки с поправками по факту.
- **Открытые вопросы:** `bun.lock`, `workspace:*` в опубликованном `package.json`, правила для версий ниже 1.0, CI на Release PR — по каждому факт из прогона и варианты решения.

- [ ] **Step 2: Проверить полноту**

В таблице восемь строк (сценарии 0–7), в каждой заполнены «Получили», PR и запуск.

- [ ] **Step 3: Коммит `docs: итог прогона`, PR, мерж**

```bash
git switch docs/findings && git merge main
```

Шаг C общей процедуры. Затем шаг D и проверка, что Release PR не появился.

- [ ] **Step 4: Сообщить пользователю итог**

Ссылка на `docs/findings.md`, критерий готовности из спеки по пунктам и предложение правок в frontend#18 — без внесения.
