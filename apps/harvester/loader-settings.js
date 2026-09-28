/* global document, Util, Puck, Set, Intl, navigator */
/* exported denormalizeSettings */

var fruitfulElement = document.getElementById("fruitful");
var decenteringElement = document.getElementById("decentering");
var btnSave = document.getElementById("btnSave");
var btnCancel = document.getElementById("btnCancel");
var settings = {};

// XXX: Fill in needed var structure for compat
const weekInfo = new Intl.Locale(navigator.language).getWeekInfo();
const global_settings = { firstDayOfWeek: weekInfo.firstDay % 7 };

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

// #region XXX: Ensure these are kept in sync between settings.js and loader-settings.js
const color_options = [
  'Lavender', 'Purple', 'Deep Blue', 'Medium Blue', 'Cyan', 'Dark Green', 'Green',
  'Yellow', 'Orange', 'Red', 'Brick', 'Gray', 'Blk/Wht'];
const fg_code = [
  '#f0f', '#80f', '#00f', '#08f', '#0ff', '#080', '#0f0',
  '#ff0', '#f80', '#f00', '#800', '#888', null];
const gy_code = [
  '#202', '#202', '#002', '#022', '#022', '#020', '#020',
  '#220', '#220', '#200', '#200', '#222', null];
// #endregion

// #region XXX: Ensure these are kept in sync between loader-settings.js and app.js
function totalTargetMin(fruitful) {
  return fruitful.target_min_override.reduce((acc, c, _i, _arr) =>
                                   acc + (c >= 0 ? c : fruitful.target_min), 0);
}
// #endregion

var needsNewLogFile = false;
function registerChange(affectsLog) {
  btnSave.disabled = false;
  btnCancel.disabled = false;
  if (true === affectsLog) needsNewLogFile = true;
}

function parseCategory(elem, arrRef) {
  let color = elem.querySelector('*[name=color]').value;
  let iColor = color_options.indexOf(color), id = new Number(elem.dataset.id);
  let cat = arrRef?.find(c => c.id == id) || { id: id };
  cat.title = elem.querySelector('input[name=title]').value;
  cat.color = color;
  cat.fg = fg_code[iColor];
  cat.gy = gy_code[iColor];
  let targetMin = elem.querySelector('input[name=target_min]')?.value;
  if (targetMin) {
    cat.target_min = 0 | targetMin;
    cat.target_min_override = cat.target_min_override || new Array(7).fill(-1);
  }
  // TODO: Bring these together under fruitful check
  cat.adapt_to_week = !!(elem.querySelector('input[name=adapt_to_week]')?.checked)
  const elemOverrides = Array.from(elem.querySelectorAll('menu input[type=number]'));
  const targetMinOverride = elemOverrides.map(e => '' == e.value ? -1 : 0 | e.value);
  if (targetMinOverride.some(v => v >= 0)) {
    cat.target_min_override = targetMinOverride;
  }
  return cat;
}

function saveToBangle() {
  Util.showModal('Saving settings...');
  console.log('Settings before save', settings);
  let oldFruitful = settings.fruitful;
  settings.fruitful = [{}];
  for (let fElem of fruitfulElement.querySelectorAll('tbody')) {
    settings.fruitful.push(parseCategory(fElem, oldFruitful));
  }
  let oldDecentering = settings.decentering;
  settings.decentering = [{}];
  for (let dElem of decenteringElement.querySelectorAll('tbody')) {
    settings.decentering.push(parseCategory(dElem, oldDecentering));
  }

  if (needsNewLogFile) {
    console.log('Writing new log file for altered category list');
    Puck.eval('logStartNew(logCurFilenames()) != undefined', () => { });
    needsNewLogFile = false;
  }

  Util.writeStorage(SETTINGS_FILE, JSON.stringify(settings), _data => {
    Puck.eval('reloadFromWeb()', () => {
      btnSave.disabled = true;
      btnCancel.disabled = true;
      Util.hideModal();
    });
  });
}

function loadFromBangle() {
  Util.showModal('Loading settings...');
  // TODO: Unsnarl this budding callback chasm
  Puck.eval('logCurFilenames()', filenames => {
    let ul = document.getElementById('logs');
    for (let f of filenames) {
      let li = document.createElement('li'), filename = f;
      // TODO: Add deletion
      li.textContent = filename.replace(/^harvester-|\.csv$/g, '');
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        li.style.cursor = 'wait';
        Util.readStorageFile(filename, data => {
          li.style.cursor = 'pointer';
          Util.saveCSV(filename.replace(/\.csv$/, ''), data);
        });
      });
      ul.appendChild(li);
    }
    Util.readStorageJSON(SETTINGS_FILE, data => {
      settings = normalizeSettings(data);
      fruitfulElement.querySelectorAll('tbody').forEach(e => e.remove());
      const totalMin = settings.fruitful.reduce((sum, c, _i, _a) =>
        sum + (c.target_min || 0), 0);
      for (let cat of settings.fruitful) {
        if (cat.title || cat.id) fruitfulElement.appendChild(createCategoryEdit(cat, totalMin));
      }
      decenteringElement.querySelectorAll('tbody').forEach(e => e.remove());
      for (let cat of settings.decentering) {
        if (cat.title || cat.id) decenteringElement.appendChild(createCategoryEdit(cat, totalMin));
      }

      btnSave.disabled = true;
      btnCancel.disabled = true;
      Util.hideModal();
    });
  });
}

/* exported deleteCategory */
function deleteCategory(evt) {
  var elemCat = evt.target.closest('[data-id]');
  if (!elemCat) {
    console.log("Couldn't find elements to delete", evt);
    return;
  }
  var elemContainer = elemCat.parentNode;
  elemContainer.removeChild(elemCat);
  registerChange(true);
}

function toggleCustomizations(evt) {
  const chk = evt.target, elemCat = chk.closest('*[data-id]');
  elemCat.children[2].style.display = chk.checked ? 'table-row' : 'none';
}

function hrs(min) {
  const rounded = Math.round(min * 4 / 60) / 4, ret = Math.floor(rounded).toString();
  switch (rounded % 1) {
    case 0: return ret;
    case 0.25: return ret + '¼';
    case 0.50: return ret + '½';
    case 0.75: return ret + '¾';
  }
}

// TODO: Reunify with other two?
function totalTargetMinBefore(fruitful, today) {
  return fruitful.target_min_override.slice(0, today).reduce((acc, c, _i, _arr) =>
                                      acc + (c >= 0 ? c : fruitful.target_min), 0);
}

function calcMeter(cat, totalMin) {
  const { sec_this_week, sec_today, target_min } = cat;
  const minThisWeek = Math.round(((sec_this_week ?? 0) + (sec_today ?? 0)) / 60);
  const today = new Date().getDay();
  if (target_min) {
    const minWeekTarget = totalTargetMin(cat);
    const done = minThisWeek >= minWeekTarget;
    const minTargetSoFar = totalTargetMinBefore(cat, today + 1);
    const low = totalTargetMinBefore(cat, today);
    const high = done ? minTargetSoFar * 1.2 : minTargetSoFar;
    return {
      minThisWeek, low, high,
      max: minWeekTarget * 1.3,
      optimum: minTargetSoFar + 1,
      meterTitle: minTargetSoFar >= 120 ? 
                  `${hrs(minThisWeek)} hrs of ${hrs(minTargetSoFar)} so far` :
                  `${minThisWeek} min of ${minTargetSoFar} so far`,
    };
  }
  else {
    // TODO: Make the baseline & high more principled for overages
    const minBaseline = totalMin / settings.fallow_denominator / 20;
    const high = Math.ceil(minBaseline * 5 * (today + 1));
    const low = Math.ceil(minBaseline * (today + 1));
    return {
      minThisWeek, low, high,
      max: high * 2,
      optimum: 0,
      meterTitle: `${minThisWeek} min so far`,
    };
  }
}

function createCategoryEdit(cat, totalMin) {
  const { id, title, color, target_min, adapt_to_week, target_min_override } = cat;
  const idTemplate = target_min ? 'fruitfulRow' : 'decenteringRow';
  const elemCat = document.importNode(document.getElementById(idTemplate).content, true);
  elemCat.querySelector('tbody').dataset.id = id;
  const iColor = color_options.indexOf(color);
  let colorList = '';
  for (let i = 0; i < color_options.length; i++) {
    let sel = iColor === i ? 'selected' : '';
    colorList += `<option style='background-color: ${fg_code[i]};' ${sel}>${color_options[i]}</option>`;
  }
  elemCat.querySelector('select[name=color]').innerHTML = colorList;
  elemCat.querySelector('input[name=title]').value = title;
  if (target_min) {
    elemCat.querySelector('input[name=adapt_to_week]').checked = !!adapt_to_week;
    elemCat.querySelector('input[name=target_min]').value = target_min;
    const elemCustomizations = elemCat.querySelector('input[name=customizations]');
    elemCustomizations.checked = target_min_override?.some(v => v >= 0);
    elemCustomizations.addEventListener('change', toggleCustomizations);
    if (elemCustomizations.checked) {
      const trCustomizations = elemCat.querySelector('tr:last-of-type');
      trCustomizations.style.display = 'table-row';
      trCustomizations.querySelectorAll('input').forEach((elem, i, _arr) => {
        const v = target_min_override[i];
        if (v > -1) elem.value = v;
      });
    }
  }
  const { minThisWeek, max, high, low, optimum, meterTitle } = calcMeter(cat, totalMin);
  const meter = elemCat.querySelector('meter');
  meter.max = max;
  meter.high = high;
  meter.optimum = optimum;
  meter.low = low;
  meter.value = minThisWeek;
  meter.title = meterTitle;
  return elemCat;
}

function addNewCategory(isFruitful) {
  let elemContainer = isFruitful ? fruitfulElement : decenteringElement;
  let i = elemContainer.querySelectorAll('tbody').length + 1;
  const fruitfulElems = Array.from(fruitfulElement.querySelectorAll('tbody'));
  const decenteringElems = Array.from(decenteringElement.querySelectorAll('tbody'));
  let allCatElems = fruitfulElems.concat(decenteringElems);
  let usedColors = new Set(allCatElems.map(cat => parseCategory(cat).color));
  let availColors = color_options.filter(color => !usedColors.has(color));
  let newColor = availColors[0] ||
    color_options[(Math.floor(Math.random() * color_options.length))];
  let skeleton = {
    title: 'Category ' + i,
    color: newColor,
    id: Math.round(Date.now()),
  };
  if (isFruitful) {
    skeleton.target_min = 15;
    skeleton.target_min_override = new Array(7).fill(-1);
  }
  let totalMin = fruitfulElems.reduce((sum, elem, _i, _a) =>
    sum + totalTargetMin(parseCategory(elem)), 0);
  elemContainer.appendChild(createCategoryEdit(skeleton, totalMin));
  registerChange(true);
}

function populateWeekdayHeader() {
  // Adapted from https://stackoverflow.com/a/76465052
  const WeekdayNames = new Array(7).fill(0).map((_, i) =>
    new Date(0, 0, i).toLocaleString(navigator.language, { weekday: 'long' }));
  
  const elemHeader = document.getElementById('weekdayHeader');
  for (let i = 0; i < 7; i++) {
    const elem = document.createElement('li');
    elem.textContent = WeekdayNames[i];
    elemHeader.appendChild(elem);
  }
}

btnSave.addEventListener("click", saveToBangle);
btnCancel.addEventListener("click", loadFromBangle);
document.getElementById('addFruitful').addEventListener("click",
                                                   () => addNewCategory(true));
document.getElementById('addDecentering').addEventListener("click",
                                                   () => addNewCategory(false));
// Called by app loader on start
/* exported onInit */
function onInit() {
  populateWeekdayHeader();
  loadFromBangle();
}
