const BATTLE_POWER_K = 1;
const BATTLE_W_LVL = 0.6;

export const MAX_STORED_LOGS_PER_USER = 20;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pickRandomFrom(items, fallback = null) {
  if (!Array.isArray(items) || !items.length) {
    return fallback;
  }
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function shuffle(list) {
  const clone = [...list];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export function computeBattlePower(level, hp, attack) {
  const safeLevel = Number(level) || 0;
  const safeHp = Math.max(1, Number(hp) || 1);
  const safeAttack = Math.max(1, Number(attack) || 1);
  return (safeAttack / (safeHp + BATTLE_POWER_K)) + (safeHp / (safeAttack + BATTLE_POWER_K)) + (BATTLE_W_LVL * safeLevel);
}

export function buildLeaderboardEntries(users) {
  const entries = users.map((user) => {
    const level = Math.max(1, Number(user.level) || 1);
    const hp = Math.max(1, Number(user.hp) || 1);
    const attack = Math.max(1, Number(user.attack) || 1);
    const power = computeBattlePower(level, hp, attack);
    return {
      userId: user.id,
      classId: user.classId,
      name: user.name,
      level,
      hp,
      attack,
      power,
    };
  });
  entries.sort((a, b) => b.power - a.power || b.level - a.level || b.attack - a.attack || a.userId - b.userId);
  return entries.map((entry, index) => ({ ...entry, rating: index + 1 }));
}

export function applyRatingsFromLeaderboard(users, leaderboard) {
  const byUserId = new Map(leaderboard.map((entry) => [entry.userId, entry.rating]));
  for (const user of users) {
    user.rating = byUserId.get(user.id) || 0;
  }
}

export function pushUserLog(user, logItem) {
  const current = Array.isArray(user.logs) ? user.logs : [];
  const next = [...current, logItem];
  user.logs = next.slice(-MAX_STORED_LOGS_PER_USER);
}

function buildSystemLogText() {
  return pickRandomFrom(['arena sync', 'match queue ready', 'signal stable'], 'arena sync');
}

const victoryPhrases = [
  'победа: забрал инициативу',
  'победа: выдержал натиск',
  'победа: поймал тайминг',
  'победа: заблокировал серию',
  'победа: контратака прошла',
];

const defeatPhrases = [
  'поражение: не удержал темп',
  'поражение: пропустил серию',
  'поражение: позиция потеряна',
  'поражение: защита раскрыта',
  'поражение: ошибка в размене',
];

function ensureCombatBounds(user) {
  user.level = clamp(Math.max(1, Number(user.level) || 1), 1, 999);
  user.hp = clamp(Math.max(1, Number(user.hp) || 1), 1, 10);
  user.attack = clamp(Math.max(1, Number(user.attack) || 1), 1, 10);
}

function applyWinnerProgress(winner, loser) {
  winner.level += 1;

  // Mild progression to avoid explosive stat drift.
  if (Math.random() < 0.3) {
    winner.hp = clamp(winner.hp + 1, 1, 10);
  }
  if (Math.random() < 0.3) {
    winner.attack = clamp(winner.attack + 1, 1, 10);
  }

  // Mild loser pressure with floor guard.
  if (Math.random() < 0.15) {
    loser.hp = clamp(loser.hp - 1, 1, 10);
  }
  if (Math.random() < 0.15) {
    loser.attack = clamp(loser.attack - 1, 1, 10);
  }
}

export function runSystemTick(users) {
  const text = buildSystemLogText();
  for (const user of users) {
    pushUserLog(user, {
      time: nowTime(),
      type: 'system',
      text,
    });
  }
}

export function runBattleTick(users) {
  if (!Array.isArray(users) || users.length < 2) {
    return { fights: 0, pairs: [] };
  }

  const queue = shuffle(users);
  const pairs = [];
  for (let index = 0; index < queue.length - 1; index += 2) {
    pairs.push([queue[index], queue[index + 1]]);
  }

  for (const [left, right] of pairs) {
    ensureCombatBounds(left);
    ensureCombatBounds(right);

    const leftPower = computeBattlePower(left.level, left.hp, left.attack);
    const rightPower = computeBattlePower(right.level, right.hp, right.attack);
    const leftWinChance = leftPower / (leftPower + rightPower);
    const leftWon = Math.random() < leftWinChance;
    const winner = leftWon ? left : right;
    const loser = leftWon ? right : left;

    applyWinnerProgress(winner, loser);
    ensureCombatBounds(winner);
    ensureCombatBounds(loser);

    pushUserLog(winner, {
      time: nowTime(),
      type: 'combat',
      combatResult: 'victory',
      text: pickRandomFrom(victoryPhrases, 'победа: бой завершен'),
    });
    pushUserLog(loser, {
      time: nowTime(),
      type: 'combat',
      combatResult: 'defeat',
      text: pickRandomFrom(defeatPhrases, 'поражение: бой завершен'),
    });
  }

  const leaderboard = buildLeaderboardEntries(users);
  applyRatingsFromLeaderboard(users, leaderboard);
  return {
    fights: pairs.length,
    pairs: pairs.map(([left, right]) => [left.id, right.id]),
    leaderboard,
  };
}
