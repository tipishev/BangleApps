/**
 Maze Avatar
 **/


// module imports
const mazemap_m = require("heroine_mazemap");
const storage_m = require("Storage");
const tileset_m = require("heroine_tileset");

const SAVE_FILE = "heroine.save.json";

// the last saved JSON, to skip writing the same save again
let last_save = null;

//---- Private Functions ---------------------------------------------

function reset() {
  var avatar = {};
  avatar.x = 1;
  avatar.y = 1;
  avatar.facing = "south";
  avatar.moved = false;
  avatar.map_id = 0;
  avatar.weapon = 0;
  avatar.armor = 1;
  avatar.hp = 25;
  avatar.max_hp = 25;
  avatar.mp = 4;
  avatar.max_mp = 4;
  avatar.gold = 0;
  avatar.bonus_atk = 0;
  avatar.bonus_def = 0;
  avatar.spellbook = 0;
  avatar.sleeploc = [0, 1, 1]; // map_id, x, y
  avatar.campaign = [];
  return avatar;
}

function move(ctx, dx, dy) {
  var avatar = ctx.avatar;
  var target_tile = mazemap_m.get_tile(ctx.mazemap, avatar.x+dx, avatar.y+dy);
  if (tileset_m.is_walkable(target_tile)) {
    avatar.x += dx;
    avatar.y += dy;
    avatar.moved = true;
    ctx.redraw = true;
  }
  else {
    // TODO heroine_vibrate.js
    //sounds_play(SFX_BLOCKED);
  }
}

function turn_left(ctx) {
  var avatar = ctx.avatar;
  if      (avatar.facing == "north") avatar.facing = "west";
  else if (avatar.facing == "west")  avatar.facing = "south";
  else if (avatar.facing == "south") avatar.facing = "east";
  else if (avatar.facing == "east")  avatar.facing = "north";
  ctx.redraw = true; // turning always causes a redraw
}

function turn_right(ctx) {
  var avatar = ctx.avatar;
  if (avatar.facing == "north") avatar.facing = "east";
  else if (avatar.facing == "east") avatar.facing = "south";
  else if (avatar.facing == "south") avatar.facing = "west";
  else if (avatar.facing == "west") avatar.facing = "north";
  ctx.redraw = true; // turning always causes a redraw
}

// exports

/**
 * Load the saved avatar, or start a new one
 * Fields missing from an older save get their starting values
 */
exports.init = function() {
  last_save = storage_m.read(SAVE_FILE);
  var saved = storage_m.readJSON(SAVE_FILE, true);
  if (!saved) {
    last_save = null;
    return reset();
  }
  var avatar = Object.assign(reset(), saved);
  avatar.moved = false;
  return avatar;
};

/**
 * Like the original avatar_init(): continue on the saved map, or if the
 * heroine died, straight from her last sleep point (the map she died on
 * isn't loaded, so its scripts don't run)
 */
exports.start = function(ctx) {
  if (ctx.avatar.hp > 0) {
    mazemap_m.set(ctx, ctx.avatar.map_id);
  }
  else {
    exports.respawn(ctx);
  }
};

// a saved game exists (for the title menu's Continue)
exports.has_save = function() {
  return storage_m.read(SAVE_FILE) !== undefined;
};

/**
 * Save on events that matter (map change, rest, chest, combat end,
 * purchase, spells on the map) and when the app closes,
 * not on every step like the original, to spare the flash
 */
exports.save = function(ctx) {
  var json = JSON.stringify(ctx.avatar);
  if (json === last_save) return;
  storage_m.write(SAVE_FILE, json);
  last_save = json;
};

/**
 * Sleeping restores HP and MP and sets the respawn point
 */
exports.sleep = function(ctx) {
  var avatar = ctx.avatar;
  avatar.hp = avatar.max_hp;
  avatar.mp = avatar.max_mp;
  avatar.sleeploc = [ctx.mazemap.current_id, avatar.x, avatar.y];
};

exports.respawn = function(ctx) {
  var avatar = ctx.avatar;
  // previously died. restart at last sleep point
  // (position first: the new map's scripts run for where she stands;
  // the original set the map first, which could open a chest there)
  avatar.x = avatar.sleeploc[1];
  avatar.y = avatar.sleeploc[2];
  mazemap_m.set(ctx, avatar.sleeploc[0]);

  avatar.hp = avatar.max_hp;
  avatar.mp = avatar.max_mp;

  // cost of death: lose all gold
  avatar.gold = 0;
};

exports.explore = function(ctx) {
  var avatar = ctx.avatar;
  var input = ctx.input;
  avatar.moved = false;

  // check movement
  if (input.up) {
    if (avatar.facing == "north") move(ctx, 0,-1);
    else if (avatar.facing == "west") move(ctx, -1, 0);
    else if (avatar.facing == "south") move(ctx, 0, 1);
    else if (avatar.facing == "east") move(ctx, 1, 0);
  }
  else if (input.down) {
    if (avatar.facing == "north") move(ctx, 0, 1);
    else if (avatar.facing == "west") move(ctx, 1, 0);
    else if (avatar.facing == "south") move(ctx, 0, -1);
    else if (avatar.facing == "east") move(ctx, -1, 0);
  }
  else if (input.left) {
    turn_left(ctx);
  }
  else if (input.right) {
    turn_right(ctx);
  }
};

exports.is_badly_hurt = function(avatar) {
  return (avatar.hp <= avatar.max_hp/3);
};
