/**
 * Title screen

 Swipes up/down move the selection, a tap chooses, the button goes back
 from the Options menu. Like the original, the main menu offers Continue
 when there is a saved game, otherwise Start.
 */

// module imports
const bitfont_m = require("heroine_bitfont");
const config_m = require("heroine_config");
const options_m = require("heroine_options");

const TITLE_MENU_MAIN = 0;
const TITLE_MENU_OPTIONS = 1;

const TEXT_H = 11;

function on_off(value) {
  return value ? "on" : "off";
}

function set_menu(ctx, id) {
  const title = ctx.title;
  const options = ctx.options;
  if (title.menu_id != id) title.select = 0;
  title.menu_id = id;

  if (id == TITLE_MENU_MAIN) {
    title.menu = [title.can_continue ? "Continue" : "Start", "Options"];
  }
  else if (id == TITLE_MENU_OPTIONS) {
    // the original's "Music" and "Sounds" are "Vibration" on the watch
    title.menu = [
      "Animations are " + on_off(options.animation),
      "Vibration is " + on_off(options.vibration),
      "Minimap is " + on_off(options.minimap),
      "Back",
    ];
  }
  ctx.redraw = true;
}

function start(ctx) {
  // a new game opens with a nightmare, "Wake up" leaves it
  require("heroine_dialog").open(ctx, 8);
  ctx.dialog.option[2].msg1 = "Wake up";
}

function continue_game(ctx) {
  ctx.state = config_m.STATE_EXPLORE;
  ctx.redraw = true;
}

function toggle(ctx, option) {
  ctx.options[option] = !ctx.options[option];
  options_m.save(ctx.options);
  set_menu(ctx, TITLE_MENU_OPTIONS);
}

function confirm(ctx) {
  const title = ctx.title;
  if (title.menu_id == TITLE_MENU_MAIN) {
    if (title.select == 0) {
      if (title.can_continue) continue_game(ctx);
      else start(ctx);
    }
    else if (title.select == 1) {
      set_menu(ctx, TITLE_MENU_OPTIONS);
    }
  }
  else if (title.menu_id == TITLE_MENU_OPTIONS) {
    if (title.select == 0) toggle(ctx, "animation");
    else if (title.select == 1) toggle(ctx, "vibration");
    else if (title.select == 2) toggle(ctx, "minimap");
    else if (title.select == 3) set_menu(ctx, TITLE_MENU_MAIN);
  }
}

// exports

// can_continue: there is a saved game
exports.init = function(ctx, can_continue) {
  ctx.title = {menu_id: -1, select: 0, menu: [], can_continue: can_continue};
  set_menu(ctx, TITLE_MENU_MAIN);
};

exports.logic = function(ctx) {
  const title = ctx.title;
  const input = ctx.input;

  if (input.tick) return;

  if (input.tap) {
    confirm(ctx);
  }
  else if (input.btn) {
    if (title.menu_id == TITLE_MENU_OPTIONS) set_menu(ctx, TITLE_MENU_MAIN);
  }
  else if (input.up) {
    if (title.select > 0) {
      title.select--;
      ctx.redraw = true;
    }
  }
  else if (input.down) {
    if (title.select < title.menu.length - 1) {
      title.select++;
      ctx.redraw = true;
    }
  }
};

exports.render = function(ctx) {
  const title = ctx.title;

  g.drawImage(require("heroine_title_img").images[0](),
              config_m.SCREEN_OFFSET_X, config_m.SCREEN_OFFSET_Y);

  for (var i = 0; i < title.menu.length; i++) {
    const text = title.select == i ? "[ " + title.menu[i] + " ]" : title.menu[i];
    bitfont_m.render(text, 80, 50 + (i * TEXT_H), bitfont_m.JUSTIFY_CENTER);
  }

  if (title.menu_id == TITLE_MENU_MAIN) {
    bitfont_m.render("by Clint Bellanger 2013", 80, 100, bitfont_m.JUSTIFY_CENTER);
    // the original credits its music here, the watch has none
  }
};
