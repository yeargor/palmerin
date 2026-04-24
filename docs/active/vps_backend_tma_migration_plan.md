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
- Следующий этап: Plan M (ручной smoke + сбор продуктового фидбека), затем Plan B.
- Серверная модель: `systemd` (PM2 не используем).
- БД: SQLite.

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

- [ ] C.0 Подготовить отдельную deploy-ветку и release-конфигурацию без URL-аргументов
- [ ] C.1 локальный pre-release smoke
- [ ] C.2 VPS deploy (systemd + nginx)
- [ ] C.3 Telegram Mini App publish
- [ ] C.4 rollback procedure validation

## 8) Следующий план действий (что делать дальше)

### Следующий этап: Plan M (до Plan B)

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

### Обязательный pre-deploy gate (до C.1)

- Создать отдельную ветку под релиз-деплой (например: `release/deploy-vps`).
- В deploy-версии убрать передачу и использование runtime-аргументов через URL/query string.
- Для production-потока не использовать `tgUserId`, `tgUsername`, `view`, `user`, `startapp` как механизм управления сессией/ролями/маршрутами.
- Идентификацию и роль определять только через Telegram initData + backend session/init (authoritative backend flow).

## 9) Операционные правила (prod)

### Deploy flow

- Директория app: `/opt/telegram-miniapp`
- Env: `/etc/telegram-miniapp.env`
- DB: `/var/lib/telegram-miniapp/prod.sqlite`
- Release:
  1. `git fetch --all --tags`
  2. `git checkout release/deploy-vps` (или другой утвержденный deploy-branch)
  3. Проверить, что в этой ветке отключен URL/query-driven runtime flow (`tgUserId`, `tgUsername`, `view`, `user`, `startapp`).
  4. `git checkout <tag-or-commit>`
  5. `npm ci --omit=dev`
  6. pre-deploy SQLite backup
  7. `npm run db:migrate`
  8. `sudo systemctl restart telegram-miniapp`
  9. `curl /healthz` + `curl /readyz`

### Rollback flow

1. `git checkout <previous-stable-tag>`
2. restore SQLite from pre-deploy backup (если нужно)
3. `sudo systemctl restart telegram-miniapp`
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
- Plan B тестовый каркас пока не реализован.
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
