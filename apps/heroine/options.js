/**
 User options, set from the title's Options menu

 The original has music and sound; the watch has vibration instead.
 Like the original, the minimap is off while exploring unless enabled
 (it's always on the Info screen).
 */

const storage_m = require("Storage");

const OPTIONS_FILE = "heroine.options.json";

const DEFAULTS = {
  animation: true,
  vibration: true,
  minimap: false,
};

exports.load = function() {
  return Object.assign({}, DEFAULTS, storage_m.readJSON(OPTIONS_FILE, true) || {});
};

exports.save = function(options) {
  storage_m.writeJSON(OPTIONS_FILE, options);
};
