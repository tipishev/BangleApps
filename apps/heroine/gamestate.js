/**
 Primary game state switcher
 */

// module imports
const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
const config_m = require("heroine_config");
const explore_m = require("heroine_explore");
const info_m = require("heroine_info");

// exports

exports.init = function() {
  return config_m.STATE_EXPLORE;
};

exports.logic = function(ctx) {
  switch (ctx.state) {
    case config_m.STATE_EXPLORE:
      explore_m.logic(ctx);
      break;
    case config_m.STATE_INFO:
      info_m.logic(ctx);
      break;
    case config_m.STATE_COMBAT:
      // required on the first fight
      require("heroine_combat").logic(ctx);
      break;
    case config_m.STATE_DIALOG:
      require("heroine_dialog").logic(ctx);
      break;
    // not ported yet: title (M8)
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
    case config_m.STATE_INFO:
      info_m.render(ctx);
      break;
    case config_m.STATE_COMBAT:
      require("heroine_combat").render(ctx);
      break;
    case config_m.STATE_DIALOG:
      require("heroine_dialog").render(ctx);
      break;
    // not ported yet: title (M8)
  }
};
