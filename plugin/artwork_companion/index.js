'use strict';

/*
 * Artwork One Companion.
 *
 * The interface is a set of static files: it has no place on the player to keep anything, so
 * a choice made in one browser never reached another — and a display the player drives on
 * HDMI has no way to be told anything at all. This plugin is that place. It keeps the theme
 * (dark, light, system) and the ambient display settings, answers a screen that asks for them,
 * and pushes every accepted change to all connected screens.
 *
 * Contract (the interface's side lives in components/aw-player-settings):
 *   callMethod miscellanea/artwork_companion getSettings {}        -> pushArtworkSettings to the caller
 *   callMethod miscellanea/artwork_companion setSettings {theme?, ambient?, pins?}
 *                                                                   -> pushArtworkSettings to everyone
 * A key is absent until someone chooses it: a fresh install answers {} and every screen keeps
 * what it had. A partial payload never clears the other key.
 *
 * The plugin lives under /data, where Volumio's own modules are not on the require path;
 * they are loaded from the core tree by name, so nothing has to be shipped or installed.
 */

function core(name) {
  try { return require(name); } catch (e) { return require('/volumio/node_modules/' + name); }
}
var libQ = core('kew');
var VConf = core('v-conf');
var fs = require('fs');
var path = require('path');

var THEMES = ['dark', 'light', 'system'];
var DELAYS = [0, 1, 2, 5, 10];
var LAYOUTS = ['cover', 'clock', 'bleed'];
var CLOCKS = ['24', '12'];
var EVENT = 'pushArtworkSettings';

module.exports = ArtworkCompanion;

function ArtworkCompanion(context) {
  this.context = context;
  this.commandRouter = context.coreCommand;
  this.logger = context.logger;
  this.configManager = context.configManager;
  this.config = new VConf();
}

ArtworkCompanion.prototype.getConfigurationFiles = function () {
  return ['config.json'];
};

ArtworkCompanion.prototype.onVolumioStart = function () {
  this.configFile = this.commandRouter.pluginManager.getConfigurationFile(this.context, 'config.json');
  this.config.loadFile(this.configFile);
  return libQ.resolve();
};

ArtworkCompanion.prototype.onStart = function () {
  this.logger.info('[artwork_companion] started; ' + JSON.stringify(this.snapshot()));
  return libQ.resolve();
};

ArtworkCompanion.prototype.onStop = function () { return libQ.resolve(); };
ArtworkCompanion.prototype.onRestart = function () {};

// --- the settings page: one line that says where the settings really are -------------------

ArtworkCompanion.prototype.getUIConfig = function () {
  var defer = libQ.defer();
  var lang = this.commandRouter.sharedVars.get('language_code');
  this.commandRouter.i18nJson(
    path.join(__dirname, 'i18n', 'strings_' + lang + '.json'),
    path.join(__dirname, 'i18n', 'strings_en.json'),
    path.join(__dirname, 'UIConfig.json')
  ).then(function (uiconf) { defer.resolve(uiconf); })
   .fail(function (e) { defer.reject(new Error(e)); });
  return defer.promise;
};

ArtworkCompanion.prototype.setUIConfig = function () {};
ArtworkCompanion.prototype.getConf = function (key) { return this.config.get(key); };
ArtworkCompanion.prototype.setConf = function (key, value) { this.config.set(key, value); };

// --- what the screens ask ------------------------------------------------------------------

// everything a screen needs, with only the keys that were ever chosen
ArtworkCompanion.prototype.snapshot = function () {
  var out = { version: 1 };
  var theme = this.config.get('theme');
  if (THEMES.indexOf(theme) > -1) { out.theme = theme; }
  var ambient = this.readAmbient();
  if (ambient) { out.ambient = ambient; }
  var pins = this.readPins();
  if (pins) { out.pins = pins; }
  return out;
};

// the pins: quick access on Home, up to 24, each only what a tile needs
ArtworkCompanion.prototype.readPins = function () {
  var raw = this.config.get('pins');
  if (!raw) { return null; }
  try { return this.cleanPins(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) { return null; }
};

ArtworkCompanion.prototype.cleanPins = function (list) {
  if (!Array.isArray(list)) { return null; }
  var out = [], seen = {};
  list.forEach(function (p) {
    if (!p || typeof p !== 'object' || !p.uri || seen[p.uri] || out.length >= 24) { return; }
    seen[p.uri] = true;
    var pin = { uri: String(p.uri).slice(0, 600), service: String(p.service || '').slice(0, 40), type: String(p.type || '').slice(0, 40), title: String(p.title || '').slice(0, 200) };
    if (p.albumart) { pin.albumart = String(p.albumart).slice(0, 600); }
    if (p.artist) { pin.artist = String(p.artist).slice(0, 200); }
    if (p.album) { pin.album = String(p.album).slice(0, 200); }
    out.push(pin);
  });
  return out;
};

ArtworkCompanion.prototype.readAmbient = function () {
  var raw = this.config.get('ambient');
  if (!raw) { return null; }
  try { return this.cleanAmbient(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch (e) { return null; }
};

// keeps only the fields the interface knows, each in its own range
ArtworkCompanion.prototype.cleanAmbient = function (a) {
  if (!a || typeof a !== 'object') { return null; }
  var out = {};
  if (typeof a.on === 'boolean') { out.on = a.on; }
  if (DELAYS.indexOf(Number(a.delay)) > -1) { out.delay = Number(a.delay); }
  if (LAYOUTS.indexOf(a.layout) > -1) { out.layout = a.layout; }
  if (CLOCKS.indexOf(String(a.clock)) > -1) { out.clock = String(a.clock); }
  if (typeof a.night === 'boolean') { out.night = a.night; }
  if (isTime(a.nightFrom)) { out.nightFrom = a.nightFrom; }
  if (isTime(a.nightTo)) { out.nightTo = a.nightTo; }
  return Object.keys(out).length ? out : null;
};

function isTime(v) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v || '')); }

// callMethod → answered to the caller only
ArtworkCompanion.prototype.getSettings = function () {
  return { message: EVENT, payload: this.snapshot() };
};

// callMethod → saved, then pushed to every screen
ArtworkCompanion.prototype.setSettings = function (data) {
  var d = data || {};
  var changed = false;
  if (d.theme !== undefined) {
    if (d.theme === null || d.theme === '') { this.config.set('theme', ''); changed = true; }   // '' = nobody chose; v-conf keeps the key
    else if (THEMES.indexOf(d.theme) > -1) { this.config.set('theme', d.theme); changed = true; }
    else { this.logger.warn('[artwork_companion] refused theme ' + JSON.stringify(d.theme)); }
  }
  if (d.ambient !== undefined) {
    if (d.ambient === null) { this.config.set('ambient', ''); changed = true; }
    else {
      // the patch is cleaned first: a field out of range is dropped, never the stored one
      var patch = this.cleanAmbient(d.ambient);
      if (patch) { this.config.set('ambient', JSON.stringify(Object.assign({}, this.readAmbient() || {}, patch))); changed = true; }
      else { this.logger.warn('[artwork_companion] refused ambient ' + JSON.stringify(d.ambient)); }
    }
  }
  if (d.pins !== undefined) {
    var pins = this.cleanPins(d.pins);
    if (pins) { this.config.set('pins', JSON.stringify(pins)); changed = true; }
    else { this.logger.warn('[artwork_companion] refused pins'); }
  }
  var snap = this.snapshot();
  if (changed) {
    this.logger.info('[artwork_companion] settings ' + JSON.stringify(snap));
    this.commandRouter.broadcastMessage(EVENT, snap);
  }
  return { message: EVENT, payload: snap };
};
