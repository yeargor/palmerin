import test from "node:test";
import assert from "node:assert/strict";
import {
  COMBAT_STAT_MAX,
  COMBAT_STAT_MIN,
  SPRITE_GRID_WIDTH,
  SPRITE_MIN_GRID_HEIGHT,
  COMPONENT_SLOTS,
  buildRandomPreset,
  characterPresetByClassId,
  componentById,
  detectPresetDominantBaseClass,
  getPresetColorTierWeights,
  getPresetCombatStats,
  renderPresetToSprite,
  validatePresetOrThrow,
} from "../packages/core/sprite-constructor.js";

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

test("dominant base class is resolved from majority of component classes", () => {
  const mageMajorityPreset = {
    hat: "hat_warrior",
    face: "face_plain",
    arms: "arms_mage_mantle_top",
    torso: "torso_mage",
    legs: "legs_boots",
  };
  assert.equal(detectPresetDominantBaseClass(mageMajorityPreset), "mage");

  const cowboyMajorityPreset = {
    hat: "hat_cowboy",
    face: "face_bandana",
    arms: "arms_cowboy",
    torso: "torso_warrior",
    legs: "legs_boots",
  };
  assert.equal(detectPresetDominantBaseClass(cowboyMajorityPreset), "cowboy");
});

test("default class presets follow HP/ATTACK balance rules", () => {
  const warriorStats = getPresetCombatStats(characterPresetByClassId.warrior);
  const mageStats = getPresetCombatStats(characterPresetByClassId.mage);
  const cowboyStats = getPresetCombatStats(characterPresetByClassId.cowboy);

  assert.ok(warriorStats.hp > warriorStats.attack, "warrior should be hp-heavy");
  assert.ok(cowboyStats.attack > cowboyStats.hp, "cowboy should be attack-heavy");
  assert.ok(
    Math.abs(mageStats.hp - mageStats.attack) <= 1,
    "mage should be balanced between hp and attack",
  );
});

test("shirt and boots each give 1 HP and 1 ATTACK", () => {
  assert.equal(componentById.arms_mage.stats.hp, 1);
  assert.equal(componentById.arms_mage.stats.attack, 1);
  assert.equal(componentById.legs_boots.stats.hp, 1);
  assert.equal(componentById.legs_boots.stats.attack, 1);
});

test("combat stats are clamped to configured bounds", () => {
  const original = componentById.arms_cowboy;
  try {
    componentById.arms_cowboy = {
      ...original,
      stats: { hp: 1000, attack: 1000 },
    };

    const stats = getPresetCombatStats(characterPresetByClassId.cowboy);
    assert.equal(stats.hp, COMBAT_STAT_MAX);
    assert.equal(stats.attack, COMBAT_STAT_MAX);
  } finally {
    componentById.arms_cowboy = original;
  }

  const stats = getPresetCombatStats({
    hat: "hat_cowboy",
    face: "face_bandana",
    arms: "arms_cowboy",
    torso: "torso_cowboy",
    legs: "legs_boots",
  });
  assert.ok(stats.hp >= COMBAT_STAT_MIN);
  assert.ok(stats.attack >= COMBAT_STAT_MIN);
});

test("stronger presets shift color weight from blue tiers to rare tiers", () => {
  const lowPreset = {
    hat: "hat_cowboy",
    face: "face_plain",
    arms: "arms_mage",
    torso: "torso_cowboy",
    legs: "legs_boots",
  };
  const highPreset = {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_cowboy",
    torso: "torso_mage",
    legs: "legs_boots",
  };

  const low = getPresetColorTierWeights(lowPreset);
  const high = getPresetColorTierWeights(highPreset);

  assert.ok(high.quality > low.quality);
  assert.ok(high.weights.amber > low.weights.amber);
  assert.ok(high.weights.reggae > low.weights.reggae);
  assert.ok(high.weights.palmerin > low.weights.palmerin);
  assert.ok(high.weights.uncommon < low.weights.uncommon);
});

test("higher max stat smoothly reduces blue tiers and boosts rare tiers", () => {
  const belowSeven = {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_mage",
    torso: "torso_cowboy",
    legs: "legs_boots",
  }; // 5/6
  const atLeastSeven = {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_warrior",
    torso: "torso_mage",
    legs: "legs_boots",
  }; // 6/7
  const atLeastNine = {
    hat: "hat_mage",
    face: "face_plain",
    arms: "arms_cowboy",
    torso: "torso_mage",
    legs: "legs_boots",
  }; // 5/9

  const low = getPresetColorTierWeights(belowSeven).weights;
  const mid = getPresetColorTierWeights(atLeastSeven).weights;
  const high = getPresetColorTierWeights(atLeastNine).weights;

  const blueLow = low.uncommon + low.rare;
  const blueMid = mid.uncommon + mid.rare;
  const blueHigh = high.uncommon + high.rare;
  assert.ok(blueLow > blueMid);
  assert.ok(blueMid > blueHigh);

  const rareLow = low.amber + low.reggae + low.palmerin;
  const rareMid = mid.amber + mid.reggae + mid.palmerin;
  const rareHigh = high.amber + high.reggae + high.palmerin;
  assert.ok(rareLow <= rareMid);
  assert.ok(rareMid < rareHigh);
});
