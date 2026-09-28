const widget_utils = require('widget_utils');
const buzz = require('buzz');
var settings;

// #region XXX: Ensure these are kept in sync between settings.js and app.js
const storage = require('Storage');
const global_settings = storage.readJSON("setting.json", true) || {};
function readSettings() {
  return storage.readJSON(SETTINGS_FILE, 1) || {};
}
function writeSettings(s) {
  storage.write(SETTINGS_FILE, s);
}
function loadSettings() {
  return normalizeSettings(readSettings());
}
function saveSettings(s) {
  writeSettings(denormalizeSettings(s, pendingTimeCat));
}

function ym(date) {
  return date.toLocalISOString().substring(0, 7);
}
function logCurFilenameBase() {
  return `harvester-${ym(new Date())}`;
}

/** @returns Sorted list of disjoint filenames for historical logs, most current last */
function logCurFilenames() {
  return storage.list(new RegExp(logCurFilenameBase() + `.*\.csv`), { sf: true }).sort();
}

function logHeader() {
  var cats = settings.fruitful.slice(1).concat(
    settings.decentering.slice(1).reverse()
  ).map(c=>c.title.includes(',') ? '"' + c.title + '"' : c.title);
  // TODO: Include targets? Probably requires triggering changeovers more often
  return 'Date,Early Switches,' + cats.join(',') + "\n";
}

function logStartNew(prevList) {
  var nextSuffix = '';
  if (prevList.length > 0) {
    let last = prevList[prevList.length - 1];
    let m = last.match(/_([0-9A-Z])\./), suffix = m ? m[1] : '0';
    nextSuffix = '_' + (parseInt(suffix, 36) + 1).toString(36);
  }
  let sf = storage.open((logCurFilenameBase() + nextSuffix + '.csv'), 'w');
  sf.write(logHeader());
  return sf;
}
// #endregion
// #region XXX: Ensure these are kept in sync between settings.js, loader-settings.js, and app.js
const SETTINGS_FILE = "harvester.json";
const firstDayOfWeek = global_settings.firstDayOfWeek || 0;
function getDefaultSettings() {
  var id1 = Math.round(Date.now()), id2 = id1 + 1; // XXX: Use proper UUIDs, probably with TS
  return {
    fruitful: [
      {},
      {
        color: 'Green', fg: '#0f0', gy: '#020',
        title: 'Work',
        target_min: 480, sec_today: 0, id: id1,
        target_min_override: new Array(7).fill(-1),
      },
    ],
    hour_color: 'Green',
    hour_fg: '#0f0',
    clock_info_color: 'Green',
    clock_info_fg: '#0f0',
    clock_info_gy: '#020',
    cur_mode: 0,
    last_reset: null,
    decentering: [
      {},
      {
        title: 'Social Media', sec_today: 0, id: id2,
        fg: '#f00', gy: '#200', color: 'Red',
      }
    ],
    fallow_denominator: 3,
    fallow_buffer: 0,
  };
}
function normalizeCat(cat, i, _arr) {
  if (0 === i) return cat; // XXX: Skip sentinels
  // TODO: Normalize or guess at next colors?
  cat.fg = cat.fg || g.theme.fg;
  cat.gy = cat.gy || '#222';
  cat.title = cat.title || '??';
  cat.sec_today = 0 | cat.sec_today;
  if (cat.target_min) {
    cat.target_min = 0 | cat.target_min;
    cat.target_min_override = cat.target_min_override || new Array(7).fill(-1);
  }
  if (!cat.id) {
    // TODO: Use proper UUID, probably via TS library
    if (!normalizeCat._seq) {
      normalizeCat._seq = 0;
    }
    cat.id = Math.round(Date.now()) + normalizeCat._seq++;
  }
  if (null == cat.sec_this_week && cat.target_min) {
    let daysBackfill = new Date().getDay() - firstDayOfWeek;
    cat.sec_this_week = daysBackfill * cat.target_min * 60;
  } else if (null == cat.sec_this_week) {
    cat.sec_this_week = 0;
  }
  return cat;
}
function normalizeSettings(s) {
  var def = getDefaultSettings();
  if (s.fruitful) {
    s.fruitful = s.fruitful.map(normalizeCat);
  } else {
    s.fruitful = def.fruitful;
  }
  if (s.decentering) {
    s.decentering = s.decentering.map(normalizeCat);
  } else {
    s.decentering = def.decentering;
  }
  if (s.total_sec_by_cat) {
    for (let i = 1; i < s.fruitful.length; i++) {
      s.fruitful[i].sec_today = s.total_sec_by_cat[i];
    }
    for (let i = 1; i < s.decentering.length; i++) {
      s.decentering[i].sec_today = s.total_sec_by_cat[s.total_sec_by_cat.length - i];
    }
    s.fallow_buffer = s.total_sec_by_cat[0];
  }

  for (let k in def) {
    if (k == 'fruitful' || k == 'decentering' || k == 'total_sec_by_cat') continue;
    s[k] = s[k] || def[k];
  }

  return s;
}
function denormalizeSettings(s, pendingTimeCat) {
  delete s.hr_12; // TODO: Allow setting this independently
  if (pendingTimeCat) {
    for (let i = 1; i < s.fruitful.length; i++) {
      s.fruitful[i].sec_today = pendingTimeCat[i];
    }
    for (let i = 1; i < s.decentering.length; i++) {
      s.decentering[i].sec_today = pendingTimeCat[pendingTimeCat.length - i];
    }
    s.fallow_buffer = pendingTimeCat[0];
  }
  if (s.total_sec_by_cat) {
    delete s.total_sec_by_cat;
  }
  return s;
}
// #endregion

// #region XXX: Ensure these are kept in sync between loader-settings.js and app.js
function totalTargetMin(fruitful) {
  return fruitful.target_min_override.reduce((acc, c, _i, _arr) =>
                                   acc + (c >= 0 ? c : fruitful.target_min), 0);
}
// #endregion

function totalTargetMinFrom(fruitful, today) {
  return fruitful.target_min_override.slice(today).reduce((acc, c, _i, _arr) =>
                                   acc + (c >= 0 ? c : fruitful.target_min), 0);
}

/* exported reloadFromWeb */
function reloadFromWeb() {
  setTimeout(() => {
    // Best-effort attempt to match pendingTimeCat by "ID" (creation TS)
    let prev = {};
    for (let i = 1; i < settings.fruitful.length; i++) {
      let id = settings.fruitful[i].id;
      if (id) prev[id] = at(pendingTimeCat, i);
    }
    for (let i = 1; i < settings.decentering.length; i++) {
      let id = settings.decentering[i].id;
      if (id) prev[id] = at(pendingTimeCat, -i);
    }
    loadRuntimeSettings();
    for (let i = 1; i < settings.fruitful.length; i++) {
      let id = settings.fruitful[i].id;
      if (id) setAt(pendingTimeCat, i, 0 | prev[id]);
    }
    for (let i = 1; i < settings.decentering.length; i++) {
      let id = settings.decentering[i].id;
      if (id) setAt(pendingTimeCat, -i, 0 | prev[id]);
    }
    clearDrawingCache();
    drawFace();
  }, 10);
  return true;
}

const H = g.getHeight(), W = g.getWidth(), X_C = W/2, Y_C = H/2;

const FIRST_DECENTER_IDX = -1, FALLOW_IDX = 0, FIRST_FRUITFUL_IDX = 1;

const PAL_BG_ALIAS = 15, PAL_FALLOW_ALIAS = 14;

var totalMin;
var fallowScale, palRing;
// palCat has the size of a normal palette (16) but is indexable from either end
var palCat, modeCat, pendingTimeCat;
var palCI;
// FCat arrays are shorter than others but have synchronized indexing as far as possible
var targetMinFCat, startFCat, endFCat;

const CLK_Y = Y_C + 3;
const CLK_HALF_W = 112 / 2, CLK_HALF_H = 46 / 2, CLK_BG_Y = CLK_Y - 5;

const CI_GAUGE_Y = CLK_BG_Y + CLK_HALF_H + 5;
const CI_GAUGE_W = 100, CI_GAUGE_X = X_C - CI_GAUGE_W / 2, CI_GAUGE_H = 6;
const CI_TEXT_Y = 36, CI_TEXT_W = 64, CI_TEXT_X = X_C - CI_TEXT_W / 2, CI_TEXT_H = 24;

const RI_GAUGE = 0, RI_SEGMENT = 1, RI_OVERFLOW_GAUGE = 2;
/* const RI_FALLOW_SEGMENT = 3, RI_FALLOW_INNER = 4, RI_FALLOW_GAUGE = 5; */

const RING_THICK_GAUGE = 8, RING_THICK_SEGMENT = 4;
function calcRadii() {
  const RING_EDGE = 1;

  const base = Math.min(W / 2, H / 2) - RING_EDGE;
  const seg = base - RING_THICK_GAUGE;
  const overflow = seg - RING_THICK_SEGMENT;
  const fallowSeg = overflow - RING_THICK_GAUGE;
  const fallowInner = fallowSeg - RING_THICK_SEGMENT;
  return new Uint8Array([base, seg, overflow, fallowSeg, fallowInner]);
}
const RAD = calcRadii();

const nextUpdateMs = 60000;

var prevDrawnTime, prevDrawnSegment = [];

const HR_RESET = 3; // Reset (and eventually save) totals at a time few will be awake

const BANGLEJS2 = process.env.HWVERSION == 2;
const EMULATOR = process.env.BOARD.startsWith("EMSCRIPTEN");

var DEBUGGING = false;
function log_debug(o) {
  if (DEBUGGING) print(o);
}
function curMs() { return Math.round(Date.now()); }
function measureEffectDuration(f) {
  var s = curMs();
  f();
  return curMs() - s;
}

const MIN = 60;

function at(arr, i) {
  "jit";
  if (i < 0) i += arr.length;
  return arr[i];
}
function setAt(arr, i, v) {
  "jit";
  if (i < 0) i += arr.length;
  return arr[i] = v;
}

const MAX_SEC = 24 * 60 * MIN;

function getMin(i) {
  "jit";
  return floor(at(pendingTimeCat, i) / MIN);
}
var lastBuzzCheck = 0;
function addFruitful(i, sec) {
  if (i < FIRST_FRUITFUL_IDX) throw new Error("Can't track fruitful time with i=" + i);
  pendingTimeCat[FALLOW_IDX] += Math.ceil(sec / settings.fallow_denominator);
  if (pendingTimeCat[FALLOW_IDX] < 0) pendingTimeCat[FALLOW_IDX] = 0;
  const result = pendingTimeCat[i] += sec;
  const targetMin = targetMinFCat[i], secThreshold = targetMin * MIN;
  const secCheckWindow = Math.round((new Date().valueOf() - lastBuzzCheck) / 1000);
  if (result >= secThreshold && result < secThreshold + secCheckWindow) {
    log_debug('Reached target for ' + modeCat[i] + ' (' + targetMin + ' min)');
    setTransientMsg('Done!');
    // TODO: Improve
    buzz.pattern('=');
  }
  lastBuzzCheck = new Date().valueOf();
  return result;
}
function useRecenter(sec) {
  /* sec=60, buf=120; used=60
     sec=60, buf=30; used=30
     sec=60, buf=0; used=0
   */
  var fallow_used_sec = sec;
  if (sec > 0) {
    fallow_used_sec = E.clip(pendingTimeCat[FALLOW_IDX], 0, sec);
    if (fallow_used_sec > 0 && fallow_used_sec < sec) {
      if (tsFallowRanDry) {
        log_debug(`Overwriting tsFallowRanDry from ${tsFallowRanDry} to ${curMs()}!`);
      }
      tsFallowRanDry = curMs();
    }
  }
  pendingTimeCat[FALLOW_IDX] -= fallow_used_sec;
  return sec - fallow_used_sec;
}
function useDecenter(i, sec) {
  if (i > FIRST_DECENTER_IDX) throw new Error("can't treat " + i + " as decentering");
  var excess_sec = useRecenter(sec);
  var remaining = pendingTimeCat[FALLOW_IDX];
  let newTotal = at(pendingTimeCat, i) + excess_sec;
  let secCheckWindow = Math.round((new Date().valueOf() - lastBuzzCheck) / 1000);
  if (0 === remaining) {
    log_debug(`${sec} - ${remaining} = ${excess_sec} (vs ${secCheckWindow}) => ${newTotal}`);
    if (excess_sec > 0 && excess_sec < secCheckWindow) {
      setTransientMsg('<0min');
      buzz.pattern('==  ==');
    } else if (newTotal % (5 * MIN) < secCheckWindow) {
      setTransientMsg('-5m!');
      buzz.pattern('= = = = =');
    }
  } else {
    // TODO: Allow configuring times
    var earlyWarning = [
      {threshold: 5 * MIN, pattern: ':  :'},
      {threshold: 1 * MIN, pattern: ';  ;'},
    ];
    for (let warn of earlyWarning) {
      if (remaining <= warn.threshold && remaining > warn.threshold - secCheckWindow) {
        log_debug(`${remaining} just dropped below ${warn.threshold} (by < ${secCheckWindow})`);
        setTransientMsg(`${warn.threshold / MIN}min`);
        buzz.pattern(warn.pattern);
        break;
      }
    }
  }
  lastBuzzCheck = new Date().valueOf();
  return setAt(pendingTimeCat, i, newTotal);
}

/** Generically picks the right method to use for the mode class. Accepts even
 *  negative time spent.
 */
function spendTime(mode, sec) {
  if (mode <= FIRST_DECENTER_IDX) {
    useDecenter(mode, sec);
  } else if (mode >= FIRST_FRUITFUL_IDX) {
    addFruitful(mode, sec);
  } else {
    useRecenter(sec);
  }
}

var tsFallowRanDry, secFallowFixupEligible = 0;
/** For correcting human error in switching modes later than one should have.
 *  Does not include additional fallow accumulations/usage.
 *  @returns 2-tuple with the amount to be added to current and the amount to be
 *           subtracted from previous.
 */
function lateStartAdjustments(totalSecByCat, curMode, prevMode, secDesired) {
  let secAvailable = Math.min(at(totalSecByCat, prevMode), secDesired);
  if (FALLOW_IDX === curMode && prevMode >= FIRST_FRUITFUL_IDX) {
    // Subtract fruitful time not spent (plus additional fallow time not accumulated)
  } else if (curMode >= FIRST_FRUITFUL_IDX && prevMode >= FIRST_FRUITFUL_IDX) {
    // Subtract fruitful time spent in other category
  } else if (curMode >= FIRST_FRUITFUL_IDX && FALLOW_IDX === prevMode) {
    // (Will re-accumulate additional fallow time)
    // TODO: Re-add bound with another var to track fallow *start*
    secAvailable = secDesired;
    let secSpare = E.clip(secDesired, 0, secFallowFixupEligible);
    return [secAvailable, secSpare];
  } else if (curMode <= FIRST_DECENTER_IDX && prevMode >= FIRST_FRUITFUL_IDX) {
    // Subtract fruitful time and use up fallow time
    return [secDesired, secAvailable];
  } else if (curMode <= FIRST_DECENTER_IDX && FALLOW_IDX === prevMode) {
    // Leave as much fallow time as possible in place, adding only the difference
    secAvailable = secDesired - secAvailable;
    return [secAvailable, 0];
  } else {
    // Other possibilities are technically sane but should be rare and aren't worth testing (yet?)
    return [0, 0];
  }
  // Normally this is all that's needed
  return [secAvailable, secAvailable];
}

// https://www.1001fonts.com/rounded-fonts.html?page=3
Graphics.prototype.setFontBloggerSansLight46 = function (scale) {
  // Actual height 46 (45 - 0)
  this.setFontCustom(atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAA/AAAAAAAAPwAAAAAAAD4AAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAH/gAAAAAAP/wAAAAAAf/gAAAAAAf/AAAAAAA//AAAAAAB/+AAAAAAD/8AAAAAAH/4AAAAAAH/wAAAAAAP/gAAAAAAf/gAAAAAA//AAAAAAB/+AAAAAAA/8AAAAAAAP4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///8AAAAP////4AAAP/////AAAH/////4AAD+AAAB/AAA8AAAAHwAAeAAAAA+AAHgAAAAHgADwAAAAB4AA8AAAAAPAAPAAAAADwADwAAAAA8AA8AAAAAPAAPAAAAADwAB4AAAAB4AAeAAAAAeAAHwAAAAPgAA/AAAAPwAAH/////4AAA/////8AAAH////+AAAAf///+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAPAAAAAAAAHwAAAAAAAB4AAAAAAAA+AAAAAAAAfAAAAAAAAHgAAAAAAAD4AAAAAAAB8AAAAAAAAeAAAAAAAAPgAAAAAAADwAAAAAAAB//////4AAf//////AAH//////gAA//////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAD4AAHAAAAD+AAD4AAAB/gAA8AAAB/4AAfAAAA/+AAHgAAAf3gAB4AAAPx4AA8AAAH4eAAPAAAD4HgADwAAB8B4AA8AAA+AeAAPAAAfAHgADwAAPgB4AA8AAHwAeAAHgAD4AHgAB4AD8AB4AAfAB+AAeAAD8B/AAHgAAf//gAB4AAH//wAAeAAAf/wAAHgAAB/wAAA4AAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AADgAAAAPAAB4AAAADwAAeAAAAA+AAHgAAAAHgAB4ABgAB4AAeAA8AAeAAHgA/AADwAB4AfwAA8AAeAP8AAPAAHgH/AADwAB4H7wAA8AAeD48AAPAAHh8PAAHgAB5+BwAB4AAe/AeAA+AAH/AHwAfAAB/gA/AfgAAfwAH//wAAHwAA//4AAA4AAH/8AAAAAAAf4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAD+AAAAAAAD/gAAAAAAH/4AAAAAAH/+AAAAAAP/ngAAAAAP/h4AAAAAf/AeAAAAAf/AHgAAAA/+AB4AAAA/+AAeAAAB/8AAHgAAA/8AAB4AAAP4AAAeAAAB4AAAHgAAAAAAAB4AAAAAAAAeAAAAAAP///4AAAAH////AAAAA////gAAAAP///4AAAAAAB4AAAAAAAAeAAAAAAAAHgAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAD4AA8AAD///gAPAAB///4AD4AAf//+AAeAAH+APAAHgAB4AHgAA4AAeAB4AAOAAHgAcAADwAB4AHAAA8AAeADwAAPAAHgAcAADwAB4AHAAA8AAeAB4AAeAAHgAeAAHgAB4AHwAD4AAeAA+AB8AAHgAP4B+AAB4AB///gAAOAAP//gAABAAA//wAAAAAAD/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAAAAB///4AAAAD////wAAAD////+AAAB/////4AAA/gPgB/AAAfgDwAHwAAPgA8AA+AADwAeAAHgAB4AHgAB4AAeAB4AAfAAHgAeAADwABwAHgAA8AAcAB4AAPAAHAAeAAHwAB4AHgAB4AAeAB8AAeAAHgAPAAPgAB4AD8APwAAOAAfwP4AADgAD//8AAAAAAf/+AAAAAAB/+AAAAAAAH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAAAAAB4AAAAAAAAeAAAAAAAAHgAAAAAAAB4AAAAA4AAeAAAAB/AAHgAAAB/wAB4AAAB/4AAeAAAD/4AAHgAAD/wAAB4AAH/wAAAeAAH/gAAAHgAP/gAAAB4AP/AAAAAeAf/AAAAAHgf+AAAAAB4/+AAAAAAe/8AAAAAAH/8AAAAAAB/4AAAAAAAf4AAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAAA/AB/+AAAA/8B//wAAA//gf/+AAAf/8PgPgAAH4fngB8AAD4B/wAPgAA8AP8AB4AAeAB+AAeAAHgAfgADwAB4ADwAA8AAcAA8AAPAAHAAPAADwAB4ADwAA8AAeAB+AAPAAHgAfgAHgAB8AP8AB4AAPgH/AA+AAD8H54AfAAAf/8fgPwAAD/+D//4AAAf/Af/8AAAB/AD/+AAAAAAAP+AAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwAAAAAAAf/wAAAAAAf/+AAAAAAP//4AAwAAH//+AAeAAD+APwAHgAA+AA+AB4AAfAAHgAOAAHgAB4ADwAB4AAPAA8AAeAADwAPAAHgAA8ADwAB4AAPAA8AAeAADwAPAAHgAA8AHgAB8AAeAB4AAPgAHgA+AAD8ADwA/AAAfwA8A/gAAD/wef/wAAAf////4AAAB////4AAAAH///wAAAAAD/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AB4AAAAAfgA/AAAAAH4APwAAAAB+AD4AAAAAPAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="), 46, atob("DRAcHBwcHBwcHBwcDQ=="), 56 + (scale << 8) + (1 << 16));
  return this;
};

function setLargeFont() {
  g.setFontBloggerSansLight46();
}

function ymd(date) {
  return date.toLocalISOString().substring(0, 10);
}

/** @returns A 4-color palette with background, dim, bright, background again
 *           for transparent/opaque background tricks
 */
function palette(dim, bright) {
  //log_debug('Pal: ' + dim + ', ' + bright);
  return new Uint16Array([g.theme.bg, g.toColor(dim), g.toColor(bright), g.theme.bg]);
}
function autoGray(category) {
  if (g.theme.dark || category.color == 'Blk/Wht') {
    // TODO: Recheck this comment
    // BLK/WHT is the outside in light mode, so all of it gets filled in.
    // Using the dark theme stops it from being a one-color circle.
    return g.toColor(category.gy || category);
  } else {
    return g.theme.fg;
  }
}

function setTargets() {
  totalMin = 0;
  settings.fruitful.forEach((fruitful, i, _arr) => {
    if (!fruitful.title) return;
    const today = new Date().getDay();
    const tgtOverride = fruitful.target_min_override[today];
    const tgtBase = tgtOverride !== -1 ? tgtOverride : fruitful.target_min;
    if (fruitful.adapt_to_week) {
      const secLeft = totalTargetMin(fruitful) * MIN - fruitful.sec_this_week;
      const minFutureTarget = totalTargetMinFrom(fruitful, today);
      const daysLeft = 7 - today, minNeeded = secLeft / MIN;
      const factor = E.clip(minNeeded / minFutureTarget, 0, 2);
      const tgt = Math.ceil(tgtBase * factor);
      log_debug(`${fruitful.sec_this_week}s already, ${secLeft}s left in` +
                ` ${daysLeft}d with up to ${minFutureTarget} min available: x${factor}=${tgt}`);
      targetMinFCat[i] = tgt;
    } else {
      targetMinFCat[i] = tgtBase;
    }
    startFCat[i] = totalMin;
    totalMin += targetMinFCat[i];
    endFCat[i] = totalMin;
  });
  fallowScale = Math.round(totalMin / 4);
}

function updateDerivedRingVars() {
  var fixedPosLen = settings.fruitful.length;
  var displayedLen = 1 + settings.fruitful.length + settings.decentering.length - 2;
  startFCat = new Uint16Array(fixedPosLen);
  endFCat = new Uint16Array(fixedPosLen);
  targetMinFCat = new Uint16Array(fixedPosLen);
  palCat = new Uint16Array(16);
  modeCat = new Array(displayedLen);
  pendingTimeCat = new Uint16Array(displayedLen);
  palRing = new Uint16Array(16);

  setTargets();

  palCI = palette(autoGray(settings.clock_info_gy), settings.clock_info_fg);
  palCat[FALLOW_IDX] = palRing[PAL_FALLOW_ALIAS] = g.toColor('#860');
  palRing[PAL_BG_ALIAS] = g.theme.bg;
  // TODO: Draw out a nice circle and arrows properly
  modeCat[FALLOW_IDX] = '';//'» × «';
  pendingTimeCat[FALLOW_IDX] = settings.fallow_buffer;
  settings.fruitful.forEach((fruitful, i, _arr) => {
    if (!fruitful.title) return;
    palCat[i] = palRing[i] = g.toColor(fruitful.fg);
    modeCat[i] = fruitful.title;
    setAt(pendingTimeCat, i, fruitful.sec_today);
  });
  settings.decentering.forEach((decentering, i, _arr) => {
    if (!decentering.title) return;
    setAt(palCat, -i, g.toColor(decentering.fg));
    setAt(modeCat, -i, decentering.title);
    setAt(pendingTimeCat, -i, decentering.sec_today);
  });
}

function loadRuntimeSettings() {
  settings = loadSettings();

  if (settings.DEBUGGING) DEBUGGING = true;

  settings.hr_12 = (global_settings["12hour"] === undefined ? false : global_settings["12hour"]);

  if (null == settings.early_switches) {
    // Migrate log
    logStartNew(logCurFilenames());
    settings.early_switches = 0;
  }

  settings.last_reset = settings.last_reset || ymd(new Date());
  updateDerivedRingVars();
  selectButton(settings.cur_mode);
  setInterval(updateTotals, settings.fallow_denominator * 1000);
}

//var drawCount = 0;

function drawTime(date) {
  var hh = date.getHours();
  if (settings.hr_12) {
    hh = hh % 12;
    if (hh == 0) hh = 12;
  }
  hh = hh.toString().padStart(2, '0');
  var mm = date.getMinutes().toString().padStart(2, '0');
  if (prevDrawnTime == hh + mm) return;
  prevDrawnTime = hh + mm;

  setLargeFont();
  g.clearRect(X_C - CLK_HALF_W, CLK_BG_Y - CLK_HALF_H,
              X_C + CLK_HALF_W, CLK_BG_Y + CLK_HALF_H);
  g.setColor(settings.hour_fg).setFontAlign(1, 0);  // right aligned
  g.drawString(hh, X_C - 1, CLK_Y);

  g.setColor(g.theme.fg).setFontAlign(-1, 0);       // left aligned
  g.drawString(mm, X_C + 1, CLK_Y);
}

function draw() {
  drawFace();
  queueDraw();
}

function getGauge(start, amtMin, targetMin, idxCat, idxRing) {
  "jit";
  const j = idxRing > 0 ? idxCat + 16 : idxCat; // Treat original/overflow separately
  const prevGauge = prevDrawnSegment[j], cacheKey = '' + start + '+' + targetMin;
  const invertRing = idxCat < 0;
  if (prevGauge && prevGauge.cacheKey == cacheKey) {
    prevGauge.amtToDraw = amtMin - prevGauge.amtMin;
    if (0 === prevGauge.amtToDraw) {
      if (idxRing === RI_GAUGE) prevGauge.amtToDraw = null;
      return prevGauge;
    }
    if (idxRing === RI_GAUGE) {
      prevGauge.amtMin = amtMin;
      prevGauge.mid = prevGauge.start + amtMin;
      return prevGauge;
    }
  }
  let result = { idxCat: idxCat, idxRing: idxRing, invertRing: invertRing,
                 cacheKey: cacheKey, };
  let minLimit = totalMin;
  if (idxCat === FALLOW_IDX) {
    minLimit = totalMin - getFallowStartMin();
  } else if (idxRing === RI_OVERFLOW_GAUGE && invertRing) {
    minLimit = totalMin + 1 - getFallowStartMin();
  } else if (idxRing === RI_OVERFLOW_GAUGE) {
    minLimit = getFallowStartMin() - 1;
  }
  if (invertRing) {
    result.end = Math.max(totalMin - start, minLimit);
    result.mid = result.end;
    result.start = Math.max(result.end - targetMin, minLimit);
  } else {
    result.start = Math.min(start, minLimit);
    result.mid = Math.min(start + amtMin, minLimit);
    result.end = Math.min(start + targetMin, minLimit);
  }
  result.amtToDraw = result.mid - result.start;
  result.amtMin = amtMin;
  return result;
}

// #region Efficient arc drawing
var totalMinDrawn = 0;
// #region XXX: Dumb JIT hacks
function getXYBase(angle) { return [Math.sin(angle), Math.cos(angle + Math.PI)]; }
function round(v) { return Math.round(v); }
function floor(v) { return Math.floor(v); }
function ceil(v) { return Math.ceil(v); }
function newArray(len) { return new Array(len); }
// #endregion

function blankGauge(grph) {
  grph.drawImage(atob('sLCBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///gAAAAAAAAAAAAAAAAAAAAAAAB/////8AAAAAAAAAAAAAAAAAAAAAAH//////8AAAAAAAAAAAAAAAAAAAAAf///////8AAAAAAAAAAAAAAAAAAAA/////////4AAAAAAAAAAAAAAAAAAB//////////wAAAAAAAAAAAAAAAAAB///////////AAAAAAAAAAAAAAAAAD///////////+AAAAAAAAAAAAAAAAD////4AAD////4AAAAAAAAAAAAAAAD///8AAAAAf///gAAAAAAAAAAAAAAD///wAAAAAAf//+AAAAAAAAAAAAAAD///AAAAAAAAf//4AAAAAAAAAAAAAB//+AAAAAAAAA///AAAAAAAAAAAAAB//+AAAAAAAAAD//8AAAAAAAAAAAAB//8AAAAAAAAAAH//wAAAAAAAAAAAA//8AAAAAAAAAAAf/+AAAAAAAAAAAAf/8AAAAAAAAAAAB//wAAAAAAAAAAAf/8AAAAAAAAAAAAH//AAAAAAAAAAAP/8AAAAAAAAAAAAAf/4AAAAAAAAAAH/8AAAAAAAAAAAAAB//AAAAAAAAAAH/+AAAAAAAAAAAAAAP/8AAAAAAAAAD/+AAAAAAAAAAAAAAA//gAAAAAAAAB//AAAAAAAAAAAAAAAH/8AAAAAAAAA//gAAAAAAAAAAAAAAA//gAAAAAAAAf/gAAAAAAAAAAAAAAAD/8AAAAAAAAP/wAAAAAAAAAAAAAAAAf/gAAAAAAAH/4AAAAAAAAAAAAAAAAD/8AAAAAAAD/8AAAAAAAAAAAAAAAAAf/gAAAAAAB/8AAAAAAAAAAAAAAAAAB/8AAAAAAA/+AAAAAAAAAAAAAAAAAAP/gAAAAAAf/AAAAAAAAAAAAAAAAAAB/8AAAAAAH/gAAAAAAAAAAAAAAAAAAP/AAAAAAD/wAAAAAAAAAAAAAAAAAAB/4AAAAAB/4AAAAAAAAAAAAAAAAAAAP/AAAAAA/+AAAAAAAAAAAAAAAAAAAD/4AAAAAP/AAAAAAAAAAAAAAAAAAAAf+AAAAAH/gAAAAAAAAAAAAAAAAAAAD/wAAAAD/wAAAAAAAAAAAAAAAAAAAAf+AAAAB/4AAAAAAAAAAAAAAAAAAAAD/wAAAAf+AAAAAAAAAAAAAAAAAAAAA/8AAAAP/AAAAAAAAAAAAAAAAAAAAAH/gAAAD/gAAAAAAAAAAAAAAAAAAAAA/4AAAB/wAAAAAAAAAAAAAAAAAAAAAH/AAAA/8AAAAAAAAAAAAAAAAAAAAAB/4AAAP+AAAAAAAAAAAAAAAAAAAAAAP+AAAH/AAAAAAAAAAAAAAAAAAAAAAB/wAAB/wAAAAAAAAAAAAAAAAAAAAAAf8AAA/4AAAAAAAAAAAAAAAAAAAAAAD/gAAP+AAAAAAAAAAAAAAAAAAAAAAA/4AAH/AAAAAAAAAAAAAAAAAAAAAAAH/AAB/wAAAAAAAAAAAAAAAAAAAAAAB/wAA/4AAAAAAAAAAAAAAAAAAAAAAAP+AAP+AAAAAAAAAAAAAAAAAAAAAAAD/gAD/AAAAAAAAAAAAAAAAAAAAAAAAf4AB/wAAAAAAAAAAAAAAAAAAAAAAAH/AAf4AAAAAAAAAAAAAAAAAAAAAAAA/wAP+AAAAAAAAAAAAAAAAAAAAAAAAP+AD/gAAAAAAAAAAAAAAAAAAAAAAAD/gA/wAAAAAAAAAAAAAAAAAAAAAAAAf4Af8AAAAAAAAAAAAAAAAAAAAAAAAH/AH+AAAAAAAAAAAAAAAAAAAAAAAAA/wB/gAAAAAAAAAAAAAAAAAAAAAAAAP8A/4AAAAAAAAAAAAAAAAAAAAAAAAD/gP8AAAAAAAAAAAAAAAAAAAAAAAAAf4D/AAAAAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAAAAB/gf8AAAAAAAAAAAAAAAAAAAAAAAAAf8H+AAAAAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAAAAA/wf4AAAAAAAAAAAAAAAAAAAAAAAAAP8P+AAAAAAAAAAAAAAAAAAAAAAAAAD/j/AAAAAAAAAAAAAAAAAAAAAAAAAAf4/wAAAAAAAAAAAAAAAAAAAAAAAAAH+P8AAAAAAAAAAAAAAAAAAAAAAAAAB/j/AAAAAAAAAAAAAAAAAAAAAAAAAAf4/wAAAAAAAAAAAAAAAAAAAAAAAAAH+P8AAAAAAAAAAAAAAAAAAAAAAAAAB/n/AAAAAAAAAAAAAAAAAAAAAAAAAAf9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f4AAAAAAAAAAAAAAAAAAAAAAAAAA/3+AAAAAAAAAAAAAAAAAAAAAAAAAAP9/gAAAAAAAAAAAAAAAAAAAAAAAAAD/f8AAAAAAAAAAAAAAAAAAAAAAAAAB/z/AAAAAAAAAAAAAAAAAAAAAAAAAAf4/wAAAAAAAAAAAAAAAAAAAAAAAAAH+P8AAAAAAAAAAAAAAAAAAAAAAAAAB/j/AAAAAAAAAAAAAAAAAAAAAAAAAAf4/wAAAAAAAAAAAAAAAAAAAAAAAAAH+P8AAAAAAAAAAAAAAAAAAAAAAAAAB/j/gAAAAAAAAAAAAAAAAAAAAAAAAA/4f4AAAAAAAAAAAAAAAAAAAAAAAAAP8H+AAAAAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAAAAA/wf8AAAAAAAAAAAAAAAAAAAAAAAAAf8D/AAAAAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAAAAB/gP8AAAAAAAAAAAAAAAAAAAAAAAAAf4D/gAAAAAAAAAAAAAAAAAAAAAAAAP+Af4AAAAAAAAAAAAAAAAAAAAAAAAD/AH+AAAAAAAAAAAAAAAAAAAAAAAAA/wB/wAAAAAAAAAAAAAAAAAAAAAAAAf8AP8AAAAAAAAAAAAAAAAAAAAAAAAH+AD/gAAAAAAAAAAAAAAAAAAAAAAAD/gA/4AAAAAAAAAAAAAAAAAAAAAAAA/4AH+AAAAAAAAAAAAAAAAAAAAAAAAP8AB/wAAAAAAAAAAAAAAAAAAAAAAAH/AAP8AAAAAAAAAAAAAAAAAAAAAAAB/gAD/gAAAAAAAAAAAAAAAAAAAAAAA/4AA/4AAAAAAAAAAAAAAAAAAAAAAAP+AAH/AAAAAAAAAAAAAAAAAAAAAAAH/AAB/wAAAAAAAAAAAAAAAAAAAAAAB/wAAP+AAAAAAAAAAAAAAAAAAAAAAA/4AAD/gAAAAAAAAAAAAAAAAAAAAAAP+AAAf8AAAAAAAAAAAAAAAAAAAAAAH/AAAH/AAAAAAAAAAAAAAAAAAAAAAB/wAAA/4AAAAAAAAAAAAAAAAAAAAAA/4AAAP/AAAAAAAAAAAAAAAAAAAAAAf+AAAB/wAAAAAAAAAAAAAAAAAAAAAH/AAAAP+AAAAAAAAAAAAAAAAAAAAAD/gAAAD/wAAAAAAAAAAAAAAAAAAAAB/4AAAAf+AAAAAAAAAAAAAAAAAAAAA/8AAAAH/gAAAAAAAAAAAAAAAAAAAAP/AAAAA/8AAAAAAAAAAAAAAAAAAAAH/gAAAAH/gAAAAAAAAAAAAAAAAAAAD/wAAAAA/8AAAAAAAAAAAAAAAAAAAB/4AAAAAP/gAAAAAAAAAAAAAAAAAAA/+AAAAAB/4AAAAAAAAAAAAAAAAAAAP/AAAAAAP/AAAAAAAAAAAAAAAAAAAH/gAAAAAB/4AAAAAAAAAAAAAAAAAAD/wAAAAAAf/AAAAAAAAAAAAAAAAAAB/8AAAAAAD/4AAAAAAAAAAAAAAAAAA/+AAAAAAAf/AAAAAAAAAAAAAAAAAAf/AAAAAAAD/8AAAAAAAAAAAAAAAAAf/gAAAAAAAf/gAAAAAAAAAAAAAAAAP/wAAAAAAAD/8AAAAAAAAAAAAAAAAH/4AAAAAAAAf/gAAAAAAAAAAAAAAAD/8AAAAAAAAD/+AAAAAAAAAAAAAAAD/+AAAAAAAAAf/wAAAAAAAAAAAAAAB//AAAAAAAAAD/+AAAAAAAAAAAAAAA//gAAAAAAAAAf/4AAAAAAAAAAAAAA//wAAAAAAAAAB//AAAAAAAAAAAAAAf/wAAAAAAAAAAP/8AAAAAAAAAAAAAf/4AAAAAAAAAAB//wAAAAAAAAAAAAf/8AAAAAAAAAAAH//AAAAAAAAAAAAf/8AAAAAAAAAAAA//8AAAAAAAAAAAf/+AAAAAAAAAAAAH//wAAAAAAAAAAf//AAAAAAAAAAAAAf//gAAAAAAAAA///AAAAAAAAAAAAAB//+AAAAAAAAA///AAAAAAAAAAAAAAP//8AAAAAAAB///gAAAAAAAAAAAAAA///8AAAAAAH///gAAAAAAAAAAAAAAD///8AAAAAf///gAAAAAAAAAAAAAAAP////gAAP////gAAAAAAAAAAAAAAAA////////////gAAAAAAAAAAAAAAAAB///////////AAAAAAAAAAAAAAAAAAH//////////AAAAAAAAAAAAAAAAAAAP////////+AAAAAAAAAAAAAAAAAAAAf///////8AAAAAAAAAAAAAAAAAAAAAf//////wAAAAAAAAAAAAAAAAAAAAAAf/////AAAAAAAAAAAAAAAAAAAAAAAAD///gAAAAAAAAAAAA'), 0, 0);
}

function blankSegments(grph) {
  grph.drawImage(atob('sLCBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//8AAAAAAAAAAAAAAAAAAAAAAAAD/////gAAAAAAAAAAAAAAAAAAAAAAP//////gAAAAAAAAAAAAAAAAAAAAA////////gAAAAAAAAAAAAAAAAAAAB//+AAA///AAAAAAAAAAAAAAAAAAAB//gAAAAP/8AAAAAAAAAAAAAAAAAAD/8AAAAAAH/4AAAAAAAAAAAAAAAAAD/4AAAAAAAP/gAAAAAAAAAAAAAAAAD/wAAAAAAAAf+AAAAAAAAAAAAAAAAD/gAAAAAAAAA/4AAAAAAAAAAAAAAAD/gAAAAAAAAAD/gAAAAAAAAAAAAAAD/gAAAAAAAAAAP+AAAAAAAAAAAAAAB/gAAAAAAAAAAA/wAAAAAAAAAAAAAB/gAAAAAAAAAAAD/AAAAAAAAAAAAAA/gAAAAAAAAAAAAP4AAAAAAAAAAAAAfwAAAAAAAAAAAAB/AAAAAAAAAAAAAfwAAAAAAAAAAAAAH8AAAAAAAAAAAAP4AAAAAAAAAAAAAA/gAAAAAAAAAAAH4AAAAAAAAAAAAAAD8AAAAAAAAAAAD8AAAAAAAAAAAAAAAfgAAAAAAAAAAD+AAAAAAAAAAAAAAAD+AAAAAAAAAAB+AAAAAAAAAAAAAAAAPwAAAAAAAAAA/AAAAAAAAAAAAAAAAB+AAAAAAAAAAfgAAAAAAAAAAAAAAAAPwAAAAAAAAAPwAAAAAAAAAAAAAAAAB+AAAAAAAAAH4AAAAAAAAAAAAAAAAAPwAAAAAAAAB8AAAAAAAAAAAAAAAAAB8AAAAAAAAA+AAAAAAAAAAAAAAAAAAPgAAAAAAAAfAAAAAAAAAAAAAAAAAAB8AAAAAAAAPgAAAAAAAAAAAAAAAAAAPgAAAAAAAHwAAAAAAAAAAAAAAAAAAB8AAAAAAAB8AAAAAAAAAAAAAAAAAAAfAAAAAAAA+AAAAAAAAAAAAAAAAAAAD4AAAAAAAfAAAAAAAAAAAAAAAAAAAAfAAAAAAAPgAAAAAAAAAAAAAAAAAAAD4AAAAAAD4AAAAAAAAAAAAAAAAAAAA+AAAAAAB8AAAAAAAAAAAAAAAAAAAAHwAAAAAA+AAAAAAAAAAAAAAAAAAAAA+AAAAAAPgAAAAAAAAAAAAAAAAAAAAPgAAAAAHwAAAAAAAAAAAAAAAAAAAAB8AAAAAB4AAAAAAAAAAAAAAAAAAAAAPAAAAAA+AAAAAAAAAAAAAAAAAAAAAD4AAAAAPAAAAAAAAAAAAAAAAAAAAAAeAAAAAHwAAAAAAAAAAAAAAAAAAAAAHwAAAAB4AAAAAAAAAAAAAAAAAAAAAA8AAAAA+AAAAAAAAAAAAAAAAAAAAAAPgAAAAPAAAAAAAAAAAAAAAAAAAAAAB4AAAAHwAAAAAAAAAAAAAAAAAAAAAAfAAAAB4AAAAAAAAAAAAAAAAAAAAAADwAAAAeAAAAAAAAAAAAAAAAAAAAAAA8AAAAPAAAAAAAAAAAAAAAAAAAAAAAHgAAADwAAAAAAAAAAAAAAAAAAAAAAB4AAAB8AAAAAAAAAAAAAAAAAAAAAAAfAAAAeAAAAAAAAAAAAAAAAAAAAAAADwAAAHgAAAAAAAAAAAAAAAAAAAAAAA8AAAD4AAAAAAAAAAAAAAAAAAAAAAAPgAAA8AAAAAAAAAAAAAAAAAAAAAAAB4AAAPAAAAAAAAAAAAAAAAAAAAAAAAeAAADwAAAAAAAAAAAAAAAAAAAAAAAHgAAB4AAAAAAAAAAAAAAAAAAAAAAAA8AAAeAAAAAAAAAAAAAAAAAAAAAAAAPAAAHgAAAAAAAAAAAAAAAAAAAAAAADwAAB4AAAAAAAAAAAAAAAAAAAAAAAA8AAA+AAAAAAAAAAAAAAAAAAAAAAAAPgAAPAAAAAAAAAAAAAAAAAAAAAAAAB4AADwAAAAAAAAAAAAAAAAAAAAAAAAeAAA8AAAAAAAAAAAAAAAAAAAAAAAAHgAAPAAAAAAAAAAAAAAAAAAAAAAAAB4AADwAAAAAAAAAAAAAAAAAAAAAAAAeAAA8AAAAAAAAAAAAAAAAAAAAAAAAHgAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AAHgAAAAAAAAAAAAAAAAAAAAAAAAPAAB4AAAAAAAAAAAAAAAAAAAAAAAADwAAeAAAAAAAAAAAAAAAAAAAAAAAAA8AADwAAAAAAAAAAAAAAAAAAAAAAAAeAAA8AAAAAAAAAAAAAAAAAAAAAAAAHgAAPAAAAAAAAAAAAAAAAAAAAAAAAB4AADwAAAAAAAAAAAAAAAAAAAAAAAAeAAA8AAAAAAAAAAAAAAAAAAAAAAAAHgAAPAAAAAAAAAAAAAAAAAAAAAAAAB4AAD4AAAAAAAAAAAAAAAAAAAAAAAA+AAAeAAAAAAAAAAAAAAAAAAAAAAAAPAAAHgAAAAAAAAAAAAAAAAAAAAAAADwAAB4AAAAAAAAAAAAAAAAAAAAAAAA8AAAeAAAAAAAAAAAAAAAAAAAAAAAAPAAADwAAAAAAAAAAAAAAAAAAAAAAAHgAAA8AAAAAAAAAAAAAAAAAAAAAAAB4AAAPAAAAAAAAAAAAAAAAAAAAAAAAeAAAD4AAAAAAAAAAAAAAAAAAAAAAAPgAAAeAAAAAAAAAAAAAAAAAAAAAAADwAAAHgAAAAAAAAAAAAAAAAAAAAAAA8AAAB8AAAAAAAAAAAAAAAAAAAAAAAfAAAAPAAAAAAAAAAAAAAAAAAAAAAAHgAAADwAAAAAAAAAAAAAAAAAAAAAAB4AAAAeAAAAAAAAAAAAAAAAAAAAAAA8AAAAHgAAAAAAAAAAAAAAAAAAAAAAPAAAAB8AAAAAAAAAAAAAAAAAAAAAAHwAAAAPAAAAAAAAAAAAAAAAAAAAAAB4AAAAD4AAAAAAAAAAAAAAAAAAAAAA+AAAAAeAAAAAAAAAAAAAAAAAAAAAAPAAAAAHwAAAAAAAAAAAAAAAAAAAAAHwAAAAA8AAAAAAAAAAAAAAAAAAAAAB4AAAAAPgAAAAAAAAAAAAAAAAAAAAA+AAAAAB4AAAAAAAAAAAAAAAAAAAAAPAAAAAAfAAAAAAAAAAAAAAAAAAAAAHwAAAAAD4AAAAAAAAAAAAAAAAAAAAD4AAAAAA+AAAAAAAAAAAAAAAAAAAAA+AAAAAAHwAAAAAAAAAAAAAAAAAAAAfAAAAAAA+AAAAAAAAAAAAAAAAAAAAPgAAAAAAPgAAAAAAAAAAAAAAAAAAAD4AAAAAAB8AAAAAAAAAAAAAAAAAAAB8AAAAAAAPgAAAAAAAAAAAAAAAAAAA+AAAAAAAB8AAAAAAAAAAAAAAAAAAAfAAAAAAAAfAAAAAAAAAAAAAAAAAAAHwAAAAAAAD4AAAAAAAAAAAAAAAAAAD4AAAAAAAAfAAAAAAAAAAAAAAAAAAB8AAAAAAAAD4AAAAAAAAAAAAAAAAAA+AAAAAAAAAfAAAAAAAAAAAAAAAAAAfAAAAAAAAAH4AAAAAAAAAAAAAAAAAPwAAAAAAAAA/AAAAAAAAAAAAAAAAAH4AAAAAAAAAH4AAAAAAAAAAAAAAAAD8AAAAAAAAAA/AAAAAAAAAAAAAAAAB+AAAAAAAAAAH4AAAAAAAAAAAAAAAA/AAAAAAAAAAA/gAAAAAAAAAAAAAAA/gAAAAAAAAAAD8AAAAAAAAAAAAAAAfgAAAAAAAAAAAfgAAAAAAAAAAAAAAPwAAAAAAAAAAAD+AAAAAAAAAAAAAAP4AAAAAAAAAAAAfwAAAAAAAAAAAAAH8AAAAAAAAAAAAB/AAAAAAAAAAAAAH8AAAAAAAAAAAAAP4AAAAAAAAAAAAD+AAAAAAAAAAAAAB/gAAAAAAAAAAAD/AAAAAAAAAAAAAAH+AAAAAAAAAAAD/AAAAAAAAAAAAAAA/4AAAAAAAAAAD/gAAAAAAAAAAAAAAD/gAAAAAAAAAD/gAAAAAAAAAAAAAAAP+AAAAAAAAAD/gAAAAAAAAAAAAAAAA/8AAAAAAAAH/gAAAAAAAAAAAAAAAAD/4AAAAAAAP/gAAAAAAAAAAAAAAAAAP/wAAAAAAf/gAAAAAAAAAAAAAAAAAAf/4AAAAD//AAAAAAAAAAAAAAAAAAAB//+AAA///AAAAAAAAAAAAAAAAAAAAD///////+AAAAAAAAAAAAAAAAAAAAAD//////4AAAAAAAAAAAAAAAAAAAAAAD/////gAAAAAAAAAAAAAAAAAAAAAAAAf//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 0, 0);
}

function blankOverflowGauge(grph) {
  grph.drawImage(atob('nIqBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB///AAAAAAAAAAAAAAAAAAAAAB/////AAAAAAAAAAAAAAAAAAAA//////+AAAAAAAAAAAAAAAAAAH///////wAAAAAAAAAAAAAAAAA////////+AAAAAAAAAAAAAAAAH/////////wAAAAAAAAAAAAAAAf/////////8AAAAAAAAAAAAAAB///////////AAAAAAAAAAAAAAH///+AAA////wAAAAAAAAAAAAAf//+AAAAA///8AAAAAAAAAAAAB///gAAAAAD///AAAAAAAAAAAAD//8AAAAAAAf//gAAAAAAAAAAAP//gAAAAAAAD//4AAAAAAAAAAAf/+AAAAAAAAA//8AAAAAAAAAAB//4AAAAAAAAAP//AAAAAAAAAAD//gAAAAAAAAAD//gAAAAAAAAAH/+AAAAAAAAAAA//wAAAAAAAAAf/4AAAAAAAAAAAP/8AAAAAAAAA//gAAAAAAAAAAAD/+AAAAAAAAB//AAAAAAAAAAAAB//AAAAAAAAD/+AAAAAAAAAAAAA//gAAAAAAAH/4AAAAAAAAAAAAAP/wAAAAAAAP/wAAAAAAAAAAAAAH/4AAAAAAAf/gAAAAAAAAAAAAAD/8AAAAAAA/+AAAAAAAAAAAAAAA/+AAAAAAB/8AAAAAAAAAAAAAAAf/AAAAAAD/4AAAAAAAAAAAAAAAP/gAAAAAD/wAAAAAAAAAAAAAAAH/gAAAAAH/gAAAAAAAAAAAAAAAD/wAAAAAP/AAAAAAAAAAAAAAAAB/4AAAAAf+AAAAAAAAAAAAAAAAA/8AAAAAf+AAAAAAAAAAAAAAAAA/8AAAAA/8AAAAAAAAAAAAAAAAAf+AAAAB/4AAAAAAAAAAAAAAAAAP/AAAAB/wAAAAAAAAAAAAAAAAAH/AAAAD/wAAAAAAAAAAAAAAAAAH/gAAAH/gAAAAAAAAAAAAAAAAAD/wAAAH/AAAAAAAAAAAAAAAAAAB/wAAAP+AAAAAAAAAAAAAAAAAAA/4AAAP+AAAAAAAAAAAAAAAAAAA/4AAAf8AAAAAAAAAAAAAAAAAAAf8AAAf8AAAAAAAAAAAAAAAAAAAf8AAA/4AAAAAAAAAAAAAAAAAAAP+AAA/4AAAAAAAAAAAAAAAAAAAP+AAB/wAAAAAAAAAAAAAAAAAAAH/AAB/wAAAAAAAAAAAAAAAAAAAH/AAD/gAAAAAAAAAAAAAAAAAAAD/gAD/gAAAAAAAAAAAAAAAAAAAD/gAD/AAAAAAAAAAAAAAAAAAAAB/gAH/AAAAAAAAAAAAAAAAAAAAB/wAH+AAAAAAAAAAAAAAAAAAAAA/wAH+AAAAAAAAAAAAAAAAAAAAA/wAP+AAAAAAAAAAAAAAAAAAAAA/4AP8AAAAAAAAAAAAAAAAAAAAAf4AP8AAAAAAAAAAAAAAAAAAAAAf4Af8AAAAAAAAAAAAAAAAAAAAAf8Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/B/gAAAAAAAAAAAAAAAAAAAAAD/A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+A/wAAAAAAAAAAAAAAAAAAAAAH+Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8Af4AAAAAAAAAAAAAAAAAAAAAP8Af8AAAAAAAAAAAAAAAAAAAAAf8AP8AAAAAAAAAAAAAAAAAAAAAf4AP8AAAAAAAAAAAAAAAAAAAAAf4AP+AAAAAAAAAAAAAAAAAAAAA/4AH+AAAAAAAAAAAAAAAAAAAAA/wAH+AAAAAAAAAAAAAAAAAAAAA/wAH/AAAAAAAAAAAAAAAAAAAAB/wAD/AAAAAAAAAAAAAAAAAAAAB/gAD/gAAAAAAAAAAAAAAAAAAAD/gAD/gAAAAAAAAAAAAAAAAAAAD/gAB/wAAAAAAAAAAAAAAAAAAAH/AAB/wAAAAAAAAAAAAAAAAAAAH/AAA/4AAAAAAAAAAAAAAAAAAAP+AAA/4AAAAAAAAAAAAAAAAAAAP+AAAf8AAAAAAAAAAAAAAAAAAAf8AAAf8AAAAAAAAAAAAAAAAAAAf8AAAP+AAAAAAAAAAAAAAAAAAA/4AAAP+AAAAAAAAAAAAAAAAAAA/4AAAH/AAAAAAAAAAAAAAAAAAB/wAAAH/gAAAAAAAAAAAAAAAAAD/wAAAD/wAAAAAAAAAAAAAAAAAH/gAAAB/wAAAAAAAAAAAAAAAAAH/AAAAB/4AAAAAAAAAAAAAAAAAP/AAAAA/8AAAAAAAAAAAAAAAAAf+AAAAAf+AAAAAAAAAAAAAAAAA/8AAAAAf+AAAAAAAAAAAAAAAAA/8AAAAAP/AAAAAAAAAAAAAAAAB/4AAAAAH/gAAAAAAAAAAAAAAAD/wAAAAAD/wAAAAAAAAAAAAAAAH/gAAAAAD/gAAAAAAAAAAAAAAAD/gAAAAAB/AAAAAAAAAAAAAAAAB/AAAAAAA+AAAAAAAAAAAAAAAAA+AAAAAAAcAAAAAAAAAAAAAAAAAcAAAAAAAIAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='), 10, 10);
}

function blankFallowSegment(grph) {
  grph.drawImage(atob('Zh2BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAIAcAAAAAAAAAAAAAAcA+AAAAAAAAAAAAAA+A/AAAAAAAAAAAAAB+AfwAAAAAAAAAAAAH8AP4AAAAAAAAAAAAP4AD8AAAAAAAAAAAAfgAB/AAAAAAAAAAAB/AAA/gAAAAAAAAAAD+AAAP4AAAAAAAAAAP4AAAH+AAAAAAAAAA/wAAAD/gAAAAAAAAD/gAAAA/4AAAAAAAAP+AAAAAP+AAAAAAAA/4AAAAAD/wAAAAAAH/gAAAAAA/+AAAAAA/+AAAAAAAP/4AAAAP/4AAAAAAAD//4AAP//gAAAAAAAAf//////8AAAAAAAAAD//////gAAAAAAAAAAP////4AAAAAAAAAAAAP//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='), 37, 129);
}

function blankFallowGauge(grph) {
  grph.drawImage(atob('ciKBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAADgAAAAAAAAAAAAAADgAHwAAAAAAAAAAAAAAHwAP8AAAAAAAAAAAAAAf4Af+AAAAAAAAAAAAAA/8A//AAAAAAAAAAAAAB/+Af/wAAAAAAAAAAAAH/8AP/4AAAAAAAAAAAAP/4AH/8AAAAAAAAAAAAf/wAD//AAAAAAAAAAAB//gAA//wAAAAAAAAAAH/+AAAf/8AAAAAAAAAAf/8AAAP//AAAAAAAAAB//4AAAD//wAAAAAAAAH//gAAAB//8AAAAAAAAf//AAAAAf//gAAAAAAD//8AAAAAP//8AAAAAAf//4AAAAAD///wAAAAH///gAAAAAA////wAAH///+AAAAAAAP//////////4AAAAAAAD//////////gAAAAAAAA/////////+AAAAAAAAAH////////wAAAAAAAAAA///////+AAAAAAAAAAAH//////wAAAAAAAAAAAAP////4AAAAAAAAAAAAAAP//4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'), 0, 0);
}

function clearOverflow() {
  blankOverflowGauge(g.setColor(g.theme.bg));
}

function drawRadialLine(grph, qty, radius, thickness) {
  "jit";
  const xy = getXYBase(((2 * Math.PI) / totalMin) * qty), x = xy[0], y = xy[1];
  const radiusInner = radius - thickness;
  const x1 = X_C + round(radius * x), x2 = X_C + round(radiusInner * x);
  const y1 = Y_C + round(radius * y), y2 = Y_C + round(radiusInner * y);
  grph.drawLine(x1, y1, x2, y2);
}

function calcOffset(ring, fracStart, fracEnd) {
  const xyStart = getXYBase(2 * Math.PI * fracStart);
  const xyEnd = getXYBase(2 * Math.PI * fracEnd);
  const xOffset = X_C + floor(Math.min(xyStart[0], xyEnd[0]) * RAD[ring]) - 3;
  const yOffset = Y_C + floor(Math.min(xyStart[1], xyEnd[1]) * RAD[ring + 1]) - 3;
  const width = (X_C - xOffset) * 2;
  const height = Y_C + RAD[ring] + 3 - yOffset; // TODO: Optimize down
  const xFill = X_C + round(RAD[ring] * xyStart[0]) - xOffset;
  const yFill = Y_C + round(RAD[ring] * xyStart[1]) - yOffset;
  return {xOffset, yOffset, width, height, xFill, yFill};
}
const FALLOW_OFFSET = calcOffset(RI_OVERFLOW_GAUGE, 3/8, 5/8);

/** Fills in a subsection of an arc in the main or overflow gauge rings.
 *  Not to be used for fallow gauge, which has a simpler setup.
 */
function drawArcGauge(gauge, dump) {
  // TODO: Optimize small draws
  if (null == gauge) return "null";
  const isOverflow = gauge.idxRing > RI_GAUGE;
  const idxCache = gauge.idxCat + (isOverflow ? 16 : 0);
  if (null == gauge.amtToDraw) {
    prevDrawnSegment[idxCache] = gauge;
    return "skip";
  }
  if (!drawArcGauge._gRing) {
    drawArcGauge._gRing = Graphics.createArrayBuffer(W, H, 2, {});
  }
  const gRing = drawArcGauge._gRing, radius = RAD[gauge.idxRing];
  let msStart = curMs();
  gRing.clear();
  if (gauge.amtToDraw < (totalMin / 0.01) && false) { // TODO: Fix glitches
    const fracStart = gauge.start / totalMin, fracEnd = gauge.end / totalMin;
    const clipOffset = calcOffset(gauge.idxRing, fracStart, fracEnd);
    const x1 = clipOffset.xOffset, y1 = clipOffset.yOffset;
    gRing.setClipRect(x1, y1, x1 + clipOffset.width, y1 + clipOffset.height);
  }
  gRing.setColor(3);
  if (isOverflow) blankOverflowGauge(gRing); else blankGauge(gRing);
  const msBlank = curMs() - msStart;
  msStart = curMs();
  gRing.setColor(0);
  drawRadialLine(gRing, gauge.start, radius + 1, RING_THICK_GAUGE + 2);
  if (gauge.start > 0 || gauge.end < totalMin) {
    drawRadialLine(gRing, gauge.end + 1, radius + 1, RING_THICK_GAUGE + 2);
    fillBeforeBoundary(gRing, gauge.start, radius, 3);
    if (isOverflow) fillBeforeBoundary(gRing, gauge.end + 3, radius, 3);
  }
  const msClear = curMs() - msStart;
  msStart = curMs();
  if (gauge.mid > gauge.start) {
    // Use transparency to more reliably fill
    drawRadialLine(gRing, gauge.mid + 1, radius + 1, RING_THICK_GAUGE + 2);
    gRing.setColor(1);
    fillBeforeBoundary(gRing, gauge.mid + 1, radius, 3);
  }
  const msFillSolid = curMs() - msStart;
  msStart = curMs();
  const pal = palette(at(palCat, gauge.idxCat), '#eee');
  const imgMain = { width: W, height: H, transparent: 0, bpp: 2,
                    buffer: gRing.buffer, palette: pal };
  g.drawImage(imgMain, 0, 0);
  const msDraw = curMs() - msStart;
  prevDrawnSegment[idxCache] = gauge;
  log_debug([msBlank, msClear, msFillSolid, msDraw]);
  if (dump) gRing.dump();
}

function drawFallowGauge(amt, dump) {
  if (amt === prevDrawnSegment[FALLOW_IDX]) return;
  if (!drawFallowGauge._gRing) {
    drawFallowGauge._gRing = Graphics.createArrayBuffer(FALLOW_OFFSET.width,
                                                        FALLOW_OFFSET.height, 2);
  }
  const xOffset = FALLOW_OFFSET.xOffset, yOffset = FALLOW_OFFSET.yOffset;
  const gRing = drawFallowGauge._gRing, radius = RAD[RI_OVERFLOW_GAUGE];
  blankFallowGauge(gRing.clear().setColor(3));
  const pal = palette(palCat[FALLOW_IDX], g.theme.bg);
  if (amt > 0) {
    const xy = getXYBase((amt + getFallowStartMin()) * 2 * Math.PI / totalMin);
    const radiusInner = radius - RING_THICK_GAUGE;
    const x1 = X_C + ceil(radius * xy[0]) - xOffset;
    const x2 = X_C + floor(radiusInner * xy[0]) - xOffset;
    const y1 = Y_C + ceil(radius * xy[1]) - yOffset;
    const y2 = Y_C + floor(radiusInner * xy[1]) - yOffset;
    gRing.setColor(0).drawLine(x1, y1, x2, y2);
    // XXX: Weird pixel error
    const xFill = FALLOW_OFFSET.xFill - 1, yFill = FALLOW_OFFSET.yFill;
    if (gRing.getPixel(xFill, yFill) === 3) {
      gRing.setColor(1).floodFill(xFill, yFill);
    } else if (amt >= 2) {
      let found = false, xFix = xFill - 1;
      for (let yFix = yFill - 1; yFix < yFill + 2; yFix++) {
        if (gRing.getPixel(xFix, yFix) === 3) {
          gRing.setColor(1).floodFill(xFix, yFix);
          log_debug('Flood at ' + xFix + ',' + yFix + ' not ' + xFill + ',' + yFill);
          found = true; yFix+=3;
        }
      }
      if (!found) {
        log_debug('Mixed up something, pixel at ' + xFill + ',' + yFill + ' was '
                  + gRing.getPixel(xFill, yFill));
      }
    }
  }
  const imgMain = { width: FALLOW_OFFSET.width, height: FALLOW_OFFSET.height,
                    transparent: 0, bpp: 2, buffer: gRing.buffer, palette: pal };
  g.drawImage(imgMain, xOffset, yOffset);
  prevDrawnSegment[FALLOW_IDX] = amt;
  if (dump) gRing.dump();
}

function fillBeforeBoundary(grph, qty, radius, match, distance) {
  "jit";
  const base = (2 * Math.PI) / totalMin;
  distance = Math.min(distance||3, 3);
  for (let q = qty - 1; q >= qty - distance; q--) {
    let xy = getXYBase(base * q);
    for (let r = radius; r >= radius - distance; r--) {
      let x = X_C + round(xy[0] * r), y = Y_C + round(xy[1] * r);
      let pixel = grph.getPixel(x, y);
      if (pixel === match) {
        grph.floodFill(x, y);
        return true;
      }
    }
  }
  log_debug('Nothing found for ' + match + ' up to ' + distance + ' pixels before ' + qty + '@' + radius);
}

function drawEmptySegments(forceRedraw) {
  if (totalMinDrawn === totalMin && !forceRedraw) return;
  totalMinDrawn = totalMin;
  const gRing = Graphics.createArrayBuffer(W, H, 4, {});
  blankSegments(gRing.setColor(PAL_BG_ALIAS));
  blankFallowSegment(gRing.setColor(PAL_FALLOW_ALIAS));

  gRing.setColor(0);
  drawRadialLine(gRing, -1, RAD[RI_SEGMENT] + 1, RING_THICK_SEGMENT + 2);
  for (let i = FIRST_FRUITFUL_IDX; i < settings.fruitful.length; i++) {
    let distance = endFCat[i] - startFCat[i];
    if (distance > 0) {
      gRing.setColor(0);
      drawRadialLine(gRing, endFCat[i], RAD[RI_SEGMENT] + 1, RING_THICK_SEGMENT + 2);
      gRing.setColor(i);
      fillBeforeBoundary(gRing, endFCat[i], RAD[RI_SEGMENT], PAL_BG_ALIAS, distance);
      gRing.setColor(PAL_BG_ALIAS);
      drawRadialLine(gRing, endFCat[i], RAD[RI_SEGMENT] + 1, RING_THICK_SEGMENT + 2);
    }
  }
  const img = { width: W, height: H, transparent: 0, bpp: 4,
                buffer: gRing.buffer, palette: palRing, };
  g.drawImage(img, 0, 0);
  if (DEBUGGING && forceRedraw) gRing.dump();
}

function getFallowStartMin() { "jit"; return round(totalMin * 3 / 8); }
// #endregion

function getScaledFallowAmt() {
  // Only show up to half a day, but at higher precision
  return Math.min(Math.ceil(pendingTimeCat[FALLOW_IDX] * 2 / MIN), fallowScale);
}
function drawRingGauges() {
  let start = 0, overflowGauges = newArray(16);
  let redrawOverflow = false;
  let msStart, msTotal = 0;
  for (let i = FIRST_FRUITFUL_IDX; i < settings.fruitful.length; i++) {
    let targetMin = targetMinFCat[i];
    let minCur = getMin(i);
    let minOverwork = Math.max(minCur - targetMin, 0);
    msStart = curMs();
    let gauge = getGauge(startFCat[i], minCur - minOverwork, targetMin, i, RI_GAUGE);
    msTotal += curMs() - msStart;
    if (null != gauge.amtToDraw) {
      //log_debug(gauge);
      msStart = curMs();
      drawArcGauge(gauge);
      log_debug(modeCat[gauge.idxCat] + ' took ' + (curMs() - msStart) + 'ms');
    }
    if (0 !== minOverwork) {
      gauge = getGauge(start, minOverwork, minOverwork, i, RI_OVERFLOW_GAUGE);
      overflowGauges[i] = gauge;
      if (0 !== gauge.amtToDraw) redrawOverflow = true;
      start += minOverwork;
    }
  }

  start = 0;
  for (let i = -FIRST_DECENTER_IDX; i < settings.decentering.length; i++) {
    let decenter = getMin(-i);
    if (0 !== decenter) {
      let gauge = getGauge(start, decenter, decenter, -i, RI_OVERFLOW_GAUGE);
      setAt(overflowGauges, -i, gauge);
      if (0 !== gauge.amtToDraw) redrawOverflow = true;
      start += decenter;
    }
  }

  log_debug('Gauges took ' + msTotal + 'ms');
  msStart = curMs();
  drawFallowGauge(getScaledFallowAmt());
  log_debug('Fallow took ' + (curMs() - msStart) + 'ms');

  if (redrawOverflow) {
    clearOverflow();
    for (let i = FIRST_FRUITFUL_IDX; i < overflowGauges.length; i++) {
      //log_debug(overflowGauges[i] || i);
      if (overflowGauges[i]) {
        msStart = curMs();
        drawArcGauge(overflowGauges[i]);
        log_debug('Drawing overflow for ' + at(modeCat, overflowGauges[i].idxCat)
                  + ' took ' + (curMs() - msStart) + 'ms');
      }
    }
  }
}

var transientMsgDrawnAt = 0, transientMsg;
function clearTransientOrCIText(col) {
  g.setColor(col);
  g.fillRect(CI_TEXT_X - 1, CI_TEXT_Y - 2, CI_TEXT_X + CI_TEXT_W + 1, CI_TEXT_Y + CI_TEXT_H + 2);
}
function setTransientMsg(text) {
  if (text) {
    transientMsgDrawnAt = Date.now();
  } else {
    transientMsgDrawnAt = 0;
  }
  transientMsg = text;
  drawTransientMsg();
}
// TODO: Collapse these together more?
function drawTransientOrCIText(msg) {
  if (!msg) return;
  g.setFontAlign(0, -1);
  const disp = g.findFont(msg, {w: CI_TEXT_W, h: CI_TEXT_H, wrap: false, trim: true});
  g.drawString(disp.text, X_C, CI_TEXT_Y + 2);
}
function drawTransientMsg() {
  if (null == transientMsgDrawnAt) return;
  clearTransientOrCIText(g.theme.bg);
  if ((transientMsgDrawnAt + (MIN * 1000)) < Date.now()) {
    transientMsgDrawnAt = null;
    transientMsg = null;
    if (curClockInfo) {
      lastCIName = '';
      curClockInfo.redraw();
    }
  } else {
    g.setColor(g.theme.fg);
    g.drawRect(CI_TEXT_X - 1, CI_TEXT_Y - 2, CI_TEXT_X + CI_TEXT_W + 1,
               CI_TEXT_Y + CI_TEXT_H + 1);
    drawTransientOrCIText(transientMsg);
  }
}

var inMenu = false, curClockInfo;
function drawFace() {
  if (inMenu) return;
  var date = new Date();

  let msTransient = measureEffectDuration(() => drawTransientMsg());
  let msTime = measureEffectDuration(() => drawTime(date));
  let msEmpty = measureEffectDuration(() => drawEmptySegments());
  let msFilled = measureEffectDuration(() => drawRingGauges());
  let msClockInfo = measureEffectDuration(() => {
    if (curClockInfo) curClockInfo.redraw();
  });
  //drawCount++;
  var overallMs = curMs() - Math.round(date.valueOf());
  log_debug(`${overallMs}ms for drawing (time: ${msTime}, transient: ${msTransient}, ` +
            `segments: ${msFilled}+${msEmpty}, CI: ${msClockInfo})`);
  // Expensive if you aren't resetting the watch all the time
  if (DEBUGGING) saveSettings(settings);
}

function clearDrawingCache() {
  prevDrawnTime = null;
  totalMinDrawn = 0;
  clearOverflow();
  prevDrawnSegment.fill(null);
  lastCIValue = null;
  lastCIName = '';
}

function redrawWholeFace() {
  inMenu = false;
  clearDrawingCache();
  g.clear();
  buttons.forEach(b => b.draw());
  if (curClockInfo) curClockInfo.redraw();
  draw();
}

var cachedFace = null;
function saveMenuFaceCache() {
  cachedFace = g.asImage('string');
}
function restoreCachedFace() {
  if (cachedFace) {
    inMenu = false;
    g.drawImage(cachedFace);
    cachedFace = null;
    drawFace();
  } else {
    redrawWholeFace();
  }
}

class Button {
  constructor(name, corner, size, color, callback) {
    this.name = name;
    this.corner = corner;
    this.size = size;
    this.color = color;
    this.callback = callback;
    this.selected = false;
    const maxX = W - 1, maxY = H - 1, pad = 5;
    let yA, yB;
    switch (corner) {
      case 'tl':
        this.alignment = [-1, -1];
        yA = size; yB = 0;
        break;
      case 'bl':
        this.alignment = [-1, 1];
        yA = maxY - size; yB = maxY;
        break;
      case 'tr':
        this.alignment = [1, -1];
        yA = 0; yB = size;
        break;
      case 'br':
        this.alignment = [1, 1];
        yA = maxY; yB = maxY - size;
        break;
    }
    const isRight = this.alignment[0] > 0, isBottom = this.alignment[1] > 0;
    this.polyOuter = [
      isRight ? maxX : 0,
      isBottom ? maxY : 0,
      isRight ? maxX - size : 0,
      yA,
      isRight ? maxX : size,
      yB
    ];
    this.polyInner = [
      isRight ? maxX - pad : pad,
      isBottom ? maxY - pad : pad,
      isRight ? maxX - size + pad : pad,
      // XXX: Confusing, I probably botched the coordinate order somehow
      yA + ((isRight && isBottom ? -pad : pad)),
      isRight ? maxX - pad : size - pad,
      yB - ((isRight && isBottom ? -pad : pad))
    ];
  }
  // if pressed, fire the callback
  check(x, y) {
    //log_debug(this.name + ":check() x=" + x + " y=" + y);
    var x_dist = this.corner == 'bl' || this.corner == 'tl' ? W - x : x;
    var y_dist = this.corner == 'tr' || this.corner == 'tl' ? H - y : y;
    if (y_dist + x_dist >= H + W - 2 * this.size) {
      //log_debug(this.name + " callback\n");
      this.callback();
      return true;
    }
    return false;
  }
  draw() {
    // TODO: Optimize redraws? There aren't that many...
    if (this.selected) {
      g.setColor(this.color).fillPoly(this.polyOuter);
      g.setColor(g.theme.fg).setFont('Vector', 22);
      g.setFontAlign(this.alignment[0], this.alignment[1]);
      const xOffset = this.alignment[0] * -2;
      const yOffset = this.alignment[1] * -2;
      g.drawString(this.name[0], (W + xOffset) % W, (H + yOffset) % H);
    } else if (!Bangle.isLocked()) {
      g.setColor(this.color).fillPoly(this.polyOuter);
      g.setColor(g.theme.bg).fillPoly(this.polyInner);
    } else {
      g.setColor(g.theme.bg).fillPoly(this.polyOuter);
    }
  }
}

Bangle.on('touch', function (button, xy) {
  if (inMenu) return;
  var x = xy.x;
  var y = xy.y;
  // adjust for outside the dimension of the screen
  // http://forum.espruino.com/conversations/371867/#comment16406025
  if (y > H) y = H;
  if (y < 0) y = 0;
  if (x > W) x = W;
  if (x < 0) x = 0;

  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].check(x, y)) return;
  }
});

Bangle.on('lock', () => { buttons.forEach(b => b.draw()); });

function selectButton(newMode) {
  const curMode = settings.cur_mode;
  if (curMode >= FIRST_FRUITFUL_IDX) {
    buttons[0].selected = false;
  } else if (curMode <= FIRST_DECENTER_IDX) {
    buttons[2].selected = false;
  } else if (curMode === FALLOW_IDX) {
    buttons[1].selected = false;
  }
  if (newMode >= FIRST_FRUITFUL_IDX) {
    lastFruitful = newMode;
    buttons[0].selected = true;
    buttons[0].color = palCat[newMode];
    buttons[0].name = modeCat[newMode];
  } else if (newMode <= FIRST_DECENTER_IDX) {
    lastDecentering = newMode;
    buttons[2].selected = true;
    buttons[2].color = at(palCat, newMode);
    buttons[2].name = at(modeCat, newMode);
  } else {
    buttons[1].selected = true;
  }
  buttons.forEach(b => b.draw());
}

var prevSpentMode, tsModeSwitched = curMs();
function setCurMode(newMode) {
  //log_debug('Setting cur_mode to ' + newMode);
  const sameKind = Math.sign(newMode) === Math.sign(settings.cur_mode);
  let earlySwitch = false;
  if (!sameKind || curMs() - tsModeSwitched >= MIN * 1000 ) {
    prevSpentMode = settings.cur_mode;
    if (prevSpentMode >= FIRST_FRUITFUL_IDX) lastBuzzCheck = new Date().valueOf();
    earlySwitch = prevSpentMode < FIRST_FRUITFUL_IDX &&
                       newMode >= FIRST_FRUITFUL_IDX && pendingTimeCat[FALLOW_IDX] > 0;
    if (earlySwitch && tsFallowRanDry) log_debug(`Switching early but with tsFallowRanDry at ${tsFallowRanDry}`);
    if (FALLOW_IDX === prevSpentMode && newMode >= FIRST_FRUITFUL_IDX && tsFallowRanDry) {
      secFallowFixupEligible -= Math.round((curMs() - tsFallowRanDry) / 1000);
      if (secFallowFixupEligible < 0) secFallowFixupEligible = 0;
      tsFallowRanDry = null;
    } else if (FALLOW_IDX === prevSpentMode && newMode >= FIRST_FRUITFUL_IDX) {
      secFallowFixupEligible -= pendingTimeCat[FALLOW_IDX];
      if (secFallowFixupEligible < 0) secFallowFixupEligible = 0;
    } else if (FALLOW_IDX === newMode) {
      secFallowFixupEligible = pendingTimeCat[FALLOW_IDX];
    }
  } else {
    log_debug('Quick fixup opportunity');
  }
  updateTotals();
  if (inMenu) {
    E.showMenu();
    restoreCachedFace();
  }
  selectButton(newMode);
  settings.cur_mode = newMode;
  tsModeSwitched = curMs();
  if (earlySwitch) {
    settings.early_switches++;
    setTransientMsg('Early!');
  } else {
    // XXX: Weird place to remove transient messages
    setTransientMsg();
  }
  saveSettings(settings);
}

function fixLateStart(sec) {
  const curMode = settings.cur_mode;
  var amts = lateStartAdjustments(pendingTimeCat, curMode, prevSpentMode, sec);
  const curTotalBefore = at(pendingTimeCat, curMode);
  const prevTotalBefore = at(pendingTimeCat, prevSpentMode);
  const fallowTotalBefore = at(pendingTimeCat, FALLOW_IDX);
  spendTime(curMode, amts[0]);
  spendTime(prevSpentMode, -amts[1]);
  const curDiff = at(pendingTimeCat, curMode) - curTotalBefore;
  const prevDiff = at(pendingTimeCat, prevSpentMode) - prevTotalBefore;
  const fallowDiff = at(pendingTimeCat, FALLOW_IDX) - fallowTotalBefore;
  // var mm = Math.floor(amts[0] / MIN), ss = amts[0] % MIN;
  // var msgTime = ss != 0 ? `${mm} min and ${ss} sec` : `${mm} min`;
  // var msg = `Added ${msgTime} to ${modeCat[curMode]} from ${modeCat[prevSpentMode]}`;
  //E.showMenu();
  log_debug(`${curDiff}s to ${at(modeCat, curMode)}`
            + ` from ${prevDiff}s in ${at(modeCat, prevSpentMode)}`
            + (fallowDiff != 0 ? ` and ${fallowDiff}s fallow` : ''));
  //E.showPrompt(msg, {title: 'Moved Start Earlier', buttons: {OK:true}}).then(restoreCachedFace);
  E.showMenu();
  restoreCachedFace();
}

function pickLateStartAmt(back) {
  let submenu = [ { title: 'As far as possible', onchange: () => fixLateStart(MAX_SEC)} ];
  submenu[""] = { title: 'Move start earlier', back: back };
  let poss = lateStartAdjustments(pendingTimeCat, settings.cur_mode, prevSpentMode, MAX_SEC);
  let secsAvail = poss[0], arrMinOptions = [];
  if (secsAvail >= MIN) {
    submenu.push({ title: 'By 1 min', onchange: () => fixLateStart(MIN)});
    for (let i = 2; i < 10; i++) arrMinOptions.push(i);
    for (let i = 10; i <= 60; i+= 5) arrMinOptions.push(i);
    for (let j = 0; j < arrMinOptions.length; j++) {
      let secsDesired = arrMinOptions[j] * MIN;
      if (secsDesired > secsAvail) break;
      submenu.push({ title: 'By ' + arrMinOptions[j] + ' mins',
                      onchange: () => fixLateStart(secsDesired)});
    }
  }
  E.showMenu(submenu);
  inMenu = true;
}

var lastFruitful = FIRST_FRUITFUL_IDX, lastDecentering = FIRST_DECENTER_IDX;
function pickFruitful() {
  if (settings.cur_mode < FIRST_FRUITFUL_IDX) {
    setCurMode(lastFruitful);
    return;
  }
  var menu = { "": { title: '-- Fruitful --', back: restoreCachedFace } };
  for (let i = FIRST_FRUITFUL_IDX; i < settings.fruitful.length; i++) {
    let newMode = i, title = modeCat[newMode];
    menu[title] = () => setCurMode(newMode);
  }
  if (settings.cur_mode >= FIRST_FRUITFUL_IDX && prevSpentMode != undefined) {
    menu['(Fix start...)'] = () => pickLateStartAmt(() => E.showMenu(menu));
  }
  saveMenuFaceCache();
  inMenu = true;
  E.showMenu(menu);
}

function pickRecenter() {
  if (settings.cur_mode === FALLOW_IDX && prevSpentMode != undefined) {
    saveMenuFaceCache();
    pickLateStartAmt(() => { E.showMenu(); restoreCachedFace(); });
  } else {
    setCurMode(FALLOW_IDX);
  }
}

function pickDecenter() {
  if (settings.cur_mode > FIRST_DECENTER_IDX) {
    setCurMode(lastDecentering);
    return;
  }
  var menu = { "": { title: '-- Decentering --', remove: () => { inMenu = false; } } };
  for (let i = -FIRST_DECENTER_IDX; i < settings.decentering.length; i++) {
    let newMode = -i, title = at(modeCat, newMode);
    menu[title] = () => setCurMode(newMode);
  }
  if (settings.cur_mode <= FIRST_DECENTER_IDX && prevSpentMode != undefined) {
    menu['(Fix start...)'] = () => pickLateStartAmt(() => E.showMenu(menu));
  }
  saveMenuFaceCache();
  inMenu = true;
  E.showMenu(menu);
}

var buttons = [new Button('fruitful', 'tr', 40, '#0f0', pickFruitful),
               new Button(' recenter', 'br', 40, '#860', pickRecenter),
               new Button('decenter', 'bl', 40, '#f00', pickDecenter)];

// timeout used to update every minute
var drawTimeout;
var totals_updated_at;

/** Logs current totals to CSV format, assuming most current file has the same
 *  set of categories (which should be maintained by settings and the web interface).
 */
function logWriteCurTotals() {
  var candidates = logCurFilenames(), sf;
  if (candidates.length === 0) {
    sf = logStartNew(candidates);
  } else {
    sf = storage.open(at(candidates, -1), 'a');
  }
  sf.write(settings.last_reset + ',' + settings.early_switches + ',' + 
           pendingTimeCat.slice(FIRST_FRUITFUL_IDX).join(',') + "\n");
}

function resetTotals() {
  const now = new Date();
  clearDrawingCache();
  logWriteCurTotals();
  settings.early_switches = 0;
  if (now.getDay() === firstDayOfWeek) {
    for (const cat of settings.fruitful.concat(settings.decentering)) {
      if (null != cat.sec_this_week) cat.sec_this_week = 0;
    }
  } else {
    settings.fruitful.concat(settings.decentering).forEach((cat, i, _arr) => {
      if (null != cat.sec_this_week) cat.sec_this_week += pendingTimeCat[i];
    });
  }
  setTargets();
  pendingTimeCat.fill(0);
  settings.cur_mode = FALLOW_IDX;
  totals_updated_at = now;
  settings.last_reset = ymd(now);
  saveSettings(settings);
}

function updateTotals() {
  const now = new Date();
  var ymdNow = ymd(now), hrNow = now.getHours();
  if (ymdNow != settings.last_reset && HR_RESET <= hrNow) {
    resetTotals();
  } else {
    if (!totals_updated_at) totals_updated_at = now;
    let update_sec = Math.round((now.getTime() - totals_updated_at.getTime()) / 1000);
    totals_updated_at = now;
    spendTime(settings.cur_mode, update_sec);
  }
}

// schedule a draw for the next minute or every sec_update ms
function queueDraw() {
  let now = Date.now();
  let delay = nextUpdateMs - (now % nextUpdateMs);
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(function () {
    drawTimeout = undefined;
    draw();
  }, delay);
}

loadRuntimeSettings();

// Stop updates when LCD is off, restart when on
Bangle.on('lcdPower', on => {
  if (on) {
    updateTotals();
    draw(); // draw immediately, queue redraw
  } else { // stop draw timer
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
  }
});

function clockBtn(btn) {
  log_debug(`In clockBtn with btn=${btn}`);
  // TODO: Handle eventual B3 appropriately
  if (BANGLEJS2 || btn === 2) {
    updateTotals();
    saveSettings(settings); // Retains data when leaving the face
    Bangle.showLauncher();
  }
}

var lastCIValue, lastCIFocus = false, lastCIName = '';
function drawGaugeClockInfo (itm, info, options) {
  g.reset();
  if (!transientMsg && (options.focus != lastCIFocus || itm.name != lastCIName)) {
    // TODO: Improve L&F
    clearTransientOrCIText(options.focus ? palCI[1] : g.theme.bg);
    lastCIFocus = options.focus;
    lastCIName = itm.name;
    g.setColor(palCI[2]);
    drawTransientOrCIText(lastCIName);
  }
  const maxSpan = info.max - info.min;
  const maxNormalizer = maxSpan / CI_GAUGE_W;
  const normalValue = E.clip(Math.round((0|(info.v - info.min)) / maxNormalizer), 0, CI_GAUGE_W);
  if (lastCIValue === normalValue) return;
  const xValue = CI_GAUGE_X + normalValue;
  g.setColor(palCI[2]);
  g.fillRect(CI_GAUGE_X, CI_GAUGE_Y, xValue, CI_GAUGE_Y + CI_GAUGE_H);
  if (!lastCIValue) {
    g.setColor(palCI[1]);
    g.fillRect(xValue, CI_GAUGE_Y, CI_GAUGE_X + CI_GAUGE_W, CI_GAUGE_Y + CI_GAUGE_H);
  }
  lastCIValue = normalValue;
}

// TODO: Get clock-info running correctly in emulator too, with separate module?
var clockInfo;
function eligibleClockInfoItems() {
  var raw = clockInfo.load(), ret = [];
  for (let i = 0; i < raw.length; i++) {
    let items = raw[i].items.filter(itm => itm.hasRange);
    if (items.length > 0) {
      raw[i].items = items;
      ret.push(raw[i]);
    }
  }
  return ret;
}
if (!EMULATOR) {
  clockInfo = require("clock_info");
  curClockInfo = clockInfo.addInteractive(eligibleClockInfoItems(), {
    x: CI_TEXT_X, y: CI_TEXT_Y - 1, w: CI_TEXT_W, h: CI_TEXT_H, // For automatic tap detection
    draw: drawGaugeClockInfo
  });
}

E.showMenu(); // Dumb hack to reduce first-time flickering

setTimeout(() => redrawWholeFace(), 50);

Bangle.setUI({mode: 'clock', btn: clockBtn});
Bangle.loadWidgets();
/*
 * we are not drawing the widgets as we are taking over the whole screen
 */
widget_utils.hide();
