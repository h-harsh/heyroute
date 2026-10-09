import test from 'node:test';
import assert from 'node:assert/strict';
import { createController } from '../extension/controller.js';
import { DEFAULTS } from '../extension/core.js';

function fixture() {
  const base = { mode: 'system' };
  let setting = { levelOfControl: 'controllable_by_this_extension', value: base };
  let stored = {};
  let failStorage = false;
  let denyApply = false;
  const calls = [];
  const api = {
    proxy: { settings: {
      get: async () => structuredClone(setting),
      set: async (details) => {
        calls.push(['set', details]);
        if (!denyApply) setting = { levelOfControl: 'controlled_by_this_extension', value: structuredClone(details.value) };
      },
      clear: async (details) => {
        calls.push(['clear', details]);
        setting = { levelOfControl: 'controllable_by_this_extension', value: base };
      },
    } },
    storage: {
      local: {
        get: async () => structuredClone(stored),
        set: async (value) => { if (failStorage) throw new Error('Disk failure'); stored = structuredClone(value); },
        remove: async () => { stored = {}; },
      },
      session: { get: async () => ({}), remove: async () => {} },
    },
  };
  return { controller: createController(api), calls,
    get stored() { return stored; },
    set stored(value) { stored = value; },
    set setting(value) { setting = value; },
    set failStorage(value) { failStorage = value; },
    set denyApply(value) { denyApply = value; },
  };
}
const valid = { port: 1080, domains: ['app.example.com'], directAcknowledged: true };
const save = (f, settings = valid) => f.controller.dispatch({ type: 'save', settings });

test('saving new rules does not enable or leave an override', async () => {
  const f = fixture();
  const result = await save(f);
  assert.equal(result.active, false);
  assert.equal(result.settings.enabled, false);
  assert.ok(f.calls.every(([method]) => method === 'clear'));
});
test('enable verifies ownership, uses regular_only, and disable clears override', async () => {
  const f = fixture();
  await save(f);
  assert.equal((await f.controller.dispatch({ type: 'enable' })).active, true);
  assert.equal(f.calls.at(-1)[1].scope, 'regular_only');
  assert.equal((await f.controller.dispatch({ type: 'disable' })).active, false);
  assert.equal(f.calls.at(-1)[0], 'clear');
});
test('empty rules and missing acknowledgement never install a proxy', async () => {
  const f = fixture();
  await assert.rejects(f.controller.dispatch({ type: 'enable' }), /hostname/);
  await save(f, { ...valid, directAcknowledged: false });
  await assert.rejects(f.controller.dispatch({ type: 'enable' }), /Confirm direct/);
  assert.ok(!f.calls.some(([method]) => method === 'set'));
});
test('managed policy and competing extension are not overwritten', async () => {
  for (const levelOfControl of ['not_controllable', 'controlled_by_other_extensions']) {
    const f = fixture();
    await save(f);
    f.setting = { levelOfControl, value: { mode: 'system' } };
    await assert.rejects(f.controller.dispatch({ type: 'enable' }));
    assert.ok(!f.calls.some(([method]) => method === 'set'));
  }
});
test('unexpected effective proxy triggers rollback', async () => {
  const f = fixture();
  await save(f);
  f.denyApply = true;
  await assert.rejects(f.controller.dispatch({ type: 'enable' }), /did not apply/);
  assert.equal(f.stored.settings.enabled, false);
  assert.equal(f.calls.at(-1)[0], 'clear');
});
test('failed persistence restores the previous active rules', async () => {
  const f = fixture();
  await save(f);
  await f.controller.dispatch({ type: 'enable' });
  f.failStorage = true;
  await assert.rejects(save(f, { ...valid, port: 2222 }), /previous routing restored/);
  assert.equal(f.calls.at(-1)[1].value.pacScript.data.includes('127.0.0.1:1080'), true);
  assert.equal((await f.controller.dispatch({ type: 'status' })).active, true);
});
test('restart keeps owned active settings but never reclaims another controller', async () => {
  const f = fixture();
  await save(f);
  await f.controller.dispatch({ type: 'enable' });
  assert.equal((await f.controller.reconcile()).active, true);
  f.setting = { levelOfControl: 'controlled_by_other_extensions', value: { mode: 'system' } };
  const before = f.calls.length;
  const result = await f.controller.reconcile();
  assert.equal(f.calls.length, before);
  assert.equal(result.active, false);
  assert.match(result.problem, /Another extension/);
});
test('corrupt preferences can still be disabled and reset', async () => {
  const f = fixture();
  f.stored = { settings: { enabled: true, port: 'broken' } };
  assert.match((await f.controller.dispatch({ type: 'status' })).problem, /port/);
  assert.equal((await f.controller.dispatch({ type: 'disable' })).active, false);
  await f.controller.dispatch({ type: 'reset' });
  assert.deepEqual(f.stored, {});
  assert.deepEqual((await f.controller.dispatch({ type: 'status' })).settings, DEFAULTS);
});
test('restart restores enabled rules over an unclaimed base, never an existing PAC', async () => {
  const f = fixture();
  f.stored = { settings: { ...DEFAULTS, ...valid, enabled: true } };
  assert.equal((await f.controller.reconcile()).active, true);
  f.setting = { levelOfControl: 'controllable_by_this_extension', value: { mode: 'pac_script', pacScript: { data: 'other' } } };
  const before = f.calls.length;
  assert.equal((await f.controller.reconcile()).active, false);
  assert.equal(f.calls.length, before);
});
test('queued enable then disable leaves no installed proxy', async () => {
  const f = fixture();
  await save(f);
  await Promise.all([f.controller.dispatch({ type: 'enable' }), f.controller.dispatch({ type: 'disable' })]);
  assert.equal((await f.controller.dispatch({ type: 'status' })).active, false);
  assert.equal(f.calls.at(-1)[0], 'clear');
});
test('save cannot smuggle an enabled state or arbitrary proxy host', async () => {
  const f = fixture();
  const status = await save(f, { ...valid, enabled: true, host: 'evil.example.com' });
  assert.equal(status.settings.enabled, false);
  assert.equal(status.settings.host, undefined);
});
