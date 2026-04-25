# Telemetry Framework

Документ описывает два актуальных telemetry-контура и как ими пользоваться без путаницы:
- Frontend JSONL telemetry (локальный инструмент, `serve-with-logs`),
- Backend authoritative telemetry (production/dev API + SQLite `telemetryLastRun`).

## 1. Что считать источником истины

Для анализа реального боевого цикла backend источником истины является:
- `GET /api/admin/telemetry-last-run`
- поле `telemetryLastRun` в `game_state` (SQLite)

Frontend JSONL (`artifacts/battle/battle-events.jsonl`) — вспомогательный локальный канал для UI/отладки.

## 2. Backend telemetry (authoritative)

### 2.1 Где хранится
- SQLite: таблица `game_state`, поле `telemetry_last_run_json`
- Нормализованное поле runtime: `gameState.telemetryLastRun`

### 2.2 API
- `GET /api/admin/telemetry-last-run` (admin only)
- `POST /api/telemetry/events` (принимает payload, но authoritative battle telemetry не зависит от него)

### 2.3 Что внутри `telemetryLastRun`
- `runId`, `status` (`running|paused|finished`)
- `startedAt`, `lastUpdatedAt`, `finishedAt`
- `winnerUserId`
- `tickCount`, `fightsTotal`
- `latestTick`
- `ticks[]` (хвост последних тиков)

### 2.4 Быстрый доступ
```bash
curl -fsS http://127.0.0.1:3001/api/admin/telemetry-last-run \
  -H 'X-Telegram-User-Id: <ADMIN_TG_ID>'
```

## 3. Frontend JSONL telemetry (локальный)

Этот режим жив только при запуске локального статического сервера:
- `npm run serve:logs`

### 3.1 Endpoint'ы локального сервера
- `POST /__telemetry/battle`
- `GET /__telemetry/battle-log`

### 3.2 Файл
- `artifacts/battle/battle-events.jsonl`

### 3.3 Очистка/чтение
```bash
: > artifacts/battle/battle-events.jsonl
wc -l artifacts/battle/battle-events.jsonl
tail -n 5 artifacts/battle/battle-events.jsonl
```

Важно:
- `python -m http.server` не умеет эти endpoint'ы и не пишет telemetry-файл.
- JSONL режим не заменяет backend telemetry.

## 4. Рекомендуемый workflow анализа баланса

1. Поднять backend (`npm run backend:dev`) и web (`npm run web:dev` или `npm run serve:logs`).
2. Создать пользователей/запустить бой через админку (`/apps/web/admin.html`).
3. Снять authoritative telemetry:
   - `GET /api/admin/telemetry-last-run`
4. При необходимости дополнить отладкой JSONL (если web запущен через `serve-with-logs`).

## 5. Симуляции

Основной скрипт:
- `scripts/simulate-battle-run.mjs`

Запуски:
```bash
npm run simulate:battle:smoke
npm run simulate:battle
```

После прогона анализировать в первую очередь backend-метрики (`telemetryLastRun`), а JSONL использовать как дополнительный след событий UI.
