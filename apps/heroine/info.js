/**
 Info Game State
 Display information about the heroine

 Opened from exploring with a tap or the button. Swipes left/right
 select a spell, a tap casts it, the button closes the screen.
 */

// module imports
const action_m = require("heroine_action");
const bitfont_m = require("heroine_bitfont");
const config_m = require("heroine_config");
const feedback_m = require("heroine_feedback");
const items_m = require("heroine_items");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");
const tileset_m = require("heroine_tileset");

const AVATAR_DRAW_X = 40;
const AVATAR_DRAW_Y = 20;
const WEAPON_LAYERS = 8; // weapon layers follow the armor ones

function clear_messages(ctx) {
  ctx.info.power_action = "";
  ctx.info.power_result = "";
}

function render_layer(layer) {
  // required on first use, exploring never needs the paper doll
  const image = require("heroine_heroine_img").images[layer];
  if (image) {
    g.drawImage(image(), AVATAR_DRAW_X + config_m.SCREEN_OFFSET_X,
                AVATAR_DRAW_Y + config_m.SCREEN_OFFSET_Y);
  }
}

function render_equipment(avatar) {
  // always draw the base
  render_layer(0);

  // render worn equipment
  render_layer(avatar.armor);
  render_layer(WEAPON_LAYERS + avatar.weapon);
}

function render_itemlist(avatar) {
  var item_string;

  // ARMOR
  item_string = items_m.armors[avatar.armor].name;
  if (avatar.bonus_def > 0) {
    item_string += " +";
    item_string += avatar.bonus_def;
  }
  bitfont_m.render(item_string, 2, 65, bitfont_m.JUSTIFY_LEFT);

  // WEAPON
  item_string = items_m.weapons[avatar.weapon].name;
  if (avatar.bonus_atk > 0) {
    item_string += " +";
    item_string += avatar.bonus_atk;
  }
  bitfont_m.render(item_string, 2, 75, bitfont_m.JUSTIFY_LEFT);
}

function render_messages(info) {
  var message_displayed = false;

  if (info.power_action != "") {
    bitfont_m.render(info.power_action, 2, 30, bitfont_m.JUSTIFY_LEFT);
    message_displayed = true;
  }
  if (info.power_result != "") {
    bitfont_m.render(info.power_result, 2, 40, bitfont_m.JUSTIFY_LEFT);
    message_displayed = true;
  }
  return message_displayed;
}

// exports

exports.init = function() {
  return {
    power_action: "",
    power_result: "",
  };
};

exports.open = function(ctx) {
  ctx.state = config_m.STATE_INFO;
  clear_messages(ctx);
  action_m.reset(ctx);
  ctx.redraw = true;
  feedback_m.play(ctx, "click");
};

exports.logic = function(ctx) {
  const avatar = ctx.avatar;
  const input = ctx.input;

  // a stray animation tick
  if (input.tick) return;

  // close the info screen
  if (input.btn) {
    ctx.state = config_m.STATE_EXPLORE;
    ctx.redraw = true;
    feedback_m.play(ctx, "click");
    return;
  }

  // select a spell
  if (input.left) action_m.move_select(ctx, -1);
  if (input.right) action_m.move_select(ctx, 1);

  // cast it
  if (input.tap && avatar.mp > 0) {
    // required on first use, like the combat powers later
    const power_m = require("heroine_power");
    const spell = action_m.selected(ctx);
    if (spell == "heal" && avatar.spellbook >= 1) {
      power_m.heal(ctx);
    }
    else if (spell == "burn" && avatar.spellbook >= 2) {
      power_m.map_burn(ctx);
    }
    else if (spell == "unlock" && avatar.spellbook >= 3) {
      power_m.map_unlock(ctx);
    }
    ctx.redraw = true;
  }
};

exports.render = function(ctx) {
  const avatar = ctx.avatar;

  tileset_m.background_render(ctx.atlas.maps[ctx.mazemap.current_id].background);
  mazemap_m.render(ctx.mazemap, avatar.x, avatar.y, avatar.facing);

  bitfont_m.render("INFO", 80, 2, bitfont_m.JUSTIFY_CENTER);

  if (avatar.spellbook > 0) {
    bitfont_m.render("Spells", 158, 30, bitfont_m.JUSTIFY_RIGHT);
  }

  render_equipment(avatar);
  //info_render_button();  // the watch's button closes the screen
  render_itemlist(avatar);
  exports.render_hpmp(ctx);
  exports.render_gold(ctx);
  action_m.render(ctx);

  if (!render_messages(ctx.info)) {
    // hide the minimap if we need to make room for messages
    minimap_m.render(ctx);
  }
};

exports.render_hpmp = function(ctx) {
  const avatar = ctx.avatar;
  bitfont_m.render("HP " + avatar.hp + "/" + avatar.max_hp, 2, 100, bitfont_m.JUSTIFY_LEFT);
  bitfont_m.render("MP " + avatar.mp + "/" + avatar.max_mp, 2, 110, bitfont_m.JUSTIFY_LEFT);
};

exports.render_gold = function(ctx) {
  bitfont_m.render(ctx.avatar.gold + " Gold", 158, 110, bitfont_m.JUSTIFY_RIGHT);
};
