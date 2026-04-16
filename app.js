const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const profileByParam = {
  club: {
    id: 42,
    name: "ANIME WARRIOR",
    level: 1,
    rating: 1250,
    rarity: "rare",
    stats: {
      hp: "HP 42",
      str: "STR 3",
      dex: "DEX 8",
      luck: "LUK 12",
    },
    equipment: {
      leftHand: "Wood Shield",
      rightHand: "Rust Sword",
      body: "Empty",
    },
    logs: [
      { time: "21:00", type: "info", text: "arena entry" },
      { time: "21:05", type: "event", text: "bar detour" },
    ],
  },
  ghost: {
    id: 77,
    name: "NOISE WARDEN",
    level: 2,
    rating: 1308,
    rarity: "epic",
    stats: {
      hp: "HP 39",
      str: "STR 4",
      dex: "DEX 9",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Iron Buckler",
      rightHand: "Needle Blade",
      body: "Patch Vest",
    },
    logs: [
      { time: "21:02", type: "info", text: "crowd scan" },
      { time: "21:06", type: "event", text: "quick dodge" },
    ],
  },
};

const logPool = [
  "light hit",
  "missed attack",
  "found loot",
  "guard stance",
  "quick step",
  "power swing",
  "target locked",
];

const rarityToCssVar = {
  common: "var(--common)",
  uncommon: "var(--uncommon)",
  rare: "var(--rare)",
  epic: "var(--epic)",
  legendary: "var(--legendary)",
};

function getStartParam() {
  const url = new URL(window.location.href);
  const urlParam =
    url.searchParams.get("startapp") ||
    url.searchParams.get("start_param") ||
    url.searchParams.get("profile");

  return tg?.initDataUnsafe?.start_param || urlParam || "club";
}

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const selectedProfile = profileByParam[getStartParam()] || profileByParam.club;
const state = {
  ...selectedProfile,
  logs: [...selectedProfile.logs],
};

const characterNameEl = document.getElementById("characterName");
const characterMetaEl = document.getElementById("characterMeta");
const leftHandEl = document.getElementById("leftHand");
const rightHandEl = document.getElementById("rightHand");
const bodySlotEl = document.getElementById("bodySlot");
const statsRowEl = document.getElementById("statsRow");
const logContainerEl = document.getElementById("logContainer");
const logListEl = document.getElementById("logList");
const spriteEl = document.querySelector(".sprite");

function renderHeader() {
  characterNameEl.textContent = state.name;
  characterMetaEl.textContent = `Lv ${state.level} • Rating ${state.rating}`;
  leftHandEl.textContent = `[${state.equipment.leftHand}]`;
  rightHandEl.textContent = `[${state.equipment.rightHand}]`;
  bodySlotEl.textContent = `[${state.equipment.body}]`;

  spriteEl.style.color = rarityToCssVar[state.rarity] || "var(--rare)";
}

function renderStats() {
  statsRowEl.innerHTML = "";

  const stats = [state.stats.hp, state.stats.str, state.stats.dex, state.stats.luck];

  for (const value of stats) {
    const statEl = document.createElement("div");
    statEl.className = "stat";
    if (value.startsWith("HP")) {
      statEl.classList.add("stat-hp");
    }
    statEl.textContent = value;
    statsRowEl.appendChild(statEl);
  }
}

function renderLogs() {
  logListEl.innerHTML = "";

  for (const [index, item] of state.logs.entries()) {
    const row = document.createElement("li");
    row.className = "log-item";
    if (index === state.logs.length - 1) {
      row.classList.add("log-newest");
    }

    const time = document.createElement("span");
    time.className = "log-time";
    time.textContent = item.time;

    const text = document.createElement("span");
    text.className = "log-text";
    text.textContent = item.text;

    row.append(time, text);
    logListEl.appendChild(row);
  }

  logContainerEl.scrollTop = logContainerEl.scrollHeight;
}

function pushRandomLog() {
  const randomText = logPool[Math.floor(Math.random() * logPool.length)];

  state.logs.push({
    time: nowTime(),
    type: "event",
    text: randomText,
  });
  state.logs = state.logs.slice(-5);

  renderLogs();
}

renderHeader();
renderStats();
renderLogs();

window.setInterval(pushRandomLog, 10000);
