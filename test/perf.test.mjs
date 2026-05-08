import test from 'node:test';
import assert from 'node:assert/strict';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/perf.js');
const { decideThreshold } = ACSB.perf;

const STEPS = [30, 50, 100, 200];

test('drops one step when jank ratio > 25%', () => {
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 200, sustainedLowJankSeconds: 0 }), 100);
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 100, sustainedLowJankSeconds: 0 }), 50);
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 50,  sustainedLowJankSeconds: 0 }), 30);
});

test('clamps at the lowest step', () => {
  assert.equal(decideThreshold({ jankRatio: 0.9, currentThreshold: 30, sustainedLowJankSeconds: 0 }), 30);
});

test('holds in the 5%-25% band', () => {
  for (const t of STEPS) {
    assert.equal(decideThreshold({ jankRatio: 0.1, currentThreshold: t, sustainedLowJankSeconds: 0 }), t);
    assert.equal(decideThreshold({ jankRatio: 0.05, currentThreshold: t, sustainedLowJankSeconds: 0 }), t);
  }
});

test('raises one step when jank < 5% sustained 30s', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 30,  sustainedLowJankSeconds: 30 }), 50);
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 50,  sustainedLowJankSeconds: 30 }), 100);
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 100, sustainedLowJankSeconds: 30 }), 200);
});

test('does not raise without 30s sustained', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 50, sustainedLowJankSeconds: 29 }), 50);
});

test('clamps at the highest step', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 200, sustainedLowJankSeconds: 60 }), 200);
});
