import test from "node:test";
import assert from "node:assert/strict";
import {
  SPRITE_GRID_WIDTH,
  SPRITE_MIN_GRID_HEIGHT,
  COMPONENT_SLOTS,
  buildRandomPreset,
  characterPresetByClassId,
  componentById,
  renderPresetToSprite,
  validatePresetOrThrow,
} from "../src/sprite-constructor.js";

test("preset must have all required slots", () => {
  const invalidPreset = {
    hat: "hat_warrior",
    face: "face_plain",
    arms: "arms_warrior",
    torso: "torso_warrior",
  };
  assert.throws(() => validatePresetOrThrow(invalidPreset), /Missing component for slot: legs/);
});

test("slot binding is strictly validated", () => {
  const invalidPreset = {
    hat: "hat_warrior",
    face: "legs_boots",
    arms: "arms_warrior",
    torso: "torso_warrior",
    legs: "legs_boots",
  };
  assert.throws(() => validatePresetOrThrow(invalidPreset), /Invalid slot binding/);
});

test("warrior arms and bandana face are allowed", () => {
  const preset = {
    hat: "hat_cowboy",
    face: "face_bandana",
    arms: "arms_warrior",
    torso: "torso_cowboy",
    legs: "legs_boots",
  };
  assert.doesNotThrow(() => validatePresetOrThrow(preset));
  const rendered = renderPresetToSprite(preset, "random");
  assert.ok(rendered.plainText.includes(">( ·  ·"));
  assert.ok(rendered.plainText.includes("<( ^ )>"));
});

test("mage hat shifts face slot down by one row", () => {
  const preset = {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_cowboy",
    torso: "torso_warrior",
    legs: "legs_boots",
  };
  const rendered = renderPresetToSprite(preset, "random");
  const lines = rendered.lines;
  assert.equal(lines[1].includes("( ·  ·)"), false);
  assert.equal(lines[2].includes("( ·  ·)"), true);
});

test("default presets render with unified width and minimum height", () => {
  for (const profileClassId of ["warrior", "mage", "cowboy"]) {
    const rendered = renderPresetToSprite(characterPresetByClassId[profileClassId], profileClassId);
    assert.equal(rendered.width, SPRITE_GRID_WIDTH);
    assert.equal(rendered.height >= SPRITE_MIN_GRID_HEIGHT, true);
    assert.equal(rendered.lines.length, rendered.height);
    for (const line of rendered.lines) {
      assert.equal(line.length, SPRITE_GRID_WIDTH);
    }
  }
});

test("renderer keeps fixed grid height", () => {
  const original = componentById.legs_boots;
  try {
    componentById.legs_boots = {
      ...original,
      layers: [...original.layers, { rowOffset: 3, col: 2, text: "v", className: "sprite-main", zIndex: 0 }],
    };

    const preset = {
      hat: "hat_mage",
      face: "face_plain",
      arms: "arms_mage",
      torso: "torso_warrior",
      legs: "legs_boots",
    };
    const rendered = renderPresetToSprite(preset, "random");
    assert.equal(rendered.height, SPRITE_MIN_GRID_HEIGHT);
  } finally {
    componentById.legs_boots = original;
  }
});

test("random generator always returns slot-valid presets", () => {
  for (let i = 0; i < 400; i += 1) {
    const preset = buildRandomPreset();
    for (const slot of COMPONENT_SLOTS) {
      assert.ok(preset[slot], `missing ${slot}`);
    }
    assert.doesNotThrow(() => validatePresetOrThrow(preset));
    const rendered = renderPresetToSprite(preset, "random");
    assert.equal(rendered.width, SPRITE_GRID_WIDTH);
    assert.equal(rendered.height >= SPRITE_MIN_GRID_HEIGHT, true);
  }
});
