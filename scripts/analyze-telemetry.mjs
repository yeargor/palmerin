import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const telemetryPath = path.join(rootDir, "artifacts", "battle", "battle-events.jsonl");

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const raw = await fs.readFile(telemetryPath, "utf8").catch(() => "");
  const events = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeParse)
    .filter(Boolean);

  const ticks = events.filter((e) => e.type === "battle_tick");
  const finished = events.filter((e) => e.type === "game_finished");

  const fightsByUser = new Map();
  const winsByUser = new Map();
  let totalBattles = 0;

  for (const tick of ticks) {
    for (const battle of tick.battles || []) {
      totalBattles += 1;
      const winner = battle.winnerUserId;
      const loser = battle.loserUserId;
      winsByUser.set(winner, (winsByUser.get(winner) || 0) + 1);
      fightsByUser.set(winner, (fightsByUser.get(winner) || 0) + 1);
      fightsByUser.set(loser, (fightsByUser.get(loser) || 0) + 1);
    }
  }

  const users = [...new Set([...fightsByUser.keys(), ...winsByUser.keys()])].sort((a, b) => a - b);

  console.log(`events=${events.length}`);
  console.log(`battle_ticks=${ticks.length}`);
  console.log(`game_finished_events=${finished.length}`);
  console.log(`total_battles=${totalBattles}`);

  for (const userId of users) {
    const fights = fightsByUser.get(userId) || 0;
    const wins = winsByUser.get(userId) || 0;
    const wr = fights > 0 ? wins / fights : 0;
    console.log(`user_${userId}: fights=${fights} wins=${wins} wr=${pct(wr)}`);
  }

  const finalBoard = finished[finished.length - 1]?.leaderboard || ticks[ticks.length - 1]?.leaderboardAfter || [];
  if (finalBoard.length) {
    console.log("final_leaderboard:");
    for (const row of finalBoard) {
      console.log(`  #${row.rating} u${row.userId} lvl=${row.level} hp=${row.hp} atk=${row.attack} pwr=${row.power.toFixed(3)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
