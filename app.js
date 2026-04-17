const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const profileByParam = {
  club: {
    id: 42,
    classId: "warrior",
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
    replies: [
      { classId: "warrior", logType: "event", text: "Steel first always" },
    ],
  },
  ghost: {
    id: 77,
    classId: "warrior",
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
    replies: [
      { classId: "warrior", logType: "event", text: "Steel first always" },
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
const fighterQuoteEl = document.getElementById("fighterQuote");
const heroSectionEl = document.getElementById("heroSection");
const fighterStageEl = document.querySelector(".fighter-stage");
const logoWrapEl = document.querySelector(".game-logo-wrap");
const logoEl = document.querySelector(".game-logo");

class CharacterEntity {
  constructor({ id, classId, replies }) {
    this.id = id;
    this.classId = classId;
    this.replies = Array.isArray(replies) ? replies : [];
  }

  getReplyForLogType(logType) {
    const classAndType = this.replies.find(
      (reply) => reply.classId === this.classId && reply.logType === logType,
    );
    if (classAndType) {
      return classAndType.text;
    }

    const classFallback = this.replies.find((reply) => reply.classId === this.classId);
    return classFallback?.text || "";
  }
}

class ReplyTypewriter {
  constructor({
    targetEl,
    minDelayMs = 10,
    maxDelayMs = 48,
    minPauseCount = 1,
    maxPauseCount = 3,
    minPauseMs = 120,
    maxPauseMs = 280,
    zeroHoldMs = 1000,
  }) {
    this.targetEl = targetEl;
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.minPauseCount = minPauseCount;
    this.maxPauseCount = maxPauseCount;
    this.minPauseMs = minPauseMs;
    this.maxPauseMs = maxPauseMs;
    this.zeroHoldMs = zeroHoldMs;
    this.timer = null;
    this.currentText = "";
    this.currentIndex = 0;
    this.textEl = null;
    this.nextText = "";
    this.mode = "idle";
    this.stepIndex = 0;
    this.pauseIndices = [];
    this.pauseSet = new Set();
    this.segmentProfiles = [];
    this.step = this.step.bind(this);
  }

  randomInt(min, max) {
    if (max <= min) {
      return min;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  randomPauseDelay() {
    return this.randomInt(this.minPauseMs, this.maxPauseMs);
  }

  buildPausePlan(textLength) {
    const maxByLength = Math.max(0, Math.floor(textLength / 8));
    const allowedMax = Math.min(this.maxPauseCount, maxByLength);
    const allowedMin = Math.min(this.minPauseCount, allowedMax);
    const pauseCount = this.randomInt(allowedMin, allowedMax);

    if (pauseCount <= 0 || textLength < 6) {
      this.pauseIndices = [];
      this.pauseSet = new Set();
      this.segmentProfiles = [this.buildSegmentProfile()];
      return;
    }

    const startIndex = Math.max(1, Math.floor(textLength * 0.18));
    const endIndex = Math.max(startIndex, Math.floor(textLength * 0.85));
    const indices = [];
    const used = new Set();

    while (indices.length < pauseCount) {
      const idx = this.randomInt(startIndex, endIndex);
      if (used.has(idx)) {
        continue;
      }
      used.add(idx);
      indices.push(idx);
    }

    indices.sort((a, b) => a - b);
    this.pauseIndices = indices;
    this.pauseSet = new Set(indices);
    this.segmentProfiles = Array.from(
      { length: this.pauseIndices.length + 1 },
      () => this.buildSegmentProfile(),
    );
  }

  buildSegmentProfile() {
    const base = this.randomInt(this.minDelayMs, this.maxDelayMs);
    const jitter = Math.max(2, Math.floor((this.maxDelayMs - this.minDelayMs) * 0.2));
    return { base, jitter };
  }

  currentSegmentIndex(stepIndex) {
    let segment = 0;
    while (
      segment < this.pauseIndices.length &&
      stepIndex >= this.pauseIndices[segment]
    ) {
      segment += 1;
    }
    return segment;
  }

  randomTypingDelay(stepIndex) {
    const segmentIndex = this.currentSegmentIndex(stepIndex);
    const profile =
      this.segmentProfiles[segmentIndex] ||
      this.segmentProfiles[this.segmentProfiles.length - 1] ||
      this.buildSegmentProfile();
    const jitterOffset = this.randomInt(-profile.jitter, profile.jitter);
    return this.clamp(
      profile.base + jitterOffset,
      this.minDelayMs,
      this.maxDelayMs,
    );
  }

  ensureQuoteNodes() {
    if (!this.targetEl) {
      return false;
    }
    if (!this.textEl) {
      this.targetEl.innerHTML =
        '<span class="fighter-quote-text"></span><span class="fighter-quote-cursor" aria-hidden="true">|</span>';
      this.textEl = this.targetEl.querySelector(".fighter-quote-text");
    }
    return Boolean(this.textEl);
  }

  clearTimer() {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleNextStep(stepIndex) {
    const delay = this.pauseSet.has(stepIndex)
      ? this.randomPauseDelay()
      : this.randomTypingDelay(stepIndex);
    this.timer = window.setTimeout(this.step, delay);
  }

  startTyping(text) {
    if (!this.ensureQuoteNodes()) {
      return;
    }

    this.clearTimer();
    this.mode = "typing";
    this.currentText = text || "";
    this.currentIndex = 0;
    this.stepIndex = 0;
    this.buildPausePlan(this.currentText.length);
    this.textEl.textContent = "";
    this.step();
  }

  eraseAndType(nextText) {
    if (!this.ensureQuoteNodes()) {
      return;
    }

    this.clearTimer();
    const visibleText = this.textEl.textContent || "";

    if (!visibleText.length) {
      this.startTyping(nextText);
      return;
    }

    this.mode = "erasing";
    this.currentText = visibleText;
    this.currentIndex = visibleText.length;
    this.stepIndex = 0;
    this.nextText = nextText || "";
    this.buildPausePlan(this.currentText.length);
    this.step();
  }

  step() {
    if (!this.targetEl || !this.textEl) {
      return;
    }

    if (this.mode === "typing") {
      if (this.currentIndex >= this.currentText.length) {
        this.mode = "idle";
        return;
      }

      this.textEl.textContent += this.currentText[this.currentIndex];
      this.currentIndex += 1;
      const stepIndex = this.stepIndex;
      this.stepIndex += 1;
      this.scheduleNextStep(stepIndex);
      return;
    }

    if (this.mode === "erasing") {
      if (this.currentIndex <= 0) {
        this.timer = window.setTimeout(() => {
          this.startTyping(this.nextText);
        }, this.zeroHoldMs);
        return;
      }

      this.currentIndex -= 1;
      this.textEl.textContent = this.currentText.slice(0, this.currentIndex);
      const stepIndex = this.stepIndex;
      this.stepIndex += 1;
      this.scheduleNextStep(stepIndex);
    }
  }

  render(text) {
    this.textEl = null;
    this.startTyping(text);
  }
}

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

  const lastLogType = state.logs[state.logs.length - 1]?.type || "info";
  const nextReply = character.getReplyForLogType(lastLogType);
  replyTypewriter.eraseAndType(nextReply);
}

function centerFighterToViewport() {
  if (!heroSectionEl || !fighterStageEl || !spriteEl) {
    return;
  }

  fighterStageEl.style.marginTop = "0px";

  const viewportCenterY = window.innerHeight / 2;
  const heroBottomY = heroSectionEl.getBoundingClientRect().bottom;
  const stageHeight = fighterStageEl.getBoundingClientRect().height;
  const spriteHeight = spriteEl.getBoundingClientRect().height;
  const spriteBottomOffset = Number.parseFloat(getComputedStyle(spriteEl).bottom) || 0;

  const spriteCenterY = heroBottomY + stageHeight - spriteBottomOffset - spriteHeight / 2;
  const correction = viewportCenterY - spriteCenterY;

  fighterStageEl.style.marginTop = `${Math.round(correction)}px`;
}

function fitLogoToViewport() {
  if (!logoWrapEl || !logoEl) {
    return;
  }

  logoEl.style.transform = "scale(1)";
  const wrapWidth = logoWrapEl.clientWidth;
  const logoWidth = logoEl.scrollWidth;

  if (!wrapWidth || !logoWidth) {
    return;
  }

  const scale = Math.min(1, wrapWidth / logoWidth);
  logoEl.style.transform = `scale(${scale})`;
}

renderHeader();
renderStats();
renderLogs();

const character = new CharacterEntity({
  id: state.id,
  classId: state.classId || "warrior",
  replies: state.replies || [],
});
const lastLogType = state.logs[state.logs.length - 1]?.type || "info";
const initialReply = character.getReplyForLogType(lastLogType);
const replyTypewriter = new ReplyTypewriter({
  targetEl: fighterQuoteEl,
});
replyTypewriter.render(initialReply);

centerFighterToViewport();
fitLogoToViewport();

window.addEventListener("resize", centerFighterToViewport);
window.addEventListener("orientationchange", centerFighterToViewport);
window.addEventListener("resize", fitLogoToViewport);
window.addEventListener("orientationchange", fitLogoToViewport);
window.setTimeout(centerFighterToViewport, 80);
window.setTimeout(fitLogoToViewport, 80);

window.setInterval(pushRandomLog, 10000);
