import test from 'node:test';
import assert from 'node:assert';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/collapser.js');
const { computeSplit } = ACSB.collapser;

test('no split below threshold', () => {
  assert.deepEqual(computeSplit({ messageCount: 10, threshold: 50 }), { collapseCount: 0, keepCount: 10 });
  assert.deepEqual(computeSplit({ messageCount: 50, threshold: 50 }), { collapseCount: 0, keepCount: 50 });
});

test('collapses overflow above threshold', () => {
  assert.deepEqual(computeSplit({ messageCount: 73,  threshold: 50 }), { collapseCount: 23, keepCount: 50 });
  assert.deepEqual(computeSplit({ messageCount: 200, threshold: 30 }), { collapseCount: 170, keepCount: 30 });
});

test('null threshold disables collapse', () => {
  assert.deepEqual(computeSplit({ messageCount: 500, threshold: null }), { collapseCount: 0, keepCount: 500 });
});

test('handles zero and negative defensively', () => {
  assert.deepEqual(computeSplit({ messageCount: 0,  threshold: 50 }), { collapseCount: 0, keepCount: 0 });
  assert.deepEqual(computeSplit({ messageCount: -5, threshold: 50 }), { collapseCount: 0, keepCount: 0 });
});
