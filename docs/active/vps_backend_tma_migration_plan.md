# Active Plan: Split Monolith -> VPS Backend + Telegram Mini App Frontend

Контекст: сейчас проект работает как монолит с локальным runtime-состоянием в UI.  
Цель: разделить систему на `backend (VPS)` и `frontend (Telegram Mini App)` без потери текущей игровой логики и UI.

## 1) Зафиксированные архитектурные решения

- `Frontend (TMA)`: только UI и пользовательские команды.
- `Backend (VPS)`: authoritative state, бои, матчмейкинг, прогрессия, логи, лидерборд, админ-операции.
- Транспорт: `HTTPS JSON API`.
- Reverse proxy: `Nginx`.
- Process manager: только `systemd` (PM2 не используем).
- Persistent storage: `SQLite` (первый этап).
- Идентификация пользователя: Telegram `initData`/`user.id`.
- Админ-доступ: whitelist Telegram user id из backend-конфига.
- Демо-профили (`warrior`, `mage`, `cowboy`, `random`) остаются UI-демо и не считаются пользователями лидерборда.

## 2) План A: Рефакторинг монолитного репозитория

### A.1 Целевая структура

- `apps/web` — Telegram Mini App frontend.
- `apps/backend` — API + игровой цикл + админ-эндпоинты.
- `packages/core` — общая доменная логика (генерация/стати/правила).
- `packages/contracts` — DTO и схемы API.
- `packages/db` — SQLite schema/migrations/repositories.
- `docs/active` — планы, runbook, чеклисты.

### A.2 Этапы рефакторинга

1. Зафиксировать API-контракт v1 и DTO.
2. Поднять backend skeleton (`/healthz`, `/readyz`) с CORS и `.env`.
3. Вынести runtime state из UI в backend (сначала in-memory, затем SQLite без смены API).
4. Перенести боевой цикл/матчмейкинг/прогрессию на backend.
5. Перевести frontend на `apiClient` и убрать authoritative-вычисления из UI.
6. Подключить Telegram identity и проверку ролей (`admin`/`user`) на backend.

### A.3 Минимальные API v1 (обязательный набор)

- `POST /api/session/init`
- `GET /api/profile/:id`
- `GET /api/leaderboard`
- `POST /api/admin/new-user`
- `POST /api/admin/clear-users`
- `POST /api/admin/start-battles`
- `POST /api/admin/stop-battles`
- `POST /api/admin/finish-game`
- `POST /api/telemetry/events`

### A.4 Definition of Done для плана A

- UI не хранит authoritative state боя.
- Все административные действия выполняются только через backend.
- Состояние пользователя и боя восстанавливается после перезапуска backend из SQLite.
- Доступ к admin-endpoints закрыт для не-админа.

## 3) План B: Тестирование client-server взаимодействия

### B.1 Уровни тестов

1. `Contract tests`
- Проверка соответствия frontend DTO и backend DTO.
- Проверка кодов ответа и обязательных полей.

2. `Integration tests`
- `session/init` -> создание/загрузка профиля.
- `admin/new-user` -> пользователь появляется в leaderboard.
- `start/stop battles` -> меняется состояние боевого цикла.
- `finish-game` -> игра фризится и пишется системный лог завершения.

3. `E2E smoke`
- Вход через Telegram-контекст (mock `initData` в dev).
- Открытие профиля, логов, лидерборда.
- Проверка, что demo-профили видны как UI-страницы, но не как users.

### B.2 Набор сценариев регрессии (обязательный)

- Неадмин не может вызвать `admin/*`.
- При повторном входе тот же Telegram user получает свой сохраненный профиль.
- После `clear-users` лидерборд пуст.
- После `finish-game` новые бои не запускаются.
- Логи приходят по типам (`system`, `combat`, `drop`, `level_up`) без смешивания.

### B.3 Definition of Done для плана B

- Все обязательные интеграционные сценарии проходят.
- Нет рассинхрона между UI и backend state в smoke-потоке.
- Ошибки API корректно отображаются в UI (без поломки экрана).

## 4) План C: Деплой в Telegram и на VPS

### C.1 Локально перед выкладкой

1. `npm ci`
2. `npm run db:migrate`
3. smoke-тест API (`healthz`, `readyz`, `session/init`, `leaderboard`)
4. smoke UI с Telegram mock-контекстом

### C.2 VPS backend деплой (systemd)

- Код: `/opt/telegram-miniapp`
- Env: `/etc/telegram-miniapp.env`
- SQLite: `/var/lib/telegram-miniapp/prod.sqlite`
- Команды релиза:
  1. `git fetch --all --tags`
  2. `git checkout <tag-or-commit>`
  3. `npm ci --omit=dev`
  4. `backup sqlite` (обязательно, см. политику ниже)
  5. `npm run db:migrate`
  6. `sudo systemctl restart telegram-miniapp`
  7. `sudo systemctl status telegram-miniapp`
  8. `curl /healthz` и `curl /readyz`

### C.3 Telegram Mini App выкладка

1. Собрать frontend с `API_BASE_URL` прод-API.
2. Разместить frontend на хостинге для TMA (HTTPS).
3. Обновить URL Mini App у Telegram-бота.
4. Проверить открытие Mini App в Telegram-клиенте и базовый user-flow.

### C.4 Rollback-флоу (обязательный)

1. `git checkout <previous-stable-tag>`
2. восстановить SQLite из pre-deploy backup (если миграция/данные сломаны)
3. `sudo systemctl restart telegram-miniapp`
4. проверить `healthz/readyz`

### C.5 Definition of Done для плана C

- Backend стабильно работает под `systemd`.
- Frontend открывается из Telegram и ходит в прод-API.
- Rollback воспроизводим и проверен.

## 5) Однозначная политика SQLite backup (без неопределенностей)

Цель: иметь минимум два актуальных файла бэкапа + pre-deploy snapshot.

- Регулярные бэкапы: каждые 6 часов.
- Хранение регулярных бэкапов: ровно `2` последних файла (`rotate-2`).
- Pre-deploy бэкап: создается перед каждым деплоем/миграцией.
- Хранение pre-deploy: ровно `1` последний файл (заменяется при следующем релизе).
- Итого в любой момент: `2` регулярных + `1` pre-deploy.
- Старые файлы удаляются автоматически скриптом ротации.
- Раз в неделю выполняется тест восстановления из самого свежего регулярного бэкапа.

## 6) Роли и ограничения доступа

- `admin`:
  - leaderboard,
  - start/stop battles,
  - finish game,
  - new user / clear users,
  - доступ к predefined профилям в UI.
- `user`:
  - вход в игру,
  - просмотр и использование только своего профиля/прогресса.
- Проверка ролей только на backend.

## 7) Что не входит в этот план

- Не добавляем новый контент компонентов/спрайтов.
- Не меняем формулы баланса в рамках миграции архитектуры.
- Не расширяем визуальный дизайн сверх адаптации к API/TMA.
