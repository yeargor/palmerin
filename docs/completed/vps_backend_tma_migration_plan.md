# VPS Backend + Telegram Mini App Migration Runbook

## 1) Цель документа

Этот файл — единая точка восстановления контекста.
Если память очищена, достаточно прочитать разделы `2`, `3`, `6`, `7`, `8` и можно продолжать работу без дополнительных источников.

## 2) TL;DR (текущее состояние)

- Монолит уже разделен по runtime-ответственности:
  - `frontend`: `apps/web/*`
  - `backend`: `apps/backend/*`
  - `shared domain`: `packages/core/*`
  - `persistence`: `packages/db/*`
- План A (рефактор и перенос authoritative state на backend) завершен.
- Plan B (тесты контракта/integration/e2e smoke) завершен.
- Серверная модель: `systemd` (PM2 не используем).
- БД: SQLite.
- Production backend поднят на VPS и отвечает по `https://palmerin.ru/api/*`.
- Frontend публикуется через GitHub Pages: `https://yeargor.github.io/palmerin/`.

## 3) Быстрый старт (после потери памяти)

1. Проверить, что backend и web поднимаются:
- `npm run db:migrate`
- `npm run backend:dev`
- `npm run web:dev`

2. Проверить health и web entry:
- `curl http://127.0.0.1:3001/readyz`
- `curl http://127.0.0.1:4173/apps/web/index.html`

3. Прогнать тесты:
- `npm test`

4. Открыть текущий трек прогресса:
- перейти к разделу `7` и продолжать с Plan M.

## 4) Зафиксированные архитектурные решения

- `Frontend (TMA)`: только UI + вызовы API.
- `Backend (VPS)`: authoritative state, бои, матчмейкинг, прогрессия, логи, лидерборд, админ-операции.
- Транспорт: `HTTPS JSON API`.
- Reverse proxy: `Nginx`.
- Process manager (prod): только `systemd`.
- Persistence: `SQLite`.
- Идентификация: Telegram `initData`/`user.id`.
- Admin доступ: whitelist `telegram user id` в backend конфиге.
- Демо-профили (`warrior`, `mage`, `cowboy`, `random`) — UI-демо, не пользователи лидерборда.

## 5) Актуальная структура репозитория (canonical)

### Frontend

- `/home/yahor/telegram-miniapp-demo/apps/web/index.html`
- `/home/yahor/telegram-miniapp-demo/apps/web/styles.css`
- `/home/yahor/telegram-miniapp-demo/apps/web/app.js`
- `/home/yahor/telegram-miniapp-demo/apps/web/src/api-client.js`
- `/home/yahor/telegram-miniapp-demo/apps/web/src/session-api.js`
- `/home/yahor/telegram-miniapp-demo/apps/web/src/telegram-context.js`
- `/home/yahor/telegram-miniapp-demo/apps/web/src/character-quotes.js`

### Backend

- `/home/yahor/telegram-miniapp-demo/apps/backend/server.mjs`

### Shared domain

- `/home/yahor/telegram-miniapp-demo/packages/core/sprite-constructor.js`
- `/home/yahor/telegram-miniapp-demo/packages/core/battle-engine.mjs`

### Persistence

- `/home/yahor/telegram-miniapp-demo/packages/db/sqlite-store.mjs`
- `/home/yahor/telegram-miniapp-demo/scripts/db-migrate.mjs`
- `/home/yahor/telegram-miniapp-demo/data/dev.sqlite` (dev)

### Contracts

- `/home/yahor/telegram-miniapp-demo/packages/contracts/api-contracts.js`

### Важно про корень

- `app.js` и `styles.css` в корне удалены.
- Корневой `index.html` удален (legacy entry отключен полностью).

## 6) Что уже сделано (Plan A)

### A.1/A.3

- Создана целевая структура `apps/*`, `packages/*`.
- Зафиксирован API контракт v1 (routes + DTO shapes).

### A.2/A.4

- Backend поднят и стал authoritative runtime.
- Перенесены тики/изменения состояния в backend loop.
- Реализована SQLite persistence и восстановление состояния после рестарта.

### A.5

- Frontend работает через `apiClient`.
- Админ-экран без local fallback (если backend недоступен — явная ошибка).
- Profile selector и user session читают backend read-path (`users`, `session/init`, `profile/:id`).

### A.6

- Добавлен backend role-check для `admin/*` по Telegram user id.

## 7) Трекер прогресса

### Plan A — Рефакторинг и перенос логики

- [x] A.1 структура репозитория
- [x] A.2 runtime state на backend
- [x] A.3 API контракт v1
- [x] A.4 SQLite persistence + restore
- [x] A.5 frontend read-path через API
- [x] A.6 backend role-check admin/user

### Plan M — Ручное тестирование и сбор фидбека

- [ ] M.1 Ручной smoke по ролям admin/user
- [ ] M.2 Фиксация продуктового фидбека в runbook (этот файл)
- [ ] M.3 Имплементация правок по фидбеку и повторный ручной прогон
- [ ] M.4 Подтверждение готовности к Plan B

### Plan B — Тестирование client-server

- [x] B.1 Contract tests
- [x] B.2 Integration tests
- [x] B.3 E2E smoke

### Plan C — Деплой Telegram + VPS

- [x] C.0 Подготовить отдельную deploy-ветку и release-конфигурацию без URL-аргументов
- [ ] C.1 локальный pre-release smoke
- [x] C.2 VPS deploy (systemd + nginx)
- [x] C.3 Telegram Mini App publish
- [ ] C.4 rollback procedure validation

## 8) Следующий план действий (что делать дальше)

### Исторический этап: Plan M (до Plan B)

1. Провести ручной role-based smoke и собрать продуктовый фидбек (owner pass).
2. Зафиксировать и принять как обязательные требования следующие пункты:
- Обычный пользователь не должен иметь доступ к странице `view=admin`.
- Для обычного пользователя должна быть одна страница: его профиль (home, без переключения режимов через UI).
- Единственная страница обычного пользователя: его сгенерированный персонаж.
- Если по новому `telegram user id` в БД нет профиля, backend генерирует профиль и сохраняет его.
- При следующей загрузке этот же пользователь получает уже существующий профиль из БД.
- Генерация персонажа для нового пользователя должна быть эталонно эквивалентна текущему `startapp=random` (цвета и все фичи страницы).
- Причина: текущая `admin/new-user` генерирует профиль не так, как эталонный `random`-flow, который и задумывался для генерации профилей.
- Для админа `new user` должен запускать тот же процесс генерации, но с мнимым (служебным) user id, а не с реальным Telegram user id.
- Лидерборд должен отображать реальное наличие пользователей в БД.
- Админ может заходить на страницу любого пользователя (как сейчас).
- У админа должен быть собственный профиль по умолчанию.
- Только у админа должны отображаться 2 нижние кнопки доступа к админке.
- У обычного пользователя эти кнопки не должны отображаться, и доступ к admin API также должен быть закрыт.
3. Проверка по лидерборду (dev, `2026-04-24`): `users` в SQLite = `6`, `/api/users` = `6`, `/api/leaderboard` (`users`) = `6`.
4. После закрытия Plan M перейти к Plan B:
- contract tests для API DTO и статусов ответов;
- integration tests для `session/init`, `admin/new-user`, `start/stop`, `finish-game`, `users`, `profile/:id`;
- smoke e2e: init session, создание пользователей, start/stop battles, проверка профиля/логов/лидерборда.
5. Зафиксировать отчет по прохождению Plan B в этом файле и только затем переходить к Plan C.

### Актуальный следующий этап: Plan C hardening

1. C.1: локальный pre-release smoke (роль admin/user, live leaderboard, reset/start/finish flow).
2. C.4: формализовать и проверить rollback procedure на staging/prod-like сценарии.
3. Закрыть production-проверку Telegram initData signature в backend.

### Обязательный pre-deploy gate (до C.1)

- Создать отдельную ветку под релиз-деплой (например: `release/deploy-vps`).
- В deploy-версии убрать передачу и использование runtime-аргументов через URL/query string.
- Для production-потока не использовать `tgUserId`, `tgUsername`, `view`, `user`, `startapp` как механизм управления сессией/ролями/маршрутами.
- Идентификацию и роль определять только через Telegram initData + backend session/init (authoritative backend flow).

### Статус pre-deploy gate (`2026-04-24`)

- Создана ветка `release/deploy-vps`.
- Убран URL/query-driven runtime flow для `tgUserId`, `tgUsername`, `view`, `user`, `startapp` в frontend.
- Навигация разнесена на отдельные entrypoints без query-аргументов:
  - `apps/web/index.html` (home),
  - `apps/web/admin.html`,
  - `apps/web/profiles.html`,
  - `apps/web/live.html`.
- Выбор целевого пользователя админом теперь передается через `sessionStorage`, а не через URL.

## 9) Операционные правила (prod)

### Deploy flow

- Директория app: `/opt/palmerin`
- Env: `/etc/palmerin.env`
- DB: `/var/lib/palmerin/prod.sqlite`
- Service: `palmerin.service`
- Release:
  1. `git fetch --all --tags`
  2. `git checkout master`
  3. `git merge --ff-only release/deploy-vps`
  4. `git push origin master` (это триггерит GitHub Pages workflow)
  5. На VPS: `cd /opt/palmerin && git pull`
  6. На VPS: `sudo -u palmerin -H bash -lc 'cd /opt/palmerin && npm ci --omit=dev'`
  7. На VPS: `sudo -u palmerin -H bash -lc 'cd /opt/palmerin && source /etc/palmerin.env && npm run db:migrate'`
  8. На VPS: `sudo systemctl restart palmerin`
  9. Проверки: `curl https://palmerin.ru/healthz` и `curl https://palmerin.ru/readyz`

### Rollback flow

1. `git checkout <previous-stable-tag>`
2. restore SQLite from pre-deploy backup (если нужно)
3. `sudo systemctl restart palmerin`
4. verify `healthz/readyz`

### Backup policy (без двусмысленностей)

- Регулярный backup: каждые 6 часов.
- Хранить ровно 2 последних регулярных backup файла.
- Pre-deploy backup: создавать перед каждым релизом/миграцией.
- Хранить ровно 1 последний pre-deploy backup.
- Итого: всегда `2 regular + 1 pre-deploy`.
- Старые backup файлы удаляются автоматически.
- Раз в неделю — тест восстановления из свежего regular backup.

## 10) Ограничения/не входит в эту задачу

- Не добавляем новый спрайт-контент и визуальные изменения сверх API-адаптации.
- Не меняем балансные формулы как часть миграции архитектуры.

## 11) Риски и долги

- `apps/web/app.js` еще крупный, нужна дальнейшая модульная декомпозиция по страницам/UI.
- End-to-end автоматизация deploy/rollback (`deploy.sh`, `rollback.sh`) не завершена.
- Полная production-проверка Telegram initData signature еще не закрыта.

## 12) Контрольная точка

- Snapshot date: `2026-04-24` (Europe/Minsk)
- Baseline commit before migration block: `2a40e1a`
- Проверка состояния:
  - `npm test`
  - `curl http://127.0.0.1:3001/readyz`
  - `curl http://127.0.0.1:4173/apps/web/index.html`

## 13) Отчет Plan B (выполнено)

- Дата фиксации: `2026-04-24`.
- Добавлены и проходят:
  - `tests/contract-api.test.mjs` (контракт маршрутов/DTO),
  - `tests/integration-api.test.mjs` (session/init, admin access, users, profile access, leaderboard display),
  - `tests/e2e-smoke.test.mjs` (init session, start/stop battles, finish-game, reset-game, live-leaderboard sync).
- Тестовый backend в изолированной временной SQLite:
  - `tests/helpers/backend-test-server.mjs`.
- Результат прогона: `npm test` -> `21 passed, 0 failed`.

## 14) Паттерн деплоя и операционный снимок (`2026-04-24`)

### 14.1 Что и где сейчас развернуто

- Репозиторий: `https://github.com/yeargor/palmerin`
- Frontend (Pages): `https://yeargor.github.io/palmerin/`
- Backend API: `https://palmerin.ru/api/*`
- Nginx проксирует:
  - `/api/*` -> `http://127.0.0.1:3001/api/*`
  - `/healthz` -> backend `/healthz`
  - `/readyz` -> backend `/readyz`
- VPS:
  - OS: Ubuntu 24.04 LTS
  - service: `palmerin`
  - app dir: `/opt/palmerin`
  - env: `/etc/palmerin.env`
  - db: `/var/lib/palmerin/prod.sqlite`

### 14.2 Актуальные ветки и практический workflow

- `master`:
  - рабочая production-ветка для GitHub Pages деплоя.
- `release/deploy-vps`:
  - staging/release-ветка для pre-deploy подготовки и проверок.
- Фактический workflow:
  1. вносить правки в `release/deploy-vps`;
  2. после проверки делать `merge --ff-only` в `master`;
  3. пушить `master` для деплоя Pages;
  4. отдельно обновлять backend код на VPS (`git pull`, `npm ci`, `db:migrate`, restart service).

### 14.3 Ключевые фронтенд-решения для production

- Убраны runtime query-параметры из production flow:
  - `tgUserId`, `tgUsername`, `view`, `user`, `startapp` не используются как основной runtime transport.
- Добавлены отдельные entry pages:
  - `apps/web/index.html` (home)
  - `apps/web/admin.html`
  - `apps/web/profiles.html`
  - `apps/web/live.html`
- Для Pages-совместимости frontend больше не импортирует runtime-модули из `../../packages/*`:
  - локальные копии: `apps/web/src/sprite-constructor.js`, `apps/web/src/api-contracts.js`.
- Текущий исполняемый bundle, подключенный в html: `apps/web/app.v2.js` (использовался как cache-bust для Telegram WebView).

### 14.4 Что было сломано и как обошли

1. GitHub Pages environment protection block для `release/*`:
- Симптом: деплой из `release/deploy-vps` запрещен правилами `github-pages`.
- Решение: деплой Pages только из `master` + merge из `release/deploy-vps`.

2. Workflow триггерился на `main`, а рабочая ветка `master`:
- Решение: в `.github/workflows/deploy-pages.yml` ветка триггера переключена на `master`.

3. Mini App в Telegram зависал на `loading profile...`:
- Причина: на Pages ломались импорты в `../../packages/*`.
- Решение: перенести фронтовые runtime зависимости в `apps/web/src/*` и обновить импорты.

4. Telegram/WebView кэшировал старый bundle:
- Симптом: после фиксов в репо в приложении продолжала грузиться старая логика.
- Решение: временный versioned bundle `app.v2.js` и переключение html на него.

5. Xiaomi Redmi (Note 11/12) криво рендерил ASCII-логотип:
- Симптом: текстовый логотип был визуально сжат/сдвинут.
- Причина: нестабильный рендер preformatted monospace + transform/font metrics в Android WebView.
- Решение: заменить текстовый `<pre>` логотип на image asset:
  - `apps/web/assets/palmerun-logo.png`
  - в html использовать `<img class="game-logo-image" ...>`
  - адаптивность сохранить через CSS (`width: 100%; height: auto;`).

### 14.5 Важные настройки, которые проверять первыми

- Backend CORS:
  - `CORS_ALLOWED_ORIGINS=https://yeargor.github.io` в `/etc/palmerin.env`.
- Admin whitelist:
  - `ADMIN_TELEGRAM_USER_IDS=<comma-separated Telegram user ids>` в `/etc/palmerin.env`.
- После каждого изменения env:
  - `sudo systemctl restart palmerin`
  - `curl -i -H 'Origin: https://yeargor.github.io' https://palmerin.ru/readyz`

### 14.6 Где править при следующих изменениях

- Frontend UI/логика:
  - `apps/web/index.html`, `apps/web/admin.html`, `apps/web/profiles.html`, `apps/web/live.html`
  - `apps/web/app.v2.js` (актуальный подключенный bundle)
  - `apps/web/styles.css`
  - `apps/web/src/*`
- Backend API/роль/admin:
  - `apps/backend/server.mjs`
- Контракты/ядро:
  - `packages/contracts/api-contracts.js`
  - `packages/core/*`
- Тесты:
  - `tests/*.test.mjs`
  - `tests/helpers/backend-test-server.mjs`
