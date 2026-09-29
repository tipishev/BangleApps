/**
 Scripting for various maps

 exec() runs when a map is loaded (to restore opened chests, burned
 bones and unlocked doors) and after every step on it.
 */

// module imports
const avatar_m = require("heroine_avatar");
const enemy_m = require("heroine_enemy");
const mazemap_m = require("heroine_mazemap");

const BONE_PILES = [
  {map_id:8, x:4, y:7, status:"bone1"},
  {map_id:8, x:4, y:2, status:"bone2"},
  {map_id:8, x:13, y:7, status:"bone3"},
  {map_id:8, x:11, y:5, status:"bone4"},
  {map_id:9, x:5, y:5, status:"bone5"},
  {map_id:9, x:8, y:2, status:"bone6"},
  {map_id:10, x:2, y:4, status:"bone7"},
  {map_id:10, x:4, y:2, status:"bone8"}
];

const LOCKED_DOORS = [
  {map_id:8, x:4, y:12, status:"door1"},
  {map_id:10, x:11, y:3, status:"door2"},
  {map_id:10, x:13, y:3, status:"door3"}
];

// tiles used by the scripts
const TILE_DUNGEON_FLOOR = 1;
const TILE_DUNGEON_DOOR = 3;
const TILE_DUNGEON_CEILING = 5;
const TILE_CHEST_INTERIOR = 8;
const TILE_CHEST_EXTERIOR = 9;

// general script types

/*
function message(ctx, x, y, status, message) {
  var avatar = ctx.avatar;
  if (avatar.x == x && avatar.y == y) {

    // if the player has already read this message, skip it
    if (avatar.campaign.indexOf(status) > -1) {
      return false;
    }

    ctx.explore.message = message;
    avatar.campaign.push(status);
    return true;
  }
  return false;
}
*/

function haybale(ctx, x, y) {
  var avatar = ctx.avatar;

  // don't rest if just starting the game
  if (!avatar.moved) return false;

  if (avatar.x == x && avatar.y == y) {
    ctx.explore.message = "You rest for awhile.";
    avatar_m.sleep(ctx);
    //sounds_play(SFX_COIN);  // FIXME port feedback (M9)
    return true;
  }
  return false;
}

function chest(ctx, x, y, status, item_type, item_count) {
  var avatar = ctx.avatar;
  var mazemap = ctx.mazemap;

  // if the player has already opened this chest, hide the chest
  if (avatar.campaign.indexOf(status) > -1) {

    // interior chest
    if (mazemap_m.get_tile(mazemap, x, y) == TILE_CHEST_INTERIOR) {
      mazemap_m.set_tile(mazemap, x, y, TILE_DUNGEON_CEILING);
    }
    // exterior chest
    else if (mazemap_m.get_tile(mazemap, x, y) == TILE_CHEST_EXTERIOR) {
      mazemap_m.set_tile(mazemap, x, y, TILE_DUNGEON_FLOOR);
    }

  }

  // if this is a new chest, open it and grant the reward.
  else {
    if (avatar.x == x && avatar.y == y) {
      avatar.campaign.push(status);
      grant_item(ctx, item_type, item_count);
      return true;
    }
  }

  return false;
}

/**
 Found items have permanent unique effects, handle those here
 */
function grant_item(ctx, item, item_count) {
  var avatar = ctx.avatar;
  var explore = ctx.explore;

  //sounds_play(SFX_COIN);  // FIXME port feedback (M9)

  if (item_count == 1) {
    explore.message = "Found " + item + "!";
  }
  else if (item_count > 1) {
    explore.message = "Found " + item_count + " " + item;
  }

  if (item == "Gold") {
    avatar.gold += item_count;

    // flag gold treasure for display while exploring
    explore.gold_value = item_count;
  }
  else if (item == "Wood Stick") {
    // only keep the stick if it's better than what you already have
    if (avatar.weapon == 0) avatar.weapon = 1;
    explore.treasure_id = 10;
  }
  else if (item == "Spellbook: Heal") {
    if (avatar.spellbook == 0) avatar.spellbook = 1;
    explore.treasure_id = 11;
  }
  else if (item == "Magic Sapphire (MP Up)") {
    avatar.mp += 2;
    avatar.max_mp += 2;
    explore.treasure_id = 12;
  }
  else if (item == "Magic Emerald (HP Up)") {
    avatar.hp += 5;
    avatar.max_hp += 5;
    explore.treasure_id = 13;
  }
  else if (item == "Magic Ruby (Atk Up)") {
    avatar.bonus_atk += 1;
    explore.treasure_id = 14;
  }
  else if (item == "Magic Diamond (Def Up)") {
    avatar.bonus_def += 1;
    explore.treasure_id = 15;
  }

}

function bone_pile_load(ctx, map_id) {
  // check all bones previously burned
  BONE_PILES.forEach(function(pile) {
    if (pile.map_id == map_id && ctx.avatar.campaign.indexOf(pile.status) > -1) {
      mazemap_m.set_tile(ctx.mazemap, pile.x, pile.y, TILE_DUNGEON_CEILING);
    }
  });
}

function locked_door_load(ctx, map_id) {
  // check all doors previously unlocked
  LOCKED_DOORS.forEach(function(door) {
    if (door.map_id == map_id && ctx.avatar.campaign.indexOf(door.status) > -1) {
      mazemap_m.set_tile(ctx.mazemap, door.x, door.y, TILE_DUNGEON_DOOR);
    }
  });
}

// the player has just burned bones or unlocked a door,
// look it up and save the status
function remember(ctx, list, x, y) {
  list.forEach(function(entry) {
    if (ctx.mazemap.current_id == entry.map_id && x == entry.x && y == entry.y) {
      ctx.avatar.campaign.push(entry.status);
    }
  });
}

// a specific enemy is on this tile
function enemy(ctx, x, y, enemy_id, status) {
  var avatar = ctx.avatar;

  // don't spawn the enemy if just loading
  if (ctx.loading) return false;

  // if heroine is at the enemy location
  if (avatar.x == x && avatar.y == y) {

    // if heroine has not already defeated this enemy
    if (status != "") {
      if (avatar.campaign.indexOf(status) > -1) {
        return false;
      }
    }

    // required here, not at the top: combat requires power,
    // which requires this module
    require("heroine_combat").start(ctx, enemy_id, status);
    return true;
  }
  return false;
}

// exports

/**
 * Returns true if something happened (the caller saves the game and
 * skips the random encounter)
 */
exports.exec = function(ctx, map_id) {

  var result = false;
  switch (map_id) {

    case 0: // Serf Quarters
      result = haybale(ctx, 1, 1);
      // result = result || message(ctx, 1, 2, "serfmsg", "This place is no longer safe");
      return result;

    case 1: // Gar'ashi Monastery
      return false;

    case 2: // Monk Quarters
      return chest(ctx, 1, 1, "stick", "Wood Stick", 1);

    case 3: // Meditation Point
      return chest(ctx, 2, 1, "heal", "Spellbook: Heal", 1);

    case 4: // Monastery Trail
      return chest(ctx, 2, 2, "hp1", "Magic Emerald (HP Up)", 1);

    case 5: // Cedar Village
      return chest(ctx, 7, 10, "g1", "Gold", 10);

    case 6: // Zuruth Plains
      return chest(ctx, 9, 4, "mp1", "Magic Sapphire (MP Up)", 1);

    case 7: // Canal Boneyard
      return chest(ctx, 13, 5, "def1", "Magic Diamond (Def Up)", 1);

    case 8: // Mausoleum
      bone_pile_load(ctx, 8);
      locked_door_load(ctx, 8);
      result = haybale(ctx, 11, 9);
      result = result || chest(ctx, 3, 2, "atk1", "Magic Ruby (Atk Up)", 1);
      result = result || chest(ctx, 3, 12, "mp2", "Magic Sapphire (MP Up)", 1);
      result = result || chest(ctx, 6, 9, "g2", "Gold", 25);
      return result;

    case 9: // Dead Walkways
      bone_pile_load(ctx, 9);
      require("heroine_boss").alter_map(ctx);
      result = enemy(ctx, 4, 9, enemy_m.ENEMY_MIMIC, "");
      result = result || enemy(ctx, 11, 5, enemy_m.ENEMY_DEATH_SPEAKER, "dspeak");
      return result;

    case 10: // Trade Tunnel
      locked_door_load(ctx, 10);
      bone_pile_load(ctx, 10);
      result = chest(ctx, 11, 2, "hp2", "Magic Emerald (HP Up)", 1);
      result = result || chest(ctx, 13, 2, "g3", "Gold", 100);
      result = result || enemy(ctx, 14, 9, enemy_m.ENEMY_MIMIC, "");
      result = result || enemy(ctx, 6, 4, enemy_m.ENEMY_MIMIC, "");
      return result;
  }
  return false;
};

exports.bone_pile_save = function(ctx, x, y) {
  remember(ctx, BONE_PILES, x, y);
};

exports.locked_door_save = function(ctx, x, y) {
  remember(ctx, LOCKED_DOORS, x, y);
};
