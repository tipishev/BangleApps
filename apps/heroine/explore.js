/**
 Exploration game state
 */

// module imports

const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
const info_m = require("heroine_info");
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

  // a stray animation tick, e.g. right after leaving combat
  if (ctx.input.tick) return;

  explore.message = "";

  // check opening info screen (tap or button)
  if (ctx.input.tap || ctx.input.btn) {
    info_m.open(ctx);
    return;
  }

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

  // check shop
  if (ctx.avatar.moved) {
    var shop_id = mazemap_m.check_shop(ctx);
    if (shop_id >= 0) {
      // required on the first visit
      require("heroine_dialog").open(ctx, shop_id);
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

  // check random encounter
  var enemies = ctx.atlas.maps[ctx.mazemap.current_id].enemies;
  if (ctx.avatar.moved && enemies.length > 0) {

    if (Math.random() < explore.encounter_chance) {
      // choose an enemy randomly from the list for this map
      var enemy_id = enemies[Math.floor(Math.random() * enemies.length)];
      require("heroine_combat").start(ctx, enemy_id, "");
      return;
    }
    else {
      explore.encounter_chance += explore.encounter_increment;
      explore.encounter_chance = Math.min(explore.encounter_chance, explore.encounter_max);
    }
  }

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