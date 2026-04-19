import {
  SPRITE_GRID_WIDTH,
  SPRITE_MIN_GRID_HEIGHT,
  characterPresetByClassId,
  buildRandomPreset,
  renderPresetToSprite,
} from "./src/sprite-constructor.js";

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
  mage: {
    id: 88,
    classId: "mage",
    name: "ARCANE HERMIT",
    level: 1,
    rating: 1211,
    rarity: "rare",
    stats: {
      hp: "HP 36",
      str: "STR 2",
      dex: "DEX 10",
      luck: "LUK 11",
    },
    equipment: {
      leftHand: "Empty",
      rightHand: "Oak Staff",
      body: "Cloth Hood",
    },
    logs: [
      { time: "21:03", type: "info", text: "mana check" },
      { time: "21:07", type: "event", text: "rune whisper" },
    ],
    replies: [{ classId: "mage", logType: "event", text: "Arcane flow stable" }],
  },
  cowboy: {
    id: 99,
    classId: "cowboy",
    name: "DUST RANGER",
    level: 1,
    rating: 1224,
    rarity: "rare",
    stats: {
      hp: "HP 40",
      str: "STR 4",
      dex: "DEX 9",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Iron Revolver",
      rightHand: "Short Revolver",
      body: "Dust Poncho",
    },
    logs: [
      { time: "21:04", type: "info", text: "saloon watch" },
      { time: "21:08", type: "event", text: "dual draw" },
    ],
    replies: [{ classId: "cowboy", logType: "event", text: "Keep your hands visible" }],
  },
  random: {
    id: 111,
    classId: "random",
    name: "WILD MIX",
    level: 1,
    rating: 1199,
    rarity: "rare",
    stats: {
      hp: "HP 38",
      str: "STR 3",
      dex: "DEX 10",
      luck: "LUK 10",
    },
    equipment: {
      leftHand: "Mixed Gear",
      rightHand: "Mixed Gear",
      body: "Mixed Outfit",
    },
    logs: [
      { time: "21:09", type: "info", text: "parts shuffled" },
      { time: "21:10", type: "event", text: "build locked" },
    ],
    replies: [{ classId: "random", logType: "event", text: "Loadout is unstable" }],
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

let latestRenderedSpriteMeta = {
  lines: Array.from({ length: SPRITE_MIN_GRID_HEIGHT }, () => "".padEnd(SPRITE_GRID_WIDTH, " ")),
  width: SPRITE_GRID_WIDTH,
  height: SPRITE_MIN_GRID_HEIGHT,
};

function getStartParam() {
  const url = new URL(window.location.href);
  const urlParam =
    url.searchParams.get("startapp") ||
    url.searchParams.get("start_param") ||
    url.searchParams.get("profile");

  return tg?.initDataUnsafe?.start_param || urlParam || "club";
}

function isSpriteDebugMode() {
  const url = new URL(window.location.href);
  return url.searchParams.get("debugSprite") === "1";
}

function nowTime() {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isProfileSelectorMode() {
  const url = new URL(window.location.href);
  return url.searchParams.get("view") === "profiles";
}

const requestedProfileParam = getStartParam();
const activeProfileParam = profileByParam[requestedProfileParam] ? requestedProfileParam : "club";
const selectedProfile = profileByParam[activeProfileParam];
const spriteDebugMode = isSpriteDebugMode();
const state = {
  ...selectedProfile,
  logs: [...selectedProfile.logs],
};
const randomPreset = buildRandomPreset();

const characterNameEl = document.getElementById("characterName");
const characterMetaEl = document.getElementById("characterMeta");
const hatSlotEl = document.getElementById("hatSlot");
const armsSlotEl = document.getElementById("armsSlot");
const torsoSlotEl = document.getElementById("torsoSlot");
const legsSlotEl = document.getElementById("legsSlot");
const statsRowEl = document.getElementById("statsRow");
const logContainerEl = document.getElementById("logContainer");
const logListEl = document.getElementById("logList");
const spriteEl = document.querySelector(".sprite");
const fighterQuoteEl = document.getElementById("fighterQuote");
const heroSectionEl = document.getElementById("heroSection");
const fighterStageEl = document.querySelector(".fighter-stage");
const logoWrapEl = document.querySelector(".game-logo-wrap");
const logoEl = document.querySelector(".game-logo");
const closeAsciiBtnEl = document.getElementById("closeAsciiBtn");
let character = null;
let replyTypewriter = null;

const componentNameRuById = {
  hat_warrior: "Шлем",
  hat_mage: "Шляпа волшебника",
  hat_cowboy: "Ковбойская шляпа",
  arms_warrior: "Щит и меч",
  arms_mage: "Рубаха",
  arms_mage_mantle_top: "Магическое ожерелье",
  arms_cowboy: "Револьверы",
  torso_warrior: "Кираса",
  torso_mage: "Мантия",
  torso_mage_mantle_bottom: "Мантия колдуна",
  torso_cowboy: "Ремень охотника",
  legs_boots: "Ботинки",
};

function openProfileSelectorPage() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "profiles");
  url.searchParams.set("startapp", activeProfileParam);
  window.location.href = url.toString();
}

function openProfilePage(profileParam) {
  const nextParam = profileByParam[profileParam] ? profileParam : "club";
  const url = new URL(window.location.href);
  url.searchParams.set("startapp", nextParam);
  url.searchParams.delete("view");
  window.location.href = url.toString();
}

function renderProfileSelectorPage() {
  const appRootEl = document.getElementById("appRoot");
  if (!appRootEl) {
    return;
  }

  document.body.classList.add("profile-selector-mode");

  appRootEl.innerHTML = `
    <section class="profile-selector-screen" aria-label="Profile Selector">
      <pre class="profile-selector-title">$ profiles/</pre>
      <div class="profile-selector-list" id="profileSelectorList"></div>
    </section>
  `;

  const listEl = document.getElementById("profileSelectorList");
  if (!listEl) {
    return;
  }

  const profileEntries = Object.entries(profileByParam);
  for (const [key, profile] of profileEntries) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "profile-selector-item";
    if (key === activeProfileParam) {
      row.classList.add("profile-selector-item-active");
    }
    row.textContent = `----------  ${profile.classId.padEnd(7, " ")}  ${key}`;
    row.setAttribute("aria-label", `Open profile ${key}`);
    row.addEventListener("click", () => openProfilePage(key));
    listEl.appendChild(row);
  }
}

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
    onUpdate = null,
  }) {
    this.targetEl = targetEl;
    this.minDelayMs = minDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.minPauseCount = minPauseCount;
    this.maxPauseCount = maxPauseCount;
    this.minPauseMs = minPauseMs;
    this.maxPauseMs = maxPauseMs;
    this.zeroHoldMs = zeroHoldMs;
    this.onUpdate = onUpdate;
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
      if (typeof this.onUpdate === "function") {
        this.onUpdate();
      }
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
      if (typeof this.onUpdate === "function") {
        this.onUpdate();
      }
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
  const preset =
    state.classId === "random"
      ? randomPreset
      : characterPresetByClassId[state.classId] || characterPresetByClassId.warrior;
  const getLabel = (componentId) => componentNameRuById[componentId] || "неизвестно";

  characterNameEl.textContent = state.name;
  characterMetaEl.textContent = `Lv ${state.level} • Rating ${state.rating}`;
  hatSlotEl.textContent = `[${getLabel(preset.hat)}]`;
  armsSlotEl.textContent = `[${getLabel(preset.arms)}]`;
  torsoSlotEl.textContent = `[${getLabel(preset.torso)}]`;
  legsSlotEl.textContent = `[${getLabel(preset.legs)}]`;

  spriteEl.style.color = rarityToCssVar[state.rarity] || "var(--rare)";
  try {
    const rendered = renderPresetToSprite(preset, state.classId);
    latestRenderedSpriteMeta = rendered;
    spriteEl.innerHTML = `<span class="sprite-grid-content">${rendered.html}</span>`;
  } catch (error) {
    console.error("Sprite preset validation failed:", error);
    const rendered = renderPresetToSprite(characterPresetByClassId.warrior, "warrior");
    latestRenderedSpriteMeta = rendered;
    spriteEl.innerHTML = `<span class="sprite-grid-content">${rendered.html}</span>`;
  }
}

function renderSpriteDebugPanel() {
  if (!spriteDebugMode || !spriteEl || !fighterStageEl) {
    return;
  }

  document.body.classList.add("sprite-debug-mode");

  const existingPanel = document.querySelector(".sprite-debug-panel");
  existingPanel?.remove();

  const lines =
    latestRenderedSpriteMeta?.lines?.map((line) => line.padEnd(latestRenderedSpriteMeta.width, " ")) ||
    [];
  const maxLength = latestRenderedSpriteMeta?.width || SPRITE_GRID_WIDTH;
  const gridHeight = latestRenderedSpriteMeta?.height || Math.max(lines.length, SPRITE_MIN_GRID_HEIGHT);
  const axisIndex = Math.floor((maxLength - 1) / 2);
  const marker = `${" ".repeat(axisIndex)}|${" ".repeat(Math.max(0, maxLength - axisIndex - 1))}`;
  const spriteRect = spriteEl.getBoundingClientRect();
  const stageRect = fighterStageEl.getBoundingClientRect();
  const spriteStyle = getComputedStyle(spriteEl);
  const htmlStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);

  const measureText = document.createElement("span");
  measureText.className = "sprite-debug-measure";
  document.body.append(measureText);

  const measureSample = (sample) => {
    measureText.textContent = sample || " ";
    return Number(measureText.getBoundingClientRect().width.toFixed(3));
  };

  const glyphSamples = [" ", "/", "\\", "_", ".", "·", "(", ")", "^", "|", "A", "0"];
  const glyphWidths = glyphSamples.map((sample) => {
    const label = sample === " " ? "space" : sample;
    return `${label}:${measureSample(sample)}`;
  });

  const lineWidths = lines.map((line, index) => {
    const visibleLine = line.replaceAll(" ", "·");
    return `${String(index + 1).padStart(2, "0")}: w=${measureSample(line)} text=${visibleLine}`;
  });

  measureText.remove();

  const panel = document.createElement("section");
  panel.className = "sprite-debug-panel";
  panel.setAttribute("aria-label", "sprite debug panel");

  const title = document.createElement("h2");
  title.textContent = `Sprite Debug: ${state.classId}`;

  const grid = document.createElement("pre");
  grid.className = "sprite-debug-grid";
  grid.textContent = [
    `grid ${maxLength}x${gridHeight}`,
    `axis ${axisIndex}`,
    marker,
    ...lines.map((line, index) => `${String(index + 1).padStart(2, "0")} |${line.padEnd(maxLength)}| len=${line.length}`),
  ].join("\n");

  const env = document.createElement("pre");
  env.className = "sprite-debug-env";
  env.textContent = [
    "runtime",
    `url=${window.location.href}`,
    `ua=${navigator.userAgent}`,
    `dpr=${window.devicePixelRatio}`,
    `viewport=${window.innerWidth}x${window.innerHeight}`,
    `screen=${window.screen?.width}x${window.screen?.height}`,
    `visualViewport=${window.visualViewport?.width ?? "n/a"}x${window.visualViewport?.height ?? "n/a"} scale=${window.visualViewport?.scale ?? "n/a"}`,
    "",
    "computed styles",
    `sprite.class=${spriteEl.className}`,
    `sprite.fontFamily=${spriteStyle.fontFamily}`,
    `sprite.fontSize=${spriteStyle.fontSize}`,
    `sprite.lineHeight=${spriteStyle.lineHeight}`,
    `sprite.letterSpacing=${spriteStyle.letterSpacing}`,
    `sprite.textAlign=${spriteStyle.textAlign}`,
    `sprite.whiteSpace=${spriteStyle.whiteSpace}`,
    `sprite.width=${spriteStyle.width}`,
    `sprite.transform=${spriteStyle.transform}`,
    `html.fontFamily=${htmlStyle.fontFamily}`,
    `body.fontFamily=${bodyStyle.fontFamily}`,
    "",
    "rects",
    `spriteRect x=${spriteRect.x.toFixed(2)} y=${spriteRect.y.toFixed(2)} w=${spriteRect.width.toFixed(2)} h=${spriteRect.height.toFixed(2)}`,
    `stageRect x=${stageRect.x.toFixed(2)} y=${stageRect.y.toFixed(2)} w=${stageRect.width.toFixed(2)} h=${stageRect.height.toFixed(2)}`,
    "",
    "glyph widths",
    glyphWidths.join(" "),
    "",
    "line widths",
    ...lineWidths,
  ].join("\n");

  const note = document.createElement("p");
  note.textContent =
    "Send this panel or screenshot when the sprite looks different in your browser.";

  panel.append(title, grid, env, note);
  fighterStageEl.after(panel);
}

function renderStats() {
  statsRowEl.innerHTML = "";

  const stats = [state.stats.hp, state.stats.str];

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
  if (!character || !replyTypewriter) {
    return;
  }

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

  let adjustedCorrection = correction;
  fighterStageEl.style.marginTop = `${Math.round(adjustedCorrection)}px`;

  if (fighterQuoteEl?.textContent?.trim()) {
    const quoteRect = fighterQuoteEl.getBoundingClientRect();
    const spriteRect = spriteEl.getBoundingClientRect();
    const minGap = 8;
    const overlap = quoteRect.bottom + minGap - spriteRect.top;

    if (overlap > 0) {
      adjustedCorrection += overlap;
      fighterStageEl.style.marginTop = `${Math.round(adjustedCorrection)}px`;
    }
  }
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

if (isProfileSelectorMode()) {
  renderProfileSelectorPage();
} else {
  renderHeader();
  renderStats();
  renderLogs();
  renderSpriteDebugPanel();

  character = new CharacterEntity({
    id: state.id,
    classId: state.classId || "warrior",
    replies: state.replies || [],
  });
  const lastLogType = state.logs[state.logs.length - 1]?.type || "info";
  const initialReply = character.getReplyForLogType(lastLogType);
  replyTypewriter = new ReplyTypewriter({
    targetEl: fighterQuoteEl,
    onUpdate: centerFighterToViewport,
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

  if (closeAsciiBtnEl) {
    closeAsciiBtnEl.addEventListener("click", openProfileSelectorPage);
  }
}
