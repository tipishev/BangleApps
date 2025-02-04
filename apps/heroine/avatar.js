/**
 Maze Avatar
 **/


// module imports
const tileset_m = require("heroine_tileset");

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

function move(avatar, mazemap, dx, dy) {
  var result = {};
  var redraw = false;
  var target_tile = mazemap_m.get_tile(mazemap, avatar.x+dx, avatar.y+dy);
  if (tileset_m.is_walkable(target_tile)) {
    avatar.x += dx;
    avatar.y += dy;
    redraw = true;
    avatar.moved = true;
    //avatar_save();
  }
  else {
    // TODO heroine_vibrate.js
    //sounds_play(SFX_BLOCKED);
  }
  result.avatar = avatar;
  result.redraw = redraw;
  return result;
}

function turn_left(avatar) {
  var result = {};
  result.redraw = true; // turning always causes a redraw
  if      (avatar.facing == "north") avatar.facing = "west";
  else if (avatar.facing == "west")  avatar.facing = "south";
  else if (avatar.facing == "south") avatar.facing = "east";
  else if (avatar.facing == "east")  avatar.facing = "north";
  result.avatar = avatar;
  return result;
  //avatar_save();
}

function turn_right(avatar) {
  var result = {};
  result.redraw = true; // turning always causes a redraw
  if (avatar.facing == "north") avatar.facing = "east";
  else if (avatar.facing == "east") avatar.facing = "south";
  else if (avatar.facing == "south") avatar.facing = "west";
  else if (avatar.facing == "west") avatar.facing = "north";
  result.avatar = avatar;
  return result;
  //avatar_save();
}

// exports

// TODO handle savefile loading
exports.init = function() {
  return reset();
};

/**
 * Sleeping restores HP and MP and sets the respawn point
 */
exports.sleep = function(avatar, mazemap) {
  avatar.hp = avatar.max_hp;
  avatar.mp = avatar.max_mp;
  avatar.sleeploc = [mazemap.current_id, avatar.x, avatar.y];
  return avatar;
};

exports.respawn = function(avatar, mazemap) {
  result = {};
  // previously died. restart at last sleep point
  mazemap.set(avatar.sleeploc[0]);
  avatar.x = avatar.sleeploc[1];
  avatar.y = avatar.sleeploc[2];

  avatar.hp = avatar.max_hp;
  avatar.mp = avatar.max_mp;

  // cost of death: lose all gold
  avatar.gold = 0;

  result.avatar = avatar;
  result.mazemap = mazemap;

  return result;
};

exports.explore = function(avatar, input, mazemap) {
  avatar.moved = false;

  // check movement
  if (input.up) {
    if (avatar.facing == "north") return move(avatar, mazemap, 0,-1);
    else if (avatar.facing == "west") return move(avatar, mazemap, -1, 0);
    else if (avatar.facing == "south") return move(avatar, mazemap, 0, 1);
    else if (avatar.facing == "east") return move(avatar, mazemap, 1, 0);
  }
  else if (input.down) {
    if (avatar.facing == "north") return move(avatar, mazemap, 0, 1);
    else if (avatar.facing == "west") return move(avatar, mazemap, 1, 0);
    else if (avatar.facing == "south") return move(avatar, mazemap, 0, -1);
    else if (avatar.facing == "east") return move(avatar, mazemap, -1, 0);
  }
  else if (input.left) {
    return turn_left(avatar);
  }
  else if (input.right) {
    return turn_right(avatar);
  }
};

exports.is_badly_hurt = function(avatar) {
  return (avatar.hp <= avatar.max_hp/3);
};