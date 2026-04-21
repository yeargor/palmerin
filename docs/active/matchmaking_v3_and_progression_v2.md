# Matchmaking v3 + Progression v2 (Implementation Plan)

Цель этого документа: дать агенту-реализатору чёткий, воспроизводимый план изменений баланса, ориентированный на participation (почти все дерутся почти каждый тик), без работы с контентом/рисованием вещей.

Основа telemetry и симуляций: `docs/telemetry_framework.md`.

## 1) Success Criteria (Что считается успехом)

Для прогона `--users 8 --duration-ms 120000` (34 тика при `battleTickIntervalMs=3500`), сравниваем с baseline и между прогонами.

Participation / throughput:
- `avgPairsPerTick >= 3.3` (почти 4 пары/тик, допускается небольшой недобор).
- `avgUnmatchedPerTick <= 1.4`.
- `spread fights` (max fights - min fights) стремиться снизить; первичный таргет: `<= 12` (минимум: стабильно лучше baseline ~`21`).

Match quality:
- `avgAcceptedDelta` не должен неконтролируемо расти; если растёт ради participation, это должно быть явно видно по pass/forced меткам.
- `upsetRate` не должен “схлопнуться”; ориентир: `>= 25%`.

Player viability:
- Не должно стабильно появляться игроков с WR около `0%` при нормальной participation (если игрок дерётся, но всегда проигрывает, игра разваливается).

## 2) Принципы (чтобы не повторить прошлые ошибки)

1. `mmScore` должен отражать только силу (power + маленький jitter). Никаких fairness/participation bias в score.
2. Fairness делается отдельным слоем:
  - порядок выбора “кому искать пару первым”;
  - tie-break’и при выборе кандидата;
  - selective relax порога только для отстающих.
3. Главный приоритет: participation (максимизировать число реальных боёв в тик).

## 3) Matchmaking v3 (Алгоритм)

### 3.1 Термины

- `baseMaxDelta`: стандартный порог совместимости по силе.
- `priorityUser`: игрок, которому “нужно подраться”, чтобы выровнять participation.
- `pass`: попытка подбора пар с некоторыми правилами/порогом.
- `forced_pairing`: последняя мера, когда мы сознательно жертвуем качеством, чтобы не оставить игроков без боёв.

### 3.2 Данные, которые нужны у игрока

- `battlesTotal`: сколько боёв было у игрока.
- `lastBattleTick`: на каком боевом тике игрок последний раз дрался.
- (опционально для progression v2) `winStreak`, `loseStreak`.

### 3.3 `mmScore`

- `mmScore = power + jitter`
- `power` вычисляется как сейчас (или обновлённой формулой, но это отдельная тема).
- `jitter` небольшой, только чтобы не застревали одинаковые очереди.

### 3.4 Приоритеты (fairness order)

Сортировка пользователей для “выбора левой стороны” (кто первым пытается найти пару):
1. меньше `battlesTotal` (игроки с меньшим участием первыми);
2. более старый `lastBattleTick` (дольше без боя — выше приоритет);
3. по `mmScore` (стабильность);
4. по `userId`.

### 3.5 Pass-процедура (максимум пар внутри порога)

Pass 1 (strict):
- Порог `deltaLimit = baseMaxDelta`.
- Для каждого `priorityUser` (по приоритетному порядку) выбираем партнёра с минимальной delta среди ещё не спаренных, при условии `delta <= deltaLimit`.
- Цель: максимум пар при хорошем качестве.

Pass 2 (selective relax for laggards):
- Определить `priority set`:
  - например bottom 25% по `battlesTotal`, или
  - пользователи, у которых `currentTick - lastBattleTick >= N` (например N=2..3).
- Разрешить расширенный порог только если `left` из `priority set`.
  - пример: `deltaLimit = baseMaxDelta + 0.4`, затем `+0.8`.
- Подбор остаётся “минимальная delta”.
- Цель: вытащить отстающих в бои, не ухудшая качество для всех.

Pass 3 (optional forced pairing):
- Включать только если после Pass 2 ещё остаётся значимый unmatched, например:
  - `unmatched >= 2` и
  - `avgPairsPerTick` ниже цели.
- Для `priority set` разрешить `forced_pairing` (самый близкий партнёр без ограничения по delta) но:
  - помечать пару `matchKind: forced`.
  - ограничить число forced пар на тик (например не более 1).
- Цель: participation-страховка, а не норма.

### 3.6 Что логировать по matchmaking (telemetry)

Для каждого тика:
- `matchmaking.passStats[]`:
  - `passIndex`, `deltaLimit`, `onlyPrioritySet`, `pairsAccepted`.
- Для каждой пары:
  - `matchKind`: `strict|relaxed|forced`
  - `deltaLimitUsed`
  - `leftWasPriority`, `rightWasPriority`
- Для каждого unmatched:
  - `unmatchedReason`: `no_candidate_within_base` / `no_candidate_within_relaxed` / `forced_cap_reached` (если есть cap)

## 4) Progression v2 (Anti-snowball без контента)

Задача: уменьшить snowball от уровня и дать камбэки, не ломая участие.

### 4.1 Главный принцип

Награда/штраф зависит от expected outcome.

В бою уже есть `pWin` (вероятность победы конкретного игрока).
- Апсет (победа при низком `pWin`) должна давать больше прогресса.
- Ожидаемая победа (высокий `pWin`) должна давать меньше прогресса.

### 4.2 Уровень: не “всегда +1”

Вариант A (XP модель, рекомендовано):
- Ввести `xp` (накапливаемое) и `level = floor(xp / xpPerLevel)+1`.
- Победитель получает `xpGainWin(pWin)`, проигравший получает `xpGainLoss(pLose)` (маленький).
- Это даёт дробные награды без половинок уровня.

Вариант B (целиком lvl, проще, но грубее):
- `levelGain` выбирается по бакетам `pWin`:
  - апсет: +2
  - умеренная победа: +1
  - ожидаемая победа: +0
- Проигравшему: обычно +0, но при “почти победил” можно +1 раз в X (лучше через XP).

### 4.3 Защита от луз-стрика

Если у игрока `loseStreak >= K`:
- уменьшить шанс даунгрейда предмета;
- уменьшить шанс даунгрейда цвета;
- (опционально) увеличить XP за поражение.

Цель: игрок не должен проваливаться “в яму”, где он только проигрывает и деградирует.

### 4.4 Telemetry для progression

Для winner/loser в каждой battle event:
- `pWinWinner`, `pWinLoser` (или `pWinLeft/pWinRight` и id).
- `levelGain` или `xpGain` + причина (bucket).
- `streakBefore/After` если streak вводится.

## 5) Итерационный процесс (как внедрять и не сломать причинность)

Правило: менять по одному слою за итерацию.

Итерация 1:
- Matchmaking v3 (без изменений progression).
- Прогоны: 1 smoke + 5 полных прогонов `--users 8 --duration-ms 120000`.
- Сравнить метрики из раздела 1.

Итерация 2:
- Progression v2 (уровень/XP + луз-стрик), matchmaking не трогать.
- Те же прогоны/сравнения + смотреть поляризацию WR.

Итерация 3:
- Тонкая настройка коэффициентов (только числа), без изменения структуры.

## 6) Команды для воспроизведения (быстро)

- Сервер telemetry: `npm run serve:logs`
- Smoke: `npm run simulate:battle:smoke`
- Полный прогон: `node scripts/simulate-battle-run.mjs --users 8 --duration-ms 120000`
- Summary: `npm run analyze:telemetry`

