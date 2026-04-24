# Backend Battle Parity Memory Note (2026-04-24)

## Зачем сделано
Вернуть на backend полную core-логику боёв, которая была в монолите и на фронте, но потерялась после split frontend/backend.

## Источник истины для сверки
- Монолит до split: commit `60234e31f5669a52cc08ff75801c505ad561b2a9` (`2a40e1a^`), файл `app.js`.
- Доп. исторический ориентир: commit `a1e3b41`.
- Целевое состояние: backend battle engine повторяет battle-core поведение монолита.

## Что конкретно восстановлено
1. Matchmaking pipeline:
- `mmScore` (power + jitter)
- приоритет пользователей (low battles / stale ticks)
- relaxed passes (`MATCHMAKING_RELAX_OFFSETS`)
- forced pairing cap
- детальные решения паринга (`pairDecisions`, `passStats`, `unmatchedDetails`)

2. Outcome pipeline:
- вероятность победы по logistic формуле
- `runBattleForPair` с деталями пары/вероятностей

3. Battle progression:
- апгрейд/даунгрейд компонентов по слотам
- пересчёт класса (`classId`) из пресета
- апдейт цвета/прилагательного (`colorTier`/`adjective`) для random
- streak-механики (`winStreak`/`loseStreak`)
- `battlesTotal`/`lastBattleTick`
- синхронизация `hp`/`attack` из компонентов

4. Метаданные и трассировка:
- полные `meta` в weighted picks и upgrade/downgrade
- `winnerBefore/after`, `loserBefore/after`
- `computeStateDiff`
- `rngTrace` для matchmaking и боёв
- расширенный payload из `runBattleTick` (pairing/rng/battles/leaderboardBefore/After)

5. Логи боёв:
- восстановлен полный пул `combatOutcomePhrases` как в монолите
- сохранены логи о дропах/ауре/уровне

## Файлы, которые изменены
- `packages/core/battle-engine.mjs`
- `apps/backend/server.mjs`
- `tests/battle-engine.test.mjs`

## Изменения в backend server
- Передача параметров в `runBattleTick`:
  - `currentTick: store.gameState.telemetryTickId`
  - `matchmakingMaxDelta: env.matchmakingMaxDelta`
- Добавлен env-параметр:
  - `MATCHMAKING_MAX_DELTA` (default `1.75`)
- Runtime/ready config теперь содержит `matchmakingMaxDelta`.

## Проверка после изменений
Запущено:
- `npm test --silent`

Результат:
- `22/22` тестов зелёные.

## Что важно помнить при следующем заходе
1. Battle-core теперь живёт в `packages/core/battle-engine.mjs` и должен считаться primary source для backend боя.
2. При любых новых правках проверять паритет с историей battle-core, если меняется алгоритм матчмейкинга/прогрессии.
3. Если снова появится рассинхрон фронт/бек:
- сначала сравнивать `runBattleTick` pipeline,
- затем `buildBattlePairs`,
- затем `updateUserAfterBattleVictory/Defeat`.

## Быстрый smoke-check вручную
1. Поднять backend.
2. Создать >=2 random users.
3. Включить battles.
4. Проверить, что в profile меняются:
- `components`
- `classId`
- `colorTier`
- `adjective`
- `battlesTotal`, `lastBattleTick`, streak-поля
- `hp/attack` в соответствии с компонентами.

## Ограничения/заметки
- SQLite схема не расширялась под новые колонки: дополнительные поля (`battlesTotal`, streak и т.д.) хранятся в runtime-объектах и переживают процесс, но текущая таблица users хранит базовые профильные поля.
- Если потребуется долговременная персистентность этих полей на уровне БД, нужен отдельный миграционный шаг.
