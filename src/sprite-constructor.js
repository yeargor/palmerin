export const SPRITE_GRID_WIDTH = 24;
export const SPRITE_MIN_GRID_HEIGHT = 6;
export const COMPONENT_SLOTS = ["hat", "face", "arms", "torso", "legs"];

const BASE_SLOT_ANCHOR_ROW = {
  hat: 0,
  face: 1,
  arms: 2,
  torso: 3,
  legs: 4,
};

export function makeLayer(rowOffset, col, text, className = "sprite-main", zIndex = 0) {
  return { rowOffset, col, text, className, zIndex };
}

class SpriteComponent {
  constructor({ id, slot, layers, effects = [], constraints = {} }) {
    this.id = id;
    this.slot = slot;
    this.layers = Array.isArray(layers) ? layers : [];
    this.effects = Array.isArray(effects) ? effects : [];
    this.constraints = constraints || {};
  }
}

export const componentById = {
  hat_warrior: new SpriteComponent({
    id: "hat_warrior",
    slot: "hat",
    layers: [makeLayer(0, 4, "/\\")],
  }),
  hat_mage: new SpriteComponent({
    id: "hat_mage",
    slot: "hat",
    layers: [makeLayer(0, 6, "/\\", "sprite-hat"), makeLayer(1, 3, "__/  \\___", "sprite-hat")],
    effects: [{ type: "shift-slot-anchors", slots: ["face", "arms", "torso", "legs"], dy: 1 }],
  }),
  hat_cowboy: new SpriteComponent({
    id: "hat_cowboy",
    slot: "hat",
    layers: [makeLayer(0, 3, "__/--\\___")],
  }),

  face_plain: new SpriteComponent({
    id: "face_plain",
    slot: "face",
    layers: [makeLayer(0, 2, "( ·  ·)")],
  }),
  face_bandana: new SpriteComponent({
    id: "face_bandana",
    slot: "face",
    layers: [makeLayer(0, 3, ">( ·  ·)")],
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
  }),
  arms_mage: new SpriteComponent({
    id: "arms_mage",
    slot: "arms",
    layers: [
      makeLayer(-3, 16, ".", "sprite-dust", 2),
      makeLayer(-2, 15, ".", "sprite-dust", 2),
      makeLayer(-1, 14, ".", "sprite-dust", 2),
      makeLayer(-1, 17, ".", "sprite-dust", 2),
      makeLayer(0, 5, "/   \\ ", "sprite-main", 1),
      makeLayer(0, 11, "/", "sprite-shield", 2),
      makeLayer(0, 15, ".", "sprite-dust", 2),
    ],
  }),
  arms_cowboy: new SpriteComponent({
    id: "arms_cowboy",
    slot: "arms",
    layers: [
      makeLayer(0, 5, "|_", "sprite-main", 1),
      makeLayer(0, 7, "Г‾‾", "sprite-gun", 2),
      makeLayer(0, 11, "_", "sprite-main", 1),
      makeLayer(0, 12, "Г‾‾", "sprite-gun", 2),
    ],
  }),

  torso_warrior: new SpriteComponent({
    id: "torso_warrior",
    slot: "torso",
    layers: [makeLayer(0, 2, "/|___|\\")],
  }),
  torso_mage: new SpriteComponent({
    id: "torso_mage",
    slot: "torso",
    layers: [makeLayer(0, 4, "/_____\\")],
  }),
  torso_cowboy: new SpriteComponent({
    id: "torso_cowboy",
    slot: "torso",
    layers: [makeLayer(0, 4, "/+++0+\\")],
  }),

  legs_boots: new SpriteComponent({
    id: "legs_boots",
    slot: "legs",
    layers: [makeLayer(0, 2, "/_/ \\_\\")],
  }),
  legs_boots_offset: new SpriteComponent({
    id: "legs_boots_offset",
    slot: "legs",
    layers: [makeLayer(0, 4, "/_/ \\_\\")],
  }),
  legs_hidden: new SpriteComponent({
    id: "legs_hidden",
    slot: "legs",
    layers: [],
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
    arms: "arms_mage",
    torso: "torso_mage",
    legs: "legs_hidden",
  },
  cowboy: {
    hat: "hat_cowboy",
    face: "face_bandana",
    arms: "arms_cowboy",
    torso: "torso_cowboy",
    legs: "legs_boots_offset",
  },
};

export const randomPoolBySlot = {
  hat: ["hat_warrior", "hat_mage", "hat_cowboy"],
  face: ["face_plain", "face_bandana"],
  arms: ["arms_warrior", "arms_mage", "arms_cowboy"],
  torso: ["torso_warrior", "torso_mage", "torso_cowboy"],
  legs: ["legs_boots", "legs_boots_offset", "legs_hidden"],
};

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
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
    for (const layer of component.layers) {
      ops.push(...explodeLayerChars(layer, anchorRow + layer.rowOffset));
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function targetMinColByProfile(profileClassId) {
  if (profileClassId === "mage") {
    return 3;
  }
  if (profileClassId === "cowboy") {
    return 3;
  }
  if (profileClassId === "random") {
    return 2;
  }
  return 1;
}

function normalizeOps(ops, profileClassId) {
  if (!ops.length) {
    return ops;
  }
  const bounds = getBounds(ops);
  const desiredMinCol = targetMinColByProfile(profileClassId);
  const minDx = -bounds.minCol;
  const maxDx = (SPRITE_GRID_WIDTH - 1) - bounds.maxCol;
  const dx = clamp(desiredMinCol - bounds.minCol, minDx, maxDx);
  const dy = bounds.minRow < 0 ? -bounds.minRow : 0;
  return ops.map((op) => ({ ...op, row: op.row + dy, col: op.col + dx }));
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
  const bounds = getBounds(normalizedOps);
  const height = bounds ? Math.max(SPRITE_MIN_GRID_HEIGHT, bounds.maxRow + 1) : SPRITE_MIN_GRID_HEIGHT;
  const grid = createGrid(SPRITE_GRID_WIDTH, height);

  const sortedOps = [...normalizedOps].sort((a, b) => a.zIndex - b.zIndex);
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

export function buildRandomPreset(maxAttempts = 60) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = {
      hat: randomFrom(randomPoolBySlot.hat),
      face: randomFrom(randomPoolBySlot.face),
      arms: randomFrom(randomPoolBySlot.arms),
      torso: randomFrom(randomPoolBySlot.torso),
      legs: randomFrom(randomPoolBySlot.legs),
    };
    try {
      validatePresetOrThrow(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  return { ...characterPresetByClassId.warrior };
}
