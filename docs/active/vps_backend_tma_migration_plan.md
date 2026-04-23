# Active Plan: VPS Backend + Telegram Mini App Frontend

Контекст: текущий проект работает как клиентское приложение с локальным runtime-состоянием. Цель — разделить архитектуру: бэкенд на VPS (за Nginx + HTTPS), фронтенд как Telegram Mini App.

## 1) Целевая архитектура (согласованный вектор)

- `Frontend (Telegram Mini App)`: только UI, рендер персонажа, пользовательские действия, чтение состояния через API.
- `Backend (VPS)`: authoritative state, боевая логика, матчмейкинг, дропы, прогрессия, телеметрия, лидерборд.
- `Transport`: HTTPS JSON API (плюс опционально SSE/WebSocket позже для live-обновлений).
- `Reverse proxy`: Nginx (TLS termination, CORS policy, routing `/api/*`).

## 2) Принципы миграции

- Не делать big-bang переписывание.
- Сначала выделить API-контракт, потом переносить логику поэтапно.
- На фронте оставить текущий UI-слой максимально неизменным, заменяя источники данных через адаптер.
- Не смешивать текущую задачу баланса/весов с транспортным рефакторингом.

## 3) Этап A — контракт и границы ответственности

- Зафиксировать API surface v1:
  - `POST /api/session/init` — инициализация пользователя/сессии.
  - `GET /api/profile/:id` — профиль и текущее состояние.
  - `GET /api/leaderboard` — текущий рейтинг.
  - `POST /api/admin/start-battles`, `POST /api/admin/finish-game`, `POST /api/admin/new-user`, `POST /api/admin/clear-users`.
  - `POST /api/telemetry/events` — ingestion telemetry.
- Зафиксировать минимальные DTO для:
  - `User`, `ProfilePreset`, `BattleTickEvent`, `ComponentRollEvent`, `GameFinishedEvent`.
- Зафиксировать backend-authoritative правила: фронт не считает исходы боев и не мутирует authoritative стейт.

## 4) Этап B — backend skeleton на VPS

- Поднять backend-приложение (Node.js) с health-check:
  - `GET /healthz`
  - `GET /readyz`
- Вынести runtime state в серверный store:
  - сначала in-memory (быстрый старт),
  - затем persistence-слой (SQLite/Postgres) без смены API.
- Реализовать CORS whitelist для TMA origin + админского origin.
- Подготовить `.env` и конфиг:
  - `API_PORT`, `API_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `TELEMETRY_WRITE_PATH`, `BATTLE_TICK_INTERVAL_MS`, `SYSTEM_LOG_INTERVAL_MS`.

## 5) Этап C — Telegram Mini App интеграция (frontend)

- Добавить клиентский API-слой (`apiClient`) и заменить прямой доступ к local runtime на API-вызовы.
- Добавить bootstrap Telegram context:
  - чтение `initData`/`initDataUnsafe`,
  - передача на backend для валидации/привязки пользователя.
- Обновить flow:
  - открытие профиля и списка пользователей через backend данные,
  - логи/лидерборд/боевой статус читаются из API.

## 6) Этап D — перенос игровой логики на backend

- Перенести тики боев, матчмейкинг, ап/даун вещей, пересчет цветов и уровней в backend.
- На фронте оставить только отображение результатов.
- Телеметрию писать с backend как источник истины (frontend telemetry — как дополнительный сигнал).

## 7) Этап E — deploy и эксплуатация на VPS

- Настроить systemd unit для backend.
- Настроить Nginx site config:
  - `https://api.<domain>` -> backend upstream,
  - rate limit на write endpoints.
- Добавить ротацию логов и бэкап telemetry/artifacts.
- Добавить smoke-check после деплоя (`healthz`, `session/init`, `leaderboard`).

## 8) Риски и меры

- Риск: рассинхрон клиента и сервера по состоянию.
  - Мера: single source of truth на backend, фронт только read + command.
- Риск: CORS/Telegram origin mismatch.
  - Мера: явный whitelist и окружения `dev/stage/prod`.
- Риск: дублирование расчетов battle logic на фронте и бэке.
  - Мера: удалить authoritative вычисления с фронта после миграции этапа D.
- Риск: сломать текущий баланс при переносе.
  - Мера: сохранить неизменные формулы и telemetry schema, сравнить метрики до/после.

## 9) Минимальный порядок работ (рекомендуемый)

1. Зафиксировать API-контракт и DTO (Этап A).
2. Поднять backend skeleton + health + CORS + env (Этап B).
3. Подключить фронт к API без переноса боев (read path first) (Этап C, частично).
4. Перенести боевой тик и authoritative state на backend (Этап D).
5. Закрыть инфраструктуру VPS/Nginx/systemd (Этап E).

## 10) Что намеренно не делаем в этой задаче

- Не добавляем новый игровой контент (новые компоненты/спрайты).
- Не меняем балансные формулы и веса компонентов.
- Не расширяем UI-дизайн сверх адаптации к API/TMA.

## 11) Доступ, роли, персистентность и Telegram-привязка

### Роли и права

- Две роли: `admin` и `user`.
- `admin` имеет доступ к админке и текущим административным действиям:
  - просмотр лидерборда,
  - старт/остановка битв,
  - генерация random-персонажа,
  - просмотр predefined-профилей.
- `user` не имеет доступа к админке и admin-endpoints; пользователь видит только основной игровой интерфейс.

### Вход пользователя и стартовый профиль

- При первом входе Telegram-пользователя создается стартовый профиль по логике текущего `random`.
- Новый профиль сохраняется в БД и закрепляется за Telegram-пользователем.
- При повторном входе профиль и прогресс загружаются с backend, без потери состояния.

### Персистентность данных (SQLite как первый шаг)

- Подключить `SQLite` как первичный persistent store.
- Сохранять как минимум:
  - пользователи и привязка к Telegram (`telegram_user_id`),
  - текущий пресет/компоненты/цвет/уровень/статы,
  - логи,
  - состояние игры (`battlesStarted`, `finished`, тайминги, лидерборд/рейтинг).
- Боевая симуляция и прогрессия работают на backend и пишут изменения в БД.

### Telegram-идентификация и выдача админки

- Полноценную отдельную auth-схему пока не вводим.
- Используем Telegram metadata из Mini App (`initData`) для привязки пользователя к записи в БД.
- Админ-права назначаются по whitelist Telegram user id (значение задается в конфиге).
- Проверка прав выполняется на backend для каждого admin-endpoint.

### Минимальные backend-ограничения

- Все admin-endpoints закрыть проверкой `isAdmin`.
- Для обычного пользователя доступ только к user-операциям своего профиля.
- Авторитетным источником состояния всегда остается backend + БД.
