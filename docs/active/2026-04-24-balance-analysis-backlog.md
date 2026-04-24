# Balance Analysis Backlog

Дата старта: 2026-04-24

## Цель

Собрать и зафиксировать воспроизводимую аналитику баланса по боевому циклу backend:
- participation (кто дерется, кто отстает),
- распределение уровней к концу рана,
- динамика редкости цветов (`colorTier`) и прилагательных,
- наличие snowball/anti-snowball эффектов.

## Источник правды

- Runtime: `packages/core/battle-engine.mjs`
- API: `apps/backend/server.mjs`
- Persistence: `packages/db/sqlite-store.mjs`
- Стратегия v3/v2 (исторический reference): `docs/completed/matchmaking_v3_and_progression_v2.md`

## Формат рабочих прогонов

Базовый быстрый прогон для анализа:
- users: `9`
- tick interval: `5000 ms`
- duration: `60s`
- конец: `admin/finish-game`

Сохранять:
1. `leaderboard` на момент завершения
2. `profile` всех участников (`level`, `colorTier`, `adjective`, `logs`)
3. `admin/telemetry-last-run` (из БД)

## Бэклог задач

1. Снять baseline-распределение на 5 независимых прогонах (9 users, 60s, tick 5s).
2. Посчитать дисперсию/разброс по уровням: `max-min`, p50, p90.
3. Посчитать распределение `colorTier` и сравнить с ожиданиями по progression.
4. Проверить долю forced/relaxed матчей по telemetry (`passStats`, `forcedPairsCount`).
5. Выявить “застревающих” игроков по `tickCount/fightsTotal` и streak-паттернам.
6. Сформировать предложения только по коэффициентам (без изменения структуры алгоритма).
7. После валидации коэффициентов провести повторную серию из 5 прогонов и сравнить с baseline.

## Критерии принятия изменений баланса

- Нет деградации participation.
- Нет экстремального snowball в коротких ранах.
- Распределение `colorTier` не схлопывается в один слой.
- Изменения объяснимы telemetry-данными и воспроизводимы.

## Журнал запусков

- `2026-04-24`: Инициация backlog и переход `docs/active -> docs/completed`.
