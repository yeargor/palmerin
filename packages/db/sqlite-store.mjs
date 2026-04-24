import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

function resolveDatabasePath(databaseUrl) {
  const raw = String(databaseUrl || '').trim();
  if (!raw) {
    return path.resolve(process.cwd(), 'data/dev.sqlite');
  }
  if (raw.startsWith('file:')) {
    const filePath = raw.slice('file:'.length);
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function safeParseJson(raw, fallback) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function createSqliteStore({ databaseUrl }) {
  const dbPath = resolveDatabasePath(databaseUrl);
  ensureParentDir(dbPath);
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER UNIQUE,
      telegram_username TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      class_id TEXT NOT NULL,
      template_key TEXT NOT NULL,
      name TEXT NOT NULL,
      level INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      hp INTEGER NOT NULL,
      attack INTEGER NOT NULL,
      color_tier TEXT NOT NULL,
      adjective TEXT NOT NULL DEFAULT '',
      components_json TEXT NOT NULL DEFAULT '{}',
      logs_json TEXT NOT NULL DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      finished INTEGER NOT NULL,
      battles_started INTEGER NOT NULL,
      winner_user_id INTEGER,
      frozen_leaderboard_json TEXT NOT NULL,
      leaderboard_hidden_values INTEGER NOT NULL DEFAULT 0,
      leaderboard_reveal_top_five INTEGER NOT NULL DEFAULT 0,
      telemetry_run_id INTEGER NOT NULL,
      telemetry_tick_id INTEGER NOT NULL,
      last_system_log_at INTEGER NOT NULL,
      last_battle_tick_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const usersColumns = db.prepare('PRAGMA table_info(users);').all();
  const hasComponentsJson = usersColumns.some((column) => column?.name === 'components_json');
  if (!hasComponentsJson) {
    db.exec("ALTER TABLE users ADD COLUMN components_json TEXT NOT NULL DEFAULT '{}';");
  }
  const hasTelegramUsername = usersColumns.some((column) => column?.name === 'telegram_username');
  if (!hasTelegramUsername) {
    db.exec("ALTER TABLE users ADD COLUMN telegram_username TEXT NOT NULL DEFAULT '';");
  }
  const gameStateColumns = db.prepare('PRAGMA table_info(game_state);').all();
  const hasLeaderboardHiddenValues = gameStateColumns.some((column) => column?.name === 'leaderboard_hidden_values');
  if (!hasLeaderboardHiddenValues) {
    db.exec('ALTER TABLE game_state ADD COLUMN leaderboard_hidden_values INTEGER NOT NULL DEFAULT 0;');
  }
  const hasLeaderboardRevealTopFive = gameStateColumns.some((column) => column?.name === 'leaderboard_reveal_top_five');
  if (!hasLeaderboardRevealTopFive) {
    db.exec('ALTER TABLE game_state ADD COLUMN leaderboard_reveal_top_five INTEGER NOT NULL DEFAULT 0;');
  }

  const seedStateStmt = db.prepare(`
    INSERT INTO game_state (
      id, finished, battles_started, winner_user_id, frozen_leaderboard_json,
      leaderboard_hidden_values, leaderboard_reveal_top_five,
      telemetry_run_id, telemetry_tick_id, last_system_log_at, last_battle_tick_at, updated_at
    ) VALUES (1, 0, 0, NULL, '[]', 0, 0, 0, 0, 0, 0, ?)
    ON CONFLICT(id) DO NOTHING;
  `);
  seedStateStmt.run(new Date().toISOString());

  const selectUsersStmt = db.prepare(`
    SELECT id, telegram_user_id, telegram_username, role, class_id, template_key, name, level, rating, hp, attack,
           color_tier, adjective, components_json, logs_json, created_by, created_at
    FROM users
    ORDER BY id ASC;
  `);

  const upsertUserStmt = db.prepare(`
    INSERT INTO users (
      id, telegram_user_id, telegram_username, role, class_id, template_key, name, level, rating, hp, attack,
      color_tier, adjective, components_json, logs_json, created_by, created_at
    ) VALUES (
      @id, @telegramUserId, @telegramUsername, @role, @classId, @templateKey, @name, @level, @rating, @hp, @attack,
      @colorTier, @adjective, @componentsJson, @logsJson, @createdBy, @createdAt
    )
    ON CONFLICT(id) DO UPDATE SET
      telegram_user_id = excluded.telegram_user_id,
      telegram_username = excluded.telegram_username,
      role = excluded.role,
      class_id = excluded.class_id,
      template_key = excluded.template_key,
      name = excluded.name,
      level = excluded.level,
      rating = excluded.rating,
      hp = excluded.hp,
      attack = excluded.attack,
      color_tier = excluded.color_tier,
      adjective = excluded.adjective,
      components_json = excluded.components_json,
      logs_json = excluded.logs_json,
      created_by = excluded.created_by,
      created_at = excluded.created_at;
  `);

  const deleteAllUsersStmt = db.prepare('DELETE FROM users;');
  const resetSequenceStmt = db.prepare("DELETE FROM sqlite_sequence WHERE name = 'users';");

  const selectGameStateStmt = db.prepare(`
    SELECT id, finished, battles_started, winner_user_id, frozen_leaderboard_json,
           leaderboard_hidden_values, leaderboard_reveal_top_five,
           telemetry_run_id, telemetry_tick_id, last_system_log_at, last_battle_tick_at, updated_at
    FROM game_state
    WHERE id = 1;
  `);

  const updateGameStateStmt = db.prepare(`
    UPDATE game_state SET
      finished = @finished,
      battles_started = @battlesStarted,
      winner_user_id = @winnerUserId,
      frozen_leaderboard_json = @frozenLeaderboardJson,
      leaderboard_hidden_values = @leaderboardHiddenValues,
      leaderboard_reveal_top_five = @leaderboardRevealTopFive,
      telemetry_run_id = @telemetryRunId,
      telemetry_tick_id = @telemetryTickId,
      last_system_log_at = @lastSystemLogAt,
      last_battle_tick_at = @lastBattleTickAt,
      updated_at = @updatedAt
    WHERE id = 1;
  `);

  const txReplaceUsers = db.transaction((users) => {
    deleteAllUsersStmt.run();
    resetSequenceStmt.run();
    for (const user of users) {
      upsertUserStmt.run({
        id: user.id,
        telegramUserId: Number.isFinite(user.telegramUserId) ? user.telegramUserId : null,
        telegramUsername: String(user.telegramUsername || ''),
        role: user.role || 'user',
        classId: user.classId,
        templateKey: user.templateKey,
        name: user.name,
        level: user.level,
        rating: user.rating,
        hp: user.hp,
        attack: user.attack,
        colorTier: user.colorTier,
        adjective: user.adjective || '',
        componentsJson: JSON.stringify(user.components && typeof user.components === 'object' ? user.components : {}),
        logsJson: JSON.stringify(Array.isArray(user.logs) ? user.logs : []),
        createdBy: user.createdBy || 'system',
        createdAt: user.createdAt || new Date().toISOString(),
      });
    }
  });

  function readUsers() {
    const rows = selectUsersStmt.all();
    return rows.map((row) => ({
      id: Number(row.id),
      telegramUserId: Number.isFinite(row.telegram_user_id) ? Number(row.telegram_user_id) : null,
      telegramUsername: String(row.telegram_username || ''),
      role: row.role,
      classId: row.class_id,
      templateKey: row.template_key,
      name: row.name,
      level: Number(row.level),
      rating: Number(row.rating),
      hp: Number(row.hp),
      attack: Number(row.attack),
      colorTier: row.color_tier,
      adjective: row.adjective || '',
      components: safeParseJson(row.components_json, {}),
      logs: safeParseJson(row.logs_json, []),
      createdBy: row.created_by,
      createdAt: row.created_at,
    }));
  }

  function writeUsers(users) {
    txReplaceUsers(users);
  }

  function readGameState() {
    const row = selectGameStateStmt.get();
    return {
      finished: Boolean(row?.finished),
      battlesStarted: Boolean(row?.battles_started),
      winnerUserId: Number.isFinite(row?.winner_user_id) ? Number(row.winner_user_id) : null,
      frozenLeaderboard: safeParseJson(row?.frozen_leaderboard_json, []),
      leaderboardDisplay: {
        hiddenValues: Boolean(row?.leaderboard_hidden_values),
        revealTopFive: Boolean(row?.leaderboard_reveal_top_five),
      },
      telemetryRunId: Math.max(0, Number(row?.telemetry_run_id) || 0),
      telemetryTickId: Math.max(0, Number(row?.telemetry_tick_id) || 0),
      lastSystemLogAt: Math.max(0, Number(row?.last_system_log_at) || 0),
      lastBattleTickAt: Math.max(0, Number(row?.last_battle_tick_at) || 0),
      updatedAt: row?.updated_at || new Date().toISOString(),
    };
  }

  function writeGameState(gameState) {
    updateGameStateStmt.run({
      finished: gameState.finished ? 1 : 0,
      battlesStarted: gameState.battlesStarted ? 1 : 0,
      winnerUserId: Number.isFinite(gameState.winnerUserId) ? gameState.winnerUserId : null,
      frozenLeaderboardJson: JSON.stringify(Array.isArray(gameState.frozenLeaderboard) ? gameState.frozenLeaderboard : []),
      leaderboardHiddenValues: gameState?.leaderboardDisplay?.hiddenValues ? 1 : 0,
      leaderboardRevealTopFive: gameState?.leaderboardDisplay?.revealTopFive ? 1 : 0,
      telemetryRunId: Math.max(0, Number(gameState.telemetryRunId) || 0),
      telemetryTickId: Math.max(0, Number(gameState.telemetryTickId) || 0),
      lastSystemLogAt: Math.max(0, Number(gameState.lastSystemLogAt) || 0),
      lastBattleTickAt: Math.max(0, Number(gameState.lastBattleTickAt) || 0),
      updatedAt: new Date().toISOString(),
    });
  }

  function close() {
    db.close();
  }

  return {
    dbPath,
    readUsers,
    writeUsers,
    readGameState,
    writeGameState,
    close,
  };
}
