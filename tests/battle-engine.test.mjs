import test from 'node:test';
import assert from 'node:assert/strict';
import { runBattleTick } from '../packages/core/battle-engine.mjs';
import {
  detectPresetDominantBaseClass,
  getPresetCombatStats,
} from '../packages/core/sprite-constructor.js';

function withMockedRandom(sequence, fn) {
  const originalRandom = Math.random;
  let idx = 0;
  Math.random = () => {
    if (idx < sequence.length) {
      const value = sequence[idx];
      idx += 1;
      return value;
    }
    return 0.99;
  };
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

test('runBattleTick updates components/color/adjective/class and syncs combat stats from components', () => {
  const left = {
    id: 1,
    name: 'LEFT',
    templateKey: 'random',
    classId: 'mage',
    level: 5,
    hp: 1,
    attack: 1,
    colorTier: 'rare',
    adjective: 'Палмерин',
    components: {
      hat: 'hat_warrior',
      face: 'face_plain',
      arms: 'arms_warrior',
      torso: 'torso_warrior',
      legs: 'legs_boots',
    },
    logs: [],
    winStreak: 0,
    loseStreak: 0,
  };
  const right = {
    id: 2,
    name: 'RIGHT',
    templateKey: 'random',
    classId: 'warrior',
    level: 4,
    hp: 1,
    attack: 1,
    colorTier: 'rare',
    adjective: 'Палмерин',
    components: {
      hat: 'hat_cowboy',
      face: 'face_bandana',
      arms: 'arms_cowboy',
      torso: 'torso_cowboy',
      legs: 'legs_boots',
    },
    logs: [],
    winStreak: 0,
    loseStreak: 0,
  };

  withMockedRandom(Array.from({ length: 80 }, () => 0), () => {
    const result = runBattleTick([left, right]);
    assert.equal(result.fights, 1);
  });

  assert.ok(['seraph', 'uncommon'].includes(left.colorTier));
  assert.ok(['seraph', 'uncommon'].includes(right.colorTier));
  assert.notEqual(left.colorTier, right.colorTier);
  assert.notEqual(left.adjective, 'Палмерин');
  assert.notEqual(right.adjective, 'Палмерин');

  const slots = ['hat', 'face', 'arms', 'torso', 'legs'];
  const changedComponentsCount = slots.reduce((count, slot) => {
    if (left.components[slot] !== (slot === 'hat' ? 'hat_warrior'
      : slot === 'face' ? 'face_plain'
      : slot === 'arms' ? 'arms_warrior'
      : slot === 'torso' ? 'torso_warrior'
      : 'legs_boots')) {
      return count + 1;
    }
    if (right.components[slot] !== (slot === 'hat' ? 'hat_cowboy'
      : slot === 'face' ? 'face_bandana'
      : slot === 'arms' ? 'arms_cowboy'
      : slot === 'torso' ? 'torso_cowboy'
      : 'legs_boots')) {
      return count + 1;
    }
    return count;
  }, 0);
  assert.ok(changedComponentsCount >= 1);

  const leftStats = getPresetCombatStats(left.components);
  const rightStats = getPresetCombatStats(right.components);
  assert.equal(left.hp, leftStats.hp);
  assert.equal(left.attack, leftStats.attack);
  assert.equal(right.hp, rightStats.hp);
  assert.equal(right.attack, rightStats.attack);

  assert.equal(left.classId, detectPresetDominantBaseClass(left.components));
  assert.equal(right.classId, detectPresetDominantBaseClass(right.components));

  const leftLogText = left.logs.map((item) => item.text);
  const rightLogText = right.logs.map((item) => item.text);
  assert.ok(leftLogText.some((text) => text.includes('аура')));
  assert.ok(rightLogText.some((text) => text.includes('аура')));
});
