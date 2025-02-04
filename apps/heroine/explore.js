/**
 Exploration game state
 */

// module imports

const atlas_m = require("heroine_atlas");
const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");
const tileset_m = require("heroine_tileset");

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

  let avatar = ctx.avatar;
  let gamestate = ctx.gamestate;
  let explore = ctx.explore;
  let input = ctx.input;
  let mazemap = ctx.mazemap;
  let minimap = ctx.minimap;

  let atlas = atlas_m.atlas();

  let result = {};

  explore.message = "";

  const explore_result = avatar_m.explore(avatar, input, mazemap);

  avatar = explore_result.avatar;
  redraw = explore_result.redraw;

  // check map exit
  if (avatar.moved) {
    var check_exit_result = mazemap_m.check_exit(mazemap, avatar);
    if (check_exit_result !== false) {
      mazemap = check_exit_result.mazemap;
      minimap = minimap_m.set_map(minimap, mazemap);

      avatar = check_exit_result.avatar;
	  // display the name of the new map
	  explore.message = atlas.maps[mazemap.current_id].name;
	  // don't allow a random encounter when switching maps
      // avatar_save();  // FIXME implement saving
	}
  }
      result.avatar = avatar;
      result.explore = explore;
      result.gamestate = gamestate;
      result.mazemap = mazemap;
      result.minimap = minimap;
      result.redraw = redraw;
	  return result;
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

  // check special script;
  if (avatar.moved) {
    if (mapscript_exec(mazemap.current_id)) {
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
  var mazemap = ctx.mazemap;

  var atlas = atlas_m.atlas();
  tileset_m.background_render(atlas.maps[mazemap.current_id].background);
  mazemap_m.render(mazemap, avatar.x, avatar.y, avatar.facing);
  // HUD elements

  // direction
  bitfont_m.render(avatar.facing, 60, 34);

  // if there is treasure to display, put the message higher
  if (explore.gold_value > 0 || explore.treasure_id > 0) {
    bitfont_m.render(explore.message, 20, 70);
  }
  else {
    bitfont_m.render(explore.message, 20, 100);
  }

  //if (OPTIONS.minimap) {
    minimap_m.render(ctx);
  //}

  /*

  info_render_button();

  if (OPTIONS.minimap) {
    minimap_render();
  }

  // if a map event has rewarded gold to the player
  // display it on the ground here
  if (explore.gold_value > 0) {
    treasure_render_gold(explore.gold_value);
    explore.gold_value = 0;
  }

  // display treasure on the ground
  if (explore.treasure_id > 0) {
    treasure_render_item(explore.treasure_id);
    explore.treasure_id = 0;
  }
  */
};