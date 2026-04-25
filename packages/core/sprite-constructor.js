export const SPRITE_GRID_WIDTH = 24;
export const SPRITE_MIN_GRID_HEIGHT = 7;
export const SPRITE_BOTTOM_PADDING_ROWS = 1;
export const COMPONENT_SLOTS = ["hat", "face", "arms", "torso", "legs"];
export const COMBAT_STAT_MIN = 1;
export const COMBAT_STAT_MAX = 10;
const COLOR_POWER_EXPONENT = 1.8;
const COLOR_TIER_IDS = ["uncommon", "rare", "seraph", "amber", "reggae", "palmerin"];
const COLOR_BASE_PROBABILITIES = {
  uncommon: 0.5,
  rare: 0.32,
  seraph: 0.13,
  amber: 0.04,
  reggae: 0.009,
  palmerin: 0.009,
};
const COLOR_TIER_PRESSURE = {
  uncommon: -2.2,
  rare: -1.1,
  seraph: 0.3,
  amber: 0.55,
  reggae: 0.9,
  palmerin: 0.9,
};
const AMBER_UNLOCK_STAT = 9;

const BASE_SLOT_ANCHOR_ROW = {
  hat: 0,
  face: 1,
  arms: 2,
  torso: 3,
  legs: 4,
};

const SLOT_CENTER_COL_BY_SLOT = {
  hat: 11,
  face: 11,
  arms: 11,
  torso: 11,
  legs: 11,
};

export function makeLayer(rowOffset, col, text, className = "sprite-main", zIndex = 0) {
  return { rowOffset, col, text, className, zIndex };
}

class SpriteComponent {
  constructor({
    id,
    slot,
    layers,
    effects = [],
    constraints = {},
    anchor = null,
    baseClass = "shared",
    stats = {},
    weight = 1,
  }) {
    this.id = id;
    this.slot = slot;
    this.layers = Array.isArray(layers) ? layers : [];
    this.effects = Array.isArray(effects) ? effects : [];
    this.constraints = constraints || {};
    this.anchor = anchor;
    this.baseClass = baseClass;
    this.stats = {
      hp: Number.isFinite(stats.hp) ? stats.hp : 0,
      attack: Number.isFinite(stats.attack) ? stats.attack : 0,
    };
    this.weight = Number.isFinite(weight) && weight > 0 ? weight : 1;
  }
}

export const componentById = {
  hat_warrior: new SpriteComponent({
    id: "hat_warrior",
    slot: "hat",
    layers: [makeLayer(0, 4, "/\\")],
    anchor: { pattern: "/\\", targetIndexes: [1, 1] },
    baseClass: "warrior",
    stats: { hp: 2, attack: 0 },
    weight: 2,
  }),
  hat_mage: new SpriteComponent({
    id: "hat_mage",
    slot: "hat",
    layers: [makeLayer(0, 6, "/\\", "sprite-hat"), makeLayer(1, 3, "__/  \\___", "sprite-hat")],
    effects: [{ type: "shift-slot-anchors", slots: ["face", "arms", "torso", "legs"], dy: 1 }],
    anchor: { pattern: "__/  \\___", targetIndexes: [3, 5] },
    baseClass: "mage",
    stats: { hp: 1, attack: 1 },
    weight: 2,
  }),
  hat_cowboy: new SpriteComponent({
    id: "hat_cowboy",
    slot: "hat",
    layers: [makeLayer(0, 3, "__/--\\___")],
    anchor: { pattern: "__/--\\___", targetIndexes: [3, 5] },
    baseClass: "cowboy",
    stats: { hp: 1, attack: 1 },
    weight: 2,
  }),
  hat_warrior_crown: new SpriteComponent({
    id: "hat_warrior_crown",
    slot: "hat",
    layers: [makeLayer(0, 3, "✦_✦_✦", "sprite-gold")],
    anchor: { pattern: "✦_✦_✦", targetIndexes: [2, 2] },
    baseClass: "warrior",
    stats: { hp: 1, attack: 0 },
    weight: 6,
  }),
  hat_mage_halo: new SpriteComponent({
    id: "hat_mage_halo",
    slot: "hat",
    layers: [makeLayer(0, 4, "___+_", "sprite-gold")],
    anchor: { pattern: "___+_", targetIndexes: [2, 2] },
    baseClass: "mage",
    stats: { hp: 1, attack: 0 },
    weight: 6,
  }),
  hat_cowboy_emu_kak_raz: new SpriteComponent({
    id: "hat_cowboy_emu_kak_raz",
    slot: "hat",
    layers: [
      makeLayer(0, 4, "____", "sprite-leather"),
      makeLayer(1, 0, "___/____\\_)---)", "sprite-leather"),
    ],
    effects: [{ type: "shift-slot-anchors", slots: ["face", "arms", "torso", "legs"], dy: 1 }],
    anchor: { pattern: "___/____\\_)---)", targetIndexes: [4, 6] },
    baseClass: "cowboy",
    stats: { hp: 0, attack: 1 },
    weight: 6,
  }),

  face_plain: new SpriteComponent({
    id: "face_plain",
    slot: "face",
    layers: [makeLayer(0, 2, "( ·  ·)")],
    anchor: { pattern: "( ·  ·)", targetIndexes: [2, 4] },
    stats: { hp: 1, attack: 1 },
    weight: 4,
  }),
  face_bandana: new SpriteComponent({
    id: "face_bandana",
    slot: "face",
    layers: [makeLayer(0, 3, ">( ·  ·)")],
    anchor: { pattern: ">( ·  ·)", targetIndexes: [3, 5] },
    baseClass: "cowboy",
    stats: { hp: 1, attack: 1 },
    weight: 1,
  }),
  face_blessed_eyes: new SpriteComponent({
    id: "face_blessed_eyes",
    slot: "face",
    layers: [makeLayer(0, 4, "( ✦  ✦)")],
    anchor: { pattern: "( ✦  ✦)", targetIndexes: [2, 4] },
    stats: { hp: 1, attack: 0 },
    weight: 1,
  }),

  arms_warrior: new SpriteComponent({
    id: "arms_warrior",
    slot: "arms",
    layers: [
      makeLayer(-1, 10, "/", "sprite-sword", 2),
      makeLayer(0, 1, "<( ^ )>", "sprite-shield", 1),
      makeLayer(0, 8, "\\", "sprite-main", 1),
      makeLayer(0, 9, "/", "sprite-sword", 2),
    ],
    anchor: { pattern: "<( ^ )>", targetIndexes: [3, 5] },
    baseClass: "warrior",
    stats: { hp: 1, attack: 2 },
    weight: 1,
  }),
  arms_mage: new SpriteComponent({
    id: "arms_mage",
    slot: "arms",
    layers: [makeLayer(0, 5, "/   \\", "sprite-main", 1)],
    anchor: { pattern: "/   \\", targetIndexes: [0, 4] },
    baseClass: "shared",
    stats: { hp: 1, attack: 1 },
    weight: 1,
  }),
  arms_mage_mantle_top: new SpriteComponent({
    id: "arms_mage_mantle_top",
    slot: "arms",
    layers: [
      makeLayer(-3, 16, ".", "sprite-dust", 2),
      makeLayer(-2, 15, ".", "sprite-dust", 2),
      makeLayer(-1, 14, ".", "sprite-dust", 2),
      makeLayer(-1, 17, ".", "sprite-dust", 2),
      makeLayer(0, 5, "/  o\\", "sprite-main", 1),
      makeLayer(0, 11, "/", "sprite-shield", 2),
      makeLayer(0, 15, ".", "sprite-dust", 2),
    ],
    anchor: { pattern: "/  o\\", targetIndexes: [2, 2] },
    baseClass: "mage",
    stats: { hp: 1, attack: 2 },
    weight: 1,
  }),
  arms_cowboy: new SpriteComponent({
    id: "arms_cowboy",
    slot: "arms",
    layers: [
      makeLayer(0, 5, "| _", "sprite-main", 1),
      makeLayer(0, 8, "Г‾‾", "sprite-gun", 2),
      makeLayer(0, 12, "_", "sprite-main", 1),
      makeLayer(0, 13, "Г‾‾", "sprite-gun", 2),
    ],
    anchor: { pattern: "| _", targetIndexes: [2, 2] },
    baseClass: "cowboy",
    stats: { hp: 0, attack: 4 },
    weight: 1,
  }),

  torso_warrior: new SpriteComponent({
    id: "torso_warrior",
    slot: "torso",
    layers: [makeLayer(0, 2, "/|___|\\")],
    anchor: { pattern: "/|___|\\", targetIndexes: [2, 4] },
    baseClass: "warrior",
    stats: { hp: 3, attack: 1 },
    weight: 1,
  }),
  torso_mage: new SpriteComponent({
    id: "torso_mage",
    slot: "torso",
    layers: [makeLayer(0, 4, "/_____\\")],
    anchor: { pattern: "/_____\\", targetIndexes: [2, 4] },
    baseClass: "mage",
    stats: { hp: 2, attack: 2 },
    weight: 1,
  }),
  torso_mage_mantle_bottom: new SpriteComponent({
    id: "torso_mage_mantle_bottom",
    slot: "torso",
    layers: [makeLayer(0, 4, "/__/\\_\\")],
    anchor: { pattern: "/__/\\_\\", targetIndexes: [3, 4] },
    baseClass: "mage",
    stats: { hp: 2, attack: 2 },
    weight: 1,
  }),
  torso_cowboy: new SpriteComponent({
    id: "torso_cowboy",
    slot: "torso",
    layers: [makeLayer(0, 4, "/+++0+\\")],
    anchor: { pattern: "/+++0+\\", targetIndexes: [2, 4] },
    baseClass: "cowboy",
    stats: { hp: 1, attack: 2 },
    weight: 1,
  }),

  legs_boots: new SpriteComponent({
    id: "legs_boots",
    slot: "legs",
    layers: [makeLayer(0, 2, "/_/ \\_\\")],
    anchor: { pattern: "/_/ \\_\\", targetIndexes: [3, 3] },
    stats: { hp: 1, attack: 1 },
    weight: 3,
  }),
  legs_cowboy_boots: new SpriteComponent({
    id: "legs_cowboy_boots",
    slot: "legs",
    layers: [makeLayer(0, 3, "JH Hl", "sprite-leather")],
    anchor: { pattern: "JH Hl", targetIndexes: [2, 2] },
    stats: { hp: 1, attack: 0 },
    weight: 6,
  }),
  legs_brass_kneepads: new SpriteComponent({
    id: "legs_brass_kneepads",
    slot: "legs",
    layers: [makeLayer(0, 2, "/o/ \\o\\")],
    anchor: { pattern: "/o/ \\o\\", targetIndexes: [3, 3] },
    stats: { hp: 1, attack: 1 },
    weight: 4,
  }),
};

export const characterPresetByClassId = {
  warrior: {
    hat: "hat_warrior",
    face: "face_plain",
    arms: "arms_warrior",
    torso: "torso_warrior",
    legs: "legs_boots",
  },
  mage: {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_mage_mantle_top",
    torso: "torso_mage_mantle_bottom",
    legs: "legs_boots",
  },
  cowboy: {
    hat: "hat_cowboy",
    face: "face_bandana",
    arms: "arms_cowboy",
    torso: "torso_cowboy",
    legs: "legs_boots",
  },
};

export const randomPoolBySlot = {
  hat: ["hat_warrior", "hat_mage", "hat_cowboy", "hat_warrior_crown", "hat_mage_halo", "hat_cowboy_emu_kak_raz"],
  face: ["face_plain", "face_bandana", "face_blessed_eyes"],
  arms: ["arms_warrior", "arms_mage", "arms_mage_mantle_top", "arms_cowboy"],
  torso: ["torso_warrior", "torso_mage", "torso_mage_mantle_bottom", "torso_cowboy"],
  legs: ["legs_boots", "legs_cowboy_boots", "legs_brass_kneepads"],
};

const BASE_CLASS_IDS = ["mage", "cowboy", "warrior"];

function getComponentBaseClass(componentId) {
  const component = componentById[componentId];
  return component?.baseClass || "shared";
}

export function detectPresetDominantBaseClass(preset) {
  const counts = { mage: 0, cowboy: 0, warrior: 0 };
  for (const slot of COMPONENT_SLOTS) {
    const baseClass = getComponentBaseClass(preset?.[slot]);
    if (baseClass in counts) {
      counts[baseClass] += 1;
    }
  }

  const maxCount = Math.max(...Object.values(counts));
  if (maxCount <= 0) {
    return "warrior";
  }

  const leaders = BASE_CLASS_IDS.filter((classId) => counts[classId] === maxCount);
  if (leaders.length === 1) {
    return leaders[0];
  }

  const tiebreakerSlots = ["hat", "arms", "torso", "face", "legs"];
  for (const slot of tiebreakerSlots) {
    const baseClass = getComponentBaseClass(preset?.[slot]);
    if (leaders.includes(baseClass)) {
      return baseClass;
    }
  }

  return leaders[0];
}

function getComponentWeight(componentId) {
  const component = componentById[componentId];
  const weight = Number(component?.weight);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
}

function randomFromByWeight(componentIds) {
  const selection = randomFromByWeightWithMeta(componentIds);
  return selection.componentId;
}

function randomFromByWeightWithMeta(componentIds) {
  if (!Array.isArray(componentIds) || !componentIds.length) {
    return {
      componentId: null,
      meta: {
        poolSize: 0,
        totalWeight: 0,
        roll: null,
        mode: "empty",
        selectedWeight: 0,
      },
    };
  }
  const weighted = componentIds.map((componentId) => ({
    componentId,
    weight: getComponentWeight(componentId),
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    const uniformRoll = Math.random();
    const idx = Math.floor(uniformRoll * componentIds.length);
    const selectedId = componentIds[idx] || null;
    return {
      componentId: selectedId,
      meta: {
        poolSize: componentIds.length,
        totalWeight: 0,
        roll: Number(uniformRoll.toFixed(6)),
        mode: "uniform_fallback",
        selectedWeight: Number(getComponentWeight(selectedId).toFixed(6)),
      },
    };
  }
  const weightedRoll = Math.random() * total;
  let roll = weightedRoll;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return {
        componentId: entry.componentId,
        meta: {
          poolSize: componentIds.length,
          totalWeight: Number(total.toFixed(6)),
          roll: Number(weightedRoll.toFixed(6)),
          mode: "weighted",
          selectedWeight: Number(entry.weight.toFixed(6)),
        },
      };
    }
  }
  const selected = weighted[weighted.length - 1] || null;
  return {
    componentId: selected?.componentId || null,
    meta: {
      poolSize: componentIds.length,
      totalWeight: Number(total.toFixed(6)),
      roll: Number(weightedRoll.toFixed(6)),
      mode: "weighted_fallback",
      selectedWeight: Number((selected?.weight || 0).toFixed(6)),
    },
  };
}

function clampCombatStat(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(COMBAT_STAT_MIN, Math.min(COMBAT_STAT_MAX, Math.round(numeric)));
}

export function getPresetCombatStats(preset) {
  validatePresetOrThrow(preset);
  let hp = 0;
  let attack = 0;

  for (const slot of COMPONENT_SLOTS) {
    const component = componentById[preset[slot]];
    if (!component) {
      continue;
    }
    hp += Number(component.stats?.hp) || 0;
    attack += Number(component.stats?.attack) || 0;
  }

  return {
    hp: clampCombatStat(hp),
    attack: clampCombatStat(attack),
  };
}

function getComponentCombatPower(componentId) {
  const component = componentById[componentId];
  if (!component) {
    return 0;
  }
  const hp = Number(component.stats?.hp) || 0;
  const attack = Number(component.stats?.attack) || 0;
  return Math.max(0, hp + attack);
}

function getPresetPowerScore(preset) {
  let score = 0;
  for (const slot of COMPONENT_SLOTS) {
    const power = getComponentCombatPower(preset[slot]);
    score += power ** COLOR_POWER_EXPONENT;
  }
  return score;
}

function getRandomPoolPowerScoreBounds() {
  let minScore = 0;
  let maxScore = 0;

  for (const slot of COMPONENT_SLOTS) {
    const ids = randomPoolBySlot[slot] || [];
    if (!ids.length) {
      continue;
    }
    let minSlot = Infinity;
    let maxSlot = -Infinity;
    for (const id of ids) {
      const value = getComponentCombatPower(id) ** COLOR_POWER_EXPONENT;
      minSlot = Math.min(minSlot, value);
      maxSlot = Math.max(maxSlot, value);
    }
    minScore += Number.isFinite(minSlot) ? minSlot : 0;
    maxScore += Number.isFinite(maxSlot) ? maxSlot : 0;
  }

  if (maxScore <= minScore) {
    maxScore = minScore + 1;
  }

  return { minScore, maxScore };
}

export function getPresetColorTierWeights(preset) {
  validatePresetOrThrow(preset);
  const score = getPresetPowerScore(preset);
  const combatStats = getPresetCombatStats(preset);
  const maxStat = Math.max(combatStats.hp, combatStats.attack);
  const { minScore, maxScore } = getRandomPoolPowerScoreBounds();
  const quality = Math.max(0, Math.min(1, (score - minScore) / (maxScore - minScore)));
  const maxStatRatio = Math.max(0, maxStat) / Math.max(1, COMBAT_STAT_MAX);
  const pressure =
    (0.95 * quality) +
    (0.65 * quality * quality) +
    (0.95 * maxStatRatio * maxStatRatio);

  const raw = {};
  for (const tier of COLOR_TIER_IDS) {
    const base = COLOR_BASE_PROBABILITIES[tier] ?? 0;
    const shift = COLOR_TIER_PRESSURE[tier] ?? 0;
    raw[tier] = base * Math.exp(pressure * shift);
  }
  // Continuous dampening for top rarity tiers:
  // keeps amber/reggae/palmerin from over-dominating at mid-high stats,
  // while still letting them grow toward late quality.
  const topTierFactor = quality ** 1.6;
  const amberActivationBase = Math.max(
    0,
    (maxStat - (AMBER_UNLOCK_STAT - 1)) / Math.max(1, COMBAT_STAT_MAX - (AMBER_UNLOCK_STAT - 1)),
  );
  const amberActivation = amberActivationBase ** 1.35;
  raw.amber *= (0.5 + 0.5 * topTierFactor) * amberActivation;
  raw.reggae *= topTierFactor * (amberActivation ** 1.35);
  raw.palmerin *= topTierFactor * (amberActivation ** 1.35);
  const rawSum = COLOR_TIER_IDS.reduce((sum, tier) => sum + raw[tier], 0);
  const norm = rawSum > 0 ? rawSum : 1;
  const weights = Object.fromEntries(COLOR_TIER_IDS.map((tier) => [tier, (raw[tier] / norm) * 100]));

  return {
    quality,
    score,
    minScore,
    maxScore,
    weights,
  };
}

function readConstraintList(value) {
  return Array.isArray(value) ? value : [];
}

export function validatePresetOrThrow(preset) {
  for (const slot of COMPONENT_SLOTS) {
    const componentId = preset?.[slot];
    if (!componentId) {
      throw new Error(`Missing component for slot: ${slot}`);
    }
    const component = componentById[componentId];
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    if (component.slot !== slot) {
      throw new Error(`Invalid slot binding: ${componentId} cannot be used as ${slot}`);
    }
  }

  for (const slot of COMPONENT_SLOTS) {
    const component = componentById[preset[slot]];
    const requires = readConstraintList(component.constraints?.requires);
    for (const requiredId of requires) {
      if (!Object.values(preset).includes(requiredId)) {
        throw new Error(`Constraint violation: ${component.id} requires ${requiredId}`);
      }
    }
    const forbids = readConstraintList(component.constraints?.forbids);
    for (const forbiddenId of forbids) {
      if (Object.values(preset).includes(forbiddenId)) {
        throw new Error(`Constraint violation: ${component.id} forbids ${forbiddenId}`);
      }
    }
  }
}

function buildAnchors(preset) {
  const anchors = { ...BASE_SLOT_ANCHOR_ROW };
  for (const slot of COMPONENT_SLOTS) {
    const component = componentById[preset[slot]];
    for (const effect of component.effects) {
      if (effect?.type !== "shift-slot-anchors") {
        continue;
      }
      const dy = Number(effect.dy || 0);
      for (const targetSlot of effect.slots || []) {
        if (typeof anchors[targetSlot] === "number") {
          anchors[targetSlot] += dy;
        }
      }
    }
  }
  return anchors;
}

function explodeLayerChars(layer, row) {
  const ops = [];
  for (let i = 0; i < layer.text.length; i += 1) {
    const ch = layer.text[i];
    if (ch === " ") {
      continue;
    }
    ops.push({
      row,
      col: layer.col + i,
      ch,
      className: layer.className,
      zIndex: layer.zIndex,
    });
  }
  return ops;
}

function collectOps(preset) {
  const anchors = buildAnchors(preset);
  const ops = [];
  for (const slot of COMPONENT_SLOTS) {
    const component = componentById[preset[slot]];
    const anchorRow = anchors[slot];
    const anchorCol = resolveComponentAnchorCol(component);
    const targetCol = SLOT_CENTER_COL_BY_SLOT[slot];
    const dx =
      Number.isFinite(anchorCol) && Number.isFinite(targetCol)
        ? Math.round(targetCol - anchorCol)
        : 0;
    for (const layer of component.layers) {
      ops.push(...explodeLayerChars({ ...layer, col: layer.col + dx }, anchorRow + layer.rowOffset));
    }
  }
  return ops;
}

function getBounds(ops) {
  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = -Infinity;
  let maxCol = -Infinity;
  for (const op of ops) {
    minRow = Math.min(minRow, op.row);
    minCol = Math.min(minCol, op.col);
    maxRow = Math.max(maxRow, op.row);
    maxCol = Math.max(maxCol, op.col);
  }
  if (!ops.length) {
    return null;
  }
  return { minRow, minCol, maxRow, maxCol };
}

function normalizeOps(ops, profileClassId) {
  void profileClassId;
  if (!ops.length) {
    return ops;
  }
  const bounds = getBounds(ops);
  const dy = bounds.minRow < 0 ? -bounds.minRow : 0;
  return ops.map((op) => ({ ...op, row: op.row + dy }));
}

function alignOpsToBottom(ops, height) {
  if (!ops.length) {
    return ops;
  }
  const bounds = getBounds(ops);
  const targetBottomRow = height - 1 - SPRITE_BOTTOM_PADDING_ROWS;
  const dy = targetBottomRow - bounds.maxRow;
  return ops.map((op) => ({ ...op, row: op.row + dy }));
}

function layerNonSpaceBounds(layer) {
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (let i = 0; i < layer.text.length; i += 1) {
    if (layer.text[i] === " ") {
      continue;
    }
    minCol = Math.min(minCol, layer.col + i);
    maxCol = Math.max(maxCol, layer.col + i);
  }
  if (maxCol === -Infinity) {
    return null;
  }
  return { minCol, maxCol };
}

function componentFallbackAnchorCol(component) {
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (const layer of component.layers) {
    const bounds = layerNonSpaceBounds(layer);
    if (!bounds) {
      continue;
    }
    minCol = Math.min(minCol, bounds.minCol);
    maxCol = Math.max(maxCol, bounds.maxCol);
  }
  if (maxCol === -Infinity) {
    return null;
  }
  return (minCol + maxCol) / 2;
}

function resolveComponentAnchorCol(component) {
  const anchor = component.anchor;
  if (!anchor || !anchor.pattern || !Array.isArray(anchor.targetIndexes)) {
    return componentFallbackAnchorCol(component);
  }

  const [targetStart, targetEnd] = anchor.targetIndexes;
  for (const layer of component.layers) {
    const patternStart = layer.text.indexOf(anchor.pattern);
    if (patternStart < 0) {
      continue;
    }
    const localCenter = patternStart + (targetStart + targetEnd) / 2;
    return layer.col + localCenter;
  }
  return componentFallbackAnchorCol(component);
}

function createGrid(width, height) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      ch: " ",
      className: null,
      z: Number.NEGATIVE_INFINITY,
    })),
  );
}

function renderRowHtml(cells) {
  const chunks = [];
  let currentClass = cells[0]?.className || null;
  let currentText = "";

  const flush = () => {
    if (!currentText.length) {
      return;
    }
    const safe = currentText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    if (currentClass) {
      chunks.push(`<span class="${currentClass}">${safe}</span>`);
    } else {
      chunks.push(safe);
    }
  };

  for (const cell of cells) {
    const nextClass = cell.className || null;
    if (nextClass !== currentClass) {
      flush();
      currentClass = nextClass;
      currentText = "";
    }
    currentText += cell.ch;
  }
  flush();
  return chunks.join("");
}

export function renderPresetToSprite(preset, profileClassId = "warrior") {
  validatePresetOrThrow(preset);
  const normalizedOps = normalizeOps(collectOps(preset), profileClassId);
  const height = SPRITE_MIN_GRID_HEIGHT;
  const alignedOps = alignOpsToBottom(normalizedOps, height);
  const grid = createGrid(SPRITE_GRID_WIDTH, height);

  const sortedOps = [...alignedOps].sort((a, b) => a.zIndex - b.zIndex);
  for (const op of sortedOps) {
    if (op.row < 0 || op.row >= height || op.col < 0 || op.col >= SPRITE_GRID_WIDTH) {
      continue;
    }
    const cell = grid[op.row][op.col];
    if (op.zIndex >= cell.z) {
      grid[op.row][op.col] = { ch: op.ch, className: op.className, z: op.zIndex };
    }
  }

  const plainLines = grid.map((row) => row.map((cell) => cell.ch).join(""));
  const htmlLines = grid.map((row) => renderRowHtml(row));
  return {
    html: htmlLines.join("\n"),
    plainText: plainLines.join("\n"),
    lines: plainLines,
    width: SPRITE_GRID_WIDTH,
    height,
  };
}

export function buildRandomPreset(maxAttempts = 60, selectionTelemetry = null) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const attemptTelemetry = [];
    const pickHat = randomFromByWeightWithMeta(randomPoolBySlot.hat);
    const pickFace = randomFromByWeightWithMeta(randomPoolBySlot.face);
    const pickArms = randomFromByWeightWithMeta(randomPoolBySlot.arms);
    const pickTorso = randomFromByWeightWithMeta(randomPoolBySlot.torso);
    const pickLegs = randomFromByWeightWithMeta(randomPoolBySlot.legs);
    const candidate = {
      hat: pickHat.componentId,
      face: pickFace.componentId,
      arms: pickArms.componentId,
      torso: pickTorso.componentId,
      legs: pickLegs.componentId,
    };
    attemptTelemetry.push(
      { context: "spawn", slot: "hat", candidateId: pickHat.componentId, currentComponentId: null, gain: null, drop: null, componentWeight: pickHat.meta.selectedWeight, finalWeight: pickHat.meta.selectedWeight, roll: pickHat.meta.roll, candidatePoolSize: pickHat.meta.poolSize, totalWeight: pickHat.meta.totalWeight, selectionMode: pickHat.meta.mode, attempt: attempt + 1 },
      { context: "spawn", slot: "face", candidateId: pickFace.componentId, currentComponentId: null, gain: null, drop: null, componentWeight: pickFace.meta.selectedWeight, finalWeight: pickFace.meta.selectedWeight, roll: pickFace.meta.roll, candidatePoolSize: pickFace.meta.poolSize, totalWeight: pickFace.meta.totalWeight, selectionMode: pickFace.meta.mode, attempt: attempt + 1 },
      { context: "spawn", slot: "arms", candidateId: pickArms.componentId, currentComponentId: null, gain: null, drop: null, componentWeight: pickArms.meta.selectedWeight, finalWeight: pickArms.meta.selectedWeight, roll: pickArms.meta.roll, candidatePoolSize: pickArms.meta.poolSize, totalWeight: pickArms.meta.totalWeight, selectionMode: pickArms.meta.mode, attempt: attempt + 1 },
      { context: "spawn", slot: "torso", candidateId: pickTorso.componentId, currentComponentId: null, gain: null, drop: null, componentWeight: pickTorso.meta.selectedWeight, finalWeight: pickTorso.meta.selectedWeight, roll: pickTorso.meta.roll, candidatePoolSize: pickTorso.meta.poolSize, totalWeight: pickTorso.meta.totalWeight, selectionMode: pickTorso.meta.mode, attempt: attempt + 1 },
      { context: "spawn", slot: "legs", candidateId: pickLegs.componentId, currentComponentId: null, gain: null, drop: null, componentWeight: pickLegs.meta.selectedWeight, finalWeight: pickLegs.meta.selectedWeight, roll: pickLegs.meta.roll, candidatePoolSize: pickLegs.meta.poolSize, totalWeight: pickLegs.meta.totalWeight, selectionMode: pickLegs.meta.mode, attempt: attempt + 1 },
    );
    try {
      validatePresetOrThrow(candidate);
      if (Array.isArray(selectionTelemetry)) {
        selectionTelemetry.push(...attemptTelemetry);
      }
      return candidate;
    } catch {
      // continue
    }
  }
  return { ...characterPresetByClassId.warrior };
}
