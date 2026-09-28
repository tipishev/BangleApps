/**
 Primary game state switcher
 */

// module imports
const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
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
  // like the original bitfont_determinecolor(): red text when badly hurt
  bitfont_m.set_color(avatar_m.is_badly_hurt(ctx.avatar)
                      ? bitfont_m.FONT_RED : bitfont_m.FONT_WHITE);
  switch (ctx.state) {
    case config_m.STATE_EXPLORE:
      explore_m.render(ctx);
      break;
    // not ported yet: info (M4), combat (M5), dialog (M7), title (M8)
  }
};
