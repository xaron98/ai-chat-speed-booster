import test from 'node:test';
import assert from 'node:assert/strict';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/exporter.js');
const { serialize } = ACSB.exporter;

const SAMPLE = [
  { role: 'user', text: 'hi' },
  { role: 'assistant', text: 'hello there' },
  { role: 'user', text: 'how are you?' }
];

test('markdown is the default format', () => {
  const out = serialize(SAMPLE, undefined, { host: 'chatgpt.com' });
  assert.equal(out.ext, 'md');
  assert.equal(out.mime, 'text/markdown');
  assert.match(out.body, /^# /);
  assert.match(out.body, /## User/);
  assert.match(out.body, /## Assistant/);
  assert.match(out.body, /how are you\?/);
});

test('json format wraps messages with meta', () => {
  const out = serialize(SAMPLE, 'json', { host: 'chatgpt.com' });
  assert.equal(out.ext, 'json');
  assert.equal(out.mime, 'application/json');
  const parsed = JSON.parse(out.body);
  assert.equal(parsed.host, 'chatgpt.com');
  assert.equal(parsed.messages.length, 3);
  assert.equal(parsed.messages[0].role, 'user');
  assert.ok(parsed.exportedAt);
});

test('txt format is plain with role brackets', () => {
  const out = serialize(SAMPLE, 'txt', {});
  assert.equal(out.ext, 'txt');
  assert.equal(out.mime, 'text/plain');
  assert.match(out.body, /\[USER\]/);
  assert.match(out.body, /\[ASSISTANT\]/);
  assert.match(out.body, /---/);
});

test('unknown roles are labelled "message"', () => {
  const out = serialize([{ role: 'whatever', text: 'x' }], 'md', {});
  assert.match(out.body, /## Message/);
});

test('empty messages list still produces a valid document', () => {
  const md = serialize([], 'md', { host: 'h' });
  const json = serialize([], 'json', {});
  const txt = serialize([], 'txt', {});
  assert.match(md.body, /^# /);
  const parsed = JSON.parse(json.body);
  assert.deepEqual(parsed.messages, []);
  assert.equal(txt.body, '');
});

test('filename helper builds a slug from host + date', () => {
  const { buildFilename } = ACSB.exporter;
  const name = buildFilename({ host: 'chatgpt.com', ext: 'md' }, new Date('2026-05-09T12:34:56Z'));
  assert.equal(name, 'chatgpt-com-2026-05-09-1234.md');
});
