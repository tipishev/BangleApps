/**
 Primary game state switcher
 */

// module imports
const config_m = require("heroine_config");
const explore_m = require("heroine_explore");

// exports

exports.init = function() {
  return config_m.STATE_EXPLORE;
};

exports.logic = function(ctx) {
  switch (ctx.state) {
    case config_m.STATE_EXPLORE:
      explore_m.logic(ctx);
      break;
    // not ported yet: info (M4), combat (M5), dialog (M7), title (M8)
  }
};

exports.render = function(ctx) {
  //bitfont_determinecolor();  // FIXME port in M1
  switch (ctx.state) {
    case config_m.STATE_EXPLORE:
      explore_m.render(ctx);
      break;
    // not ported yet: info (M4), combat (M5), dialog (M7), title (M8)
  }
};
