export const SPRITE_GRID_WIDTH = 24;
export const SPRITE_MIN_GRID_HEIGHT = 7;
export const SPRITE_BOTTOM_PADDING_ROWS = 1;
export const COMPONENT_SLOTS = ["hat", "face", "arms", "torso", "legs"];

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
  constructor({ id, slot, layers, effects = [], constraints = {}, anchor = null }) {
    this.id = id;
    this.slot = slot;
    this.layers = Array.isArray(layers) ? layers : [];
    this.effects = Array.isArray(effects) ? effects : [];
    this.constraints = constraints || {};
    this.anchor = anchor;
  }
}

export const componentById = {
  hat_warrior: new SpriteComponent({
    id: "hat_warrior",
    slot: "hat",
    layers: [makeLayer(0, 4, "/\\")],
    anchor: { pattern: "/\\", targetIndexes: [1, 1] },
  }),
  hat_mage: new SpriteComponent({
    id: "hat_mage",
    slot: "hat",
    layers: [makeLayer(0, 6, "/\\", "sprite-hat"), makeLayer(1, 3, "__/  \\___", "sprite-hat")],
    effects: [{ type: "shift-slot-anchors", slots: ["face", "arms", "torso", "legs"], dy: 1 }],
    anchor: { pattern: "__/  \\___", targetIndexes: [3, 5] },
  }),
  hat_cowboy: new SpriteComponent({
    id: "hat_cowboy",
    slot: "hat",
    layers: [makeLayer(0, 3, "__/--\\___")],
    anchor: { pattern: "__/--\\___", targetIndexes: [3, 5] },
  }),

  face_plain: new SpriteComponent({
    id: "face_plain",
    slot: "face",
    layers: [makeLayer(0, 2, "( ·  ·)")],
    anchor: { pattern: "( ·  ·)", targetIndexes: [2, 4] },
  }),
  face_bandana: new SpriteComponent({
    id: "face_bandana",
    slot: "face",
    layers: [makeLayer(0, 3, ">( ·  ·)")],
    anchor: { pattern: ">( ·  ·)", targetIndexes: [3, 5] },
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
    anchor: { pattern: "/   \\", targetIndexes: [0, 4] },
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
  }),

  torso_warrior: new SpriteComponent({
    id: "torso_warrior",
    slot: "torso",
    layers: [makeLayer(0, 2, "/|___|\\")],
    anchor: { pattern: "/|___|\\", targetIndexes: [2, 4] },
  }),
  torso_mage: new SpriteComponent({
    id: "torso_mage",
    slot: "torso",
    layers: [makeLayer(0, 4, "/_____\\")],
    anchor: { pattern: "/_____\\", targetIndexes: [2, 4] },
  }),
  torso_cowboy: new SpriteComponent({
    id: "torso_cowboy",
    slot: "torso",
    layers: [makeLayer(0, 4, "/+++0+\\")],
    anchor: { pattern: "/+++0+\\", targetIndexes: [2, 4] },
  }),

  legs_boots: new SpriteComponent({
    id: "legs_boots",
    slot: "legs",
    layers: [makeLayer(0, 2, "/_/ \\_\\")],
    anchor: { pattern: "/_/ \\_\\", targetIndexes: [3, 3] },
  }),
  legs_boots_offset: new SpriteComponent({
    id: "legs_boots_offset",
    slot: "legs",
    layers: [makeLayer(0, 4, "/_/ \\_\\")],
    anchor: { pattern: "/_/ \\_\\", targetIndexes: [3, 3] },
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
    legs: "legs_boots",
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
  legs: ["legs_boots", "legs_boots_offset"],
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
