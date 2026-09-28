/**
 Exploration game state
 */

// module imports

const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
const mapscript_m = require("heroine_mapscript");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");
const tileset_m = require("heroine_tileset");
const treasure_m = require("heroine_treasure");

// exports

exports.init = function() {
  return {
  encounter_chance: 0,
  encounter_increment: 0.05,
  encounter_max: 0.30,
  message: "",
  // found items for rendering
  treasure_id: 0,
  gold_value: 0,
  };
};


/**
 * Exploration
 * The heroine's basic movement happens here
 * Also most other game states trigger from here
 * and completed states usually return here.
 */
exports.logic = function (ctx) {
  var explore = ctx.explore;

  explore.message = "";

  avatar_m.explore(ctx);

  // check map exit
  if (ctx.avatar.moved) {
    if (mazemap_m.check_exit(ctx)) {
      // display the name of the new map
      explore.message = ctx.atlas.maps[ctx.mazemap.current_id].name;
      // don't allow a random encounter when switching maps
      avatar_m.save(ctx);
      return;
    }
  }

  // check special script
  if (ctx.avatar.moved) {
    if (mapscript_m.exec(ctx, ctx.mazemap.current_id)) {
      avatar_m.save(ctx);
      return;
    }
  }

  /*
  // check shop
  if (avatar.moved) {
    if (mazemap_check_shop()) {
      gamestate = STATE_DIALOG;
      redraw = true;
      avatar_save();
      return;
    }
  }

  // check random encounter
  var enemy_options = atlas.maps[mazemap.current_id].enemies.length;
  if (avatar.moved && enemy_options > 0) {

    if (Math.random() < explore.encounter_chance) {
      explore.encounter_chance = 0.0;
      gamestate = STATE_COMBAT;
      action.select_pos = BUTTON_POS_ATTACK;
      combat.timer = COMBAT_INTRO_DELAY;
	  combat.phase = COMBAT_PHASE_INTRO;

      // choose an enemy randomly from the list for this map
      var enemy_roll = Math.floor(Math.random() * enemy_options);
      var enemy_id = atlas.maps[mazemap.current_id].enemies[enemy_roll];
	  combat_set_enemy(enemy_id);

      return;
    }
    else {
      explore.encounter_chance += explore.encounter_increment;
      explore.encounter_chance = Math.min(explore.encounter_chance, explore.encounter_max);
    }
  }
  // check opening info screen (keyboard)
  if (pressing.action && !input_lock.action) {
    gamestate = STATE_INFO;
	input_lock.action = true;
	redraw = true;
    action.select_pos = BUTTON_POS_INFO;
	info_clear_messages();
    sounds_play(SFX_CLICK);
    return;
  }

  // check opening info screen (mouse)
  if (pressing.mouse && !input_lock.mouse && isWithin(mouse_pos, BUTTON_POS_INFO)) {
    gamestate = STATE_INFO;
	input_lock.mouse = true;
	redraw = true;
    action.select_pos = BUTTON_POS_INFO;
	info_clear_messages();
	sounds_play(SFX_CLICK);
    return;
  }
  */

};


exports.render = function(ctx) {
  var avatar = ctx.avatar;
  var explore = ctx.explore;

  tileset_m.background_render(ctx.atlas.maps[ctx.mazemap.current_id].background);
  mazemap_m.render(ctx.mazemap, avatar.x, avatar.y, avatar.facing);
  // HUD elements

  // direction
  bitfont_m.render(avatar.facing, 80, 2, bitfont_m.JUSTIFY_CENTER);

  // if there is treasure to display, put the message higher
  if (explore.gold_value > 0 || explore.treasure_id > 0) {
    bitfont_m.render(explore.message, 80, 70, bitfont_m.JUSTIFY_CENTER);
  }
  else {
    bitfont_m.render(explore.message, 80, 100, bitfont_m.JUSTIFY_CENTER);
  }

  //info_render_button();  // FIXME port info (M4)

  //if (OPTIONS.minimap) {  // FIXME port options (M8)
    minimap_m.render(ctx);
  //}

  // if a map event has rewarded gold to the player
  // display it on the ground here
  if (explore.gold_value > 0) {
    treasure_m.render_gold(explore.gold_value);
    explore.gold_value = 0;
  }

  // display treasure on the ground
  if (explore.treasure_id > 0) {
    treasure_m.render_item(explore.treasure_id);
    explore.treasure_id = 0;
  }
};