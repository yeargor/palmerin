# Telemetry Framework

Этот документ описывает текущий telemetry-фреймворк для боевого режима: что пишется, где хранится, как запускать, чистить и анализировать.

## 1. Цель

Telemetry нужен для:
- анализа баланса (winrate, snowball, камбэк);
- анализа матчмейкинга (кто и почему попал/не попал в бой);
- анализа эволюции профилей/компонентов по времени;
- воспроизведения редких кейсов через RNG trace.

## 2. Где лежат логи

Основной файл:
- `artifacts/battle/battle-events.jsonl`

Формат:
- JSONL (один JSON-объект на строку).
- Каждая строка = одно событие телеметрии.

## 3. Как запустить сервер с логированием

Нужен именно Node-сервер с telemetry endpoint.

Команда:
```bash
npm run serve:logs
```

Скрипт:
- `scripts/serve-with-logs.mjs`

Endpoint'ы:
- `POST /__telemetry/battle` — запись события в лог-файл.
- `GET /__telemetry/battle-log` — чтение текущего лог-файла.

Важно:
- `python -m http.server` не пишет telemetry в файл.

## 4. Версионирование и контекст

Каждое событие содержит:
- `schemaVersion` — версия схемы telemetry (глобальная совместимость).
- `eventVersion` — версия структуры конкретного event payload.
- `sessionId` — стабильный ID браузерной telemetry-сессии (persist в localStorage).
- `pageSessionId` — ID текущей вкладки/загрузки страницы.
- `runId` — ID запуска боёв (увеличивается при нажатии `[start battles]`).
- `tickId` — номер боевого тика (монотонный в рамках run, сохраняется в runtime store).
- `startapp` — активный стартовый профиль из URL-контекста.
- `receivedAt` — время, когда сервер получил событие.
- `ts` — клиентское время формирования события.

## 5. Типы событий

### 5.1 `battle_tick`

Пишется на каждом боевом тике, даже если ни одна пара не прошла фильтр.

Ключевые поля:
- `config`
  - `systemLogIntervalMs`
  - `battleTickIntervalMs`
  - `matchmakingMaxDelta`

- `matchmaking`
  - `queue[]`: порядок после shuffle + сортировки по `mmScore`.
  - `decisions[]`: решения по соседним парам:
    - `accepted`
    - `rejected` + `reason` (`delta_exceeded`/`already_paired`)
  - `pairs[]`: реально сыгранные пары (с вероятностями и `powerDelta`).
  - `unmatchedUserIds[]`: кто остался без пары в тике.
  - `pool[]`: "why-not" снимок кандидатов для каждого игрока:
    - `candidates[]` с `delta` и `withinDelta`.

- `rngTrace`
  - `matchmaking[]`: random rolls shuffle + jitter.
  - `battles[]`: random rolls по каждой сыгранной паре (исход, дроп, цвет и т.д.).

- `battles[]`
  - `pair`: техническая инфа пары (`left/right`, `mmScore`, win probabilities).
  - `winnerUserId`, `loserUserId`, `powerDelta`.
  - `winnerUpdates`, `loserUpdates`:
    - изменения предметов,
    - изменение цвета,
    - служебные мета-поля (chance/roll/reason).
  - `winnerBefore`, `loserBefore`: честный снимок ДО мутаций в этой конкретной паре.
  - `winnerAfter`, `loserAfter`: снимок ПОСЛЕ применения изменений.
  - `winnerDiff`, `loserDiff`: вычисленный diff между before/after:
    - `fields` (level, rating, classId, colorTier, adjective, stats.*)
    - `componentChanges` (изменения по слотам).

- `leaderboardBefore[]`, `leaderboardAfter[]`
  - состояние рангов и power до/после тика.

### 5.2 `game_finished`

Пишется при нажатии `[finish game]`.

Поля:
- `winnerUserId`
- `winnerName`
- `leaderboard[]` (замороженный финальный)

## 6. Что входит в снимок игрока

`winnerBefore/After`, `loserBefore/After` и другие snapshot-поля используют структуру:
- `userId`, `name`
- `templateKey`, `classId`
- `level`, `rating`
- `colorTier`, `adjective`
- `stats`:
  - `hp`, `attack`, `power`
- `preset`:
  - выбранные component id по слотам
- `components[]`:
  - `slot`, `id`, `baseClass`, `stats.{hp,attack}`

## 7. Как чистить логи

Очистить telemetry-файл:
```bash
: > artifacts/battle/battle-events.jsonl
```

Удалить файл целиком:
```bash
rm -f artifacts/battle/battle-events.jsonl
```

Создать заново пустой:
```bash
mkdir -p artifacts/battle && : > artifacts/battle/battle-events.jsonl
```

## 8. Как быстро искать в логах

Количество событий:
```bash
wc -l artifacts/battle/battle-events.jsonl
```

Последние события:
```bash
tail -n 5 artifacts/battle/battle-events.jsonl
```

Только завершения игры:
```bash
rg '"type":"game_finished"' artifacts/battle/battle-events.jsonl
```

Тики без боёв:
```bash
rg '"pairs":\[\],"decisions"' artifacts/battle/battle-events.jsonl
```

## 9. Как делать анализ (базовый workflow)

1. Очистить лог-файл.
2. Запустить `npm run serve:logs`.
3. В UI создать пользователей, включить бои, дождаться нужного объёма данных.
4. Зафиксировать конец прогона (`finish game` при необходимости).
5. Анализировать `battle-events.jsonl`:
   - распределение participation по игрокам;
   - winrate по фазам (ранняя/средняя/поздняя);
   - drift power/level/hp/attack;
   - match quality (`delta`, `winProbability`);
   - частоту апсетов;
   - item/color transitions;
   - вклад RNG (через `rngTrace`).

## 10. Что важно помнить

- Telemetry best-effort: ошибки POST не должны ломать игровой цикл.
- Для чистого анализа не смешивайте разные прогоны в одном файле без фильтра по `runId`.
- `runId` увеличивается при старте битв (`[start battles]`), `tickId` хранится в runtime store и не сбрасывается случайным reload.
- Если сервер переключён на `python http.server`, telemetry файл не пополняется.

