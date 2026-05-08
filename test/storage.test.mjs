import test from 'node:test';
import assert from 'node:assert';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/storage.js');
const { defaultSettings, validateSettings } = ACSB.storage;

test('default settings are enabled and Auto', () => {
  assert.deepEqual(defaultSettings(), { enabled: true, threshold: 'auto' });
});

test('valid settings pass through unchanged', () => {
  assert.deepEqual(validateSettings({ enabled: false, threshold: 100 }), { enabled: false, threshold: 100 });
  assert.deepEqual(validateSettings({ enabled: true,  threshold: 'auto' }), { enabled: true, threshold: 'auto' });
});

test('invalid threshold falls back to auto', () => {
  assert.equal(validateSettings({ enabled: true, threshold: 42 }).threshold, 'auto');
  assert.equal(validateSettings({ enabled: true, threshold: 'tons' }).threshold, 'auto');
  assert.equal(validateSettings({ enabled: true, threshold: null }).threshold, 'auto');
});

test('non-boolean enabled falls back to true', () => {
  assert.equal(validateSettings({ enabled: 'yes', threshold: 50 }).enabled, true);
  assert.equal(validateSettings({ enabled: undefined, threshold: 50 }).enabled, true);
});

test('completely missing settings yields defaults', () => {
  assert.deepEqual(validateSettings(undefined), defaultSettings());
  assert.deepEqual(validateSettings(null), defaultSettings());
  assert.deepEqual(validateSettings({}), defaultSettings());
});
