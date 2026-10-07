// node --test: the plugin's bookkeeping with a fake Volumio (no device needed)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'artwork-one-'));
process.env.ARTWORK_ONE_TEST_ROOT = tmp;
// what a player has: the interface files, and the folders Volumio keeps its lists in
fs.mkdirSync(path.join(tmp, 'ui'), { recursive: true }); fs.writeFileSync(path.join(tmp, 'ui', 'index.html'), '<!doctype html>');
fs.mkdirSync(path.join(tmp, 'data', 'configuration', 'miscellanea', 'artwork_companion'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'volumio'), { recursive: true });
const Plugin = require('../plugin/artwork_one/index.js');

function fakeVolumio() {
  const calls = [];
  const sharedVars = { get: () => 'en' };
  const coreCommand = {
    sharedVars,
    pluginManager: { getConfigurationFile: () => path.join(tmp, 'config.json') },
    registerThirdPartyUI: (d) => calls.push(['register', d]),
    executeOnPlugin: (t, c, m, d) => calls.push(['exec', t, c, m, d]),
    broadcastMessage: (e, p) => calls.push(['broadcast', e, p]),
    pushToastMessage: (t, a, b) => calls.push(['toast', t, a, b]),
    i18nJson: (a, b, c) => { const libQ = require('kew'); return libQ.resolve(JSON.parse(fs.readFileSync(c, 'utf8'))); },
  };
  return { ctx: { coreCommand, logger: { info() {}, warn() {}, error() {} }, configManager: {} }, calls };
}

test('onStart registers the interface; onStop takes it out and switches a player that showed it', async () => {
  const { ctx, calls } = fakeVolumio();
  const p = new Plugin(ctx);
  p.onVolumioStart();
  await p.onStart();
  const list = JSON.parse(fs.readFileSync(p.paths.UI_LIST, 'utf8'));
  assert.equal(list.length, 1); assert.equal(list[0].uiName, 'artwork'); assert.ok(list[0].uiPath.endsWith('/ui'));
  assert.ok(calls.some(c => c[0] === 'register'));
  // the player shows it
  fs.writeFileSync(p.paths.ACTIVE_UI, JSON.stringify(p.uiEntry()));
  fs.writeFileSync(p.paths.CORE_UI_LIST, JSON.stringify([{ uiPrettyName: 'Manifest', uiName: 'manifest', uiPath: tmp }]));
  await p.onStop();
  assert.deepEqual(JSON.parse(fs.readFileSync(p.paths.UI_LIST, 'utf8')), []);
  assert.ok(calls.some(c => c[0] === 'exec' && c[3] === 'setVolumio3UI' && c[4].volumio3_ui.value === 'manifest'));
});

test('a second start does not duplicate the entry; a script install entry under the same name is replaced', async () => {
  const { ctx } = fakeVolumio();
  const p = new Plugin(ctx);
  p.onVolumioStart();
  fs.writeFileSync(p.paths.UI_LIST, JSON.stringify([{ uiPrettyName: 'Artwork One', uiName: 'artwork', uiPath: '/data/artwork-ui' }, { uiName: 'other', uiPath: '/x' }]));
  await p.onStart(); await p.onStart();
  const list = JSON.parse(fs.readFileSync(p.paths.UI_LIST, 'utf8'));
  assert.equal(list.filter(u => u.uiName === 'artwork').length, 1);
  assert.equal(list.filter(u => u.uiName === 'other').length, 1);
});

test('settings: a bad field is refused, a good one kept and pushed with the plugin named', async () => {
  const { ctx, calls } = fakeVolumio();
  const p = new Plugin(ctx);
  p.onVolumioStart();
  p.setSettings({ theme: 'purple' });
  assert.equal(p.snapshot().theme, undefined);
  const r = p.setSettings({ theme: 'light', ambient: { delay: 99, layout: 'clock' } });
  assert.equal(r.payload.theme, 'light');
  assert.equal(r.payload.ambient.layout, 'clock'); assert.equal(r.payload.ambient.delay, undefined);
  assert.equal(r.payload.plugin, 'user_interface/artwork_one');
  assert.ok(calls.some(c => c[0] === 'broadcast' && c[1] === 'pushArtworkSettings'));
});

test('onStart without ui/index.html rejects instead of throwing (the player keeps running)', async () => {
  const { ctx } = fakeVolumio();
  const p = new Plugin(ctx);
  p.onVolumioStart();
  p.paths.UI_DIR = path.join(tmp, 'no-ui');
  let failed = false;
  await p.onStart().then(() => {}, () => { failed = true; });
  assert.equal(failed, true);
});

test('stopped while active, the next start brings the interface back (an update, or an undone disable)', async () => {
  const { ctx, calls } = fakeVolumio();
  const p = new Plugin(ctx);
  p.onVolumioStart();
  await p.onStart();
  fs.writeFileSync(p.paths.ACTIVE_UI, JSON.stringify(p.uiEntry()));
  fs.writeFileSync(p.paths.CORE_UI_LIST, JSON.stringify([{ uiPrettyName: 'Manifest', uiName: 'manifest', uiPath: tmp }]));
  await p.onStop();
  // the fake Appearance plugin did nothing, so the file still says Manifest... (as the core wrote it)
  fs.writeFileSync(p.paths.ACTIVE_UI, JSON.stringify({ uiPrettyName: 'Manifest', uiName: 'manifest', uiPath: tmp }));
  assert.equal(p.config.get('wasActive'), true);
  calls.length = 0;
  await p.onStart();
  assert.ok(calls.some(c => c[0] === 'exec' && c[3] === 'setVolumio3UI' && c[4].volumio3_ui.value === 'artwork'), 'asked Appearance to switch');
  assert.equal(JSON.parse(fs.readFileSync(p.paths.ACTIVE_UI, 'utf8')).uiName, 'artwork', 'and did it by hand when Appearance could not');
  assert.equal(p.config.get('wasActive'), false);
  // a stop while another interface was active changes nothing on the next start
  fs.writeFileSync(p.paths.ACTIVE_UI, JSON.stringify({ uiPrettyName: 'Manifest', uiName: 'manifest', uiPath: tmp }));
  await p.onStop();
  calls.length = 0;
  await p.onStart();
  assert.ok(!calls.some(c => c[0] === 'exec' && c[3] === 'setVolumio3UI'));
});
