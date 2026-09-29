/**
 * Resolve power use
 */

// module imports
const avatar_m = require("heroine_avatar");
const boss_m = require("heroine_boss");
const config_m = require("heroine_config");
const enemy_m = require("heroine_enemy");
const feedback_m = require("heroine_feedback");
const items_m = require("heroine_items");
const mapscript_m = require("heroine_mapscript");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");

const TILE_DUNGEON_DOOR = 3;
const TILE_DUNGEON_CEILING = 5;
const TILE_SKULL_PILE = 16;
const TILE_LOCKED_DOOR = 18;

//---- Heal, and spells on the map ---------------------------------------

exports.heal = function(ctx) {
  const avatar = ctx.avatar;

  if (avatar.mp == 0) return;
  if (avatar.hp == avatar.max_hp) return;

  var heal_amount = Math.floor(avatar.max_hp/2) + Math.floor(Math.random() * avatar.max_hp/2);
  avatar.hp = avatar.hp + heal_amount;
  if (avatar.hp > avatar.max_hp) avatar.hp = avatar.max_hp;

  feedback_m.play(ctx, "heal");
  avatar.mp--;

  if (ctx.state == config_m.STATE_COMBAT) {
    ctx.combat.offense_action = "Heal!";
    ctx.combat.offense_result = "+" + heal_amount + " HP";
  }
  else if (ctx.state == config_m.STATE_INFO) {
    ctx.info.power_action = "Heal!";
    ctx.info.power_result = "+" + heal_amount + " HP";
    avatar_m.save(ctx);
  }
};

// turn a tile next to the heroine from one type into another,
// returns true if there was one
function change_adjacent_tile(ctx, from_tile, to_tile, remember) {
  const avatar = ctx.avatar;
  // same order as the original
  const neighbours = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (var i = 0; i < neighbours.length; i++) {
    var x = avatar.x + neighbours[i][0];
    var y = avatar.y + neighbours[i][1];
    if (mazemap_m.get_tile(ctx.mazemap, x, y) == from_tile) {
      mazemap_m.set_tile(ctx.mazemap, x, y, to_tile);
      remember(ctx, x, y);
      // the path is walkable now
      minimap_m.invalidate(ctx);
      return true;
    }
  }
  return false;
}

exports.map_burn = function(ctx) {
  const avatar = ctx.avatar;
  if (avatar.mp == 0) return;

  // tile 16 (skull pile) burns into tile 5 (dungeon interior)
  // don't let the player waste mana if there is no nearby tile to burn
  if (change_adjacent_tile(ctx, TILE_SKULL_PILE, TILE_DUNGEON_CEILING,
                           mapscript_m.bone_pile_save)) {
    ctx.info.power_action = "Burn!";
    ctx.info.power_result = "Cleared Path!";
    avatar.mp--;
    feedback_m.play(ctx, "fire");
    avatar_m.save(ctx);
  }
  else {
    ctx.info.power_action = "(No Target)";
  }
};

exports.map_unlock = function(ctx) {
  const avatar = ctx.avatar;
  if (avatar.mp == 0) return;

  // tile 18 (locked door) unlocks into tile 3 (dungeon door)
  // don't let the player waste mana if there is no nearby tile to unlock
  if (change_adjacent_tile(ctx, TILE_LOCKED_DOOR, TILE_DUNGEON_DOOR,
                           mapscript_m.locked_door_save)) {
    ctx.info.power_action = "Unlock!";
    ctx.info.power_result = "Door Opened!";
    avatar.mp--;
    avatar_m.save(ctx);
    feedback_m.play(ctx, "unlock");
  }
  else {
    ctx.info.power_action = "(No Target)";
    feedback_m.play(ctx, "blocked");  // the original misspells SFX_BLOCKED here and plays nothing
  }
};

//---- Combat ----------------------------------------------------------

// random whole number from min to max, like the original
function roll(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function weapon_range(avatar) {
  const weapon = items_m.weapons[avatar.weapon];
  return {
    min: weapon.atk_min + avatar.bonus_atk,
    max: weapon.atk_max + avatar.bonus_atk,
  };
}

// damage done to the heroine, after her armor absorbs some
function hurt_hero(ctx, attack_damage) {
  attack_damage -= items_m.armors[ctx.avatar.armor].def;
  if (attack_damage <= 0) attack_damage = 1;
  ctx.avatar.hp -= attack_damage;
  ctx.combat.defense_result = attack_damage + " damage";
  ctx.combat.hero_hurt = true;
  return attack_damage;
}

exports.hero_attack = function(ctx) {
  const combat = ctx.combat;

  combat.offense_action = "Attack!";

  // special: override hero action if the boss has bone shield up
  if (combat.boneshield_active) {
    boss_m.boneshield_heroattack(ctx);
    return;
  }

  // check miss
  if (Math.random() < 0.20) {
    combat.offense_result = "Miss!";
    feedback_m.play(ctx, "miss");
    return;
  }

  // Hit: calculate damage
  const atk = weapon_range(ctx.avatar);
  var attack_damage = roll(atk.min, atk.max);

  // check crit
  // hero crits add max damage
  if (Math.random() < 0.10) {
    attack_damage += atk.max;
    combat.offense_action = "Critical!";
    feedback_m.play(ctx, "critical");
  }
  else {
    feedback_m.play(ctx, "attack");
  }

  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;
};

exports.burn = function(ctx) {
  const combat = ctx.combat;
  if (ctx.avatar.mp == 0) return;

  combat.offense_action = "Burn!";

  const atk = weapon_range(ctx.avatar);
  var attack_damage = roll(atk.min, atk.max);

  // against undead, burn does 2x crit
  if (combat.enemy.category == enemy_m.ENEMY_CATEGORY_UNDEAD) {
    attack_damage += atk.max + atk.max;
  }
  // against most creatures burn does 1x crit
  else if (combat.enemy.category != enemy_m.ENEMY_CATEGORY_DEMON) {
    attack_damage += atk.max;
  }
  // against demons, burn does regular weapon damage.

  ctx.avatar.mp--;
  feedback_m.play(ctx, "fire");

  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;

  // burn breaks the bone shield
  if (combat.boneshield_active) {
    combat.boneshield_active = false;
  }
};

exports.unlock = function(ctx) {
  const combat = ctx.combat;
  if (ctx.avatar.mp == 0) return;
  combat.offense_action = "Unlock!";

  const atk = weapon_range(ctx.avatar);
  var attack_damage = roll(atk.min, atk.max);

  // unlock can only be cast against Automatons
  // so apply the full damage
  attack_damage += atk.max + atk.max;

  ctx.avatar.mp--;
  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;
  feedback_m.play(ctx, "unlock");
};

exports.run = function(ctx) {
  const combat = ctx.combat;

  combat.offense_action = "Run!";
  feedback_m.play(ctx, "run");

  if (Math.random() < 0.66) {
    combat.run_success = true;
    combat.offense_result = "";
  }
  else {
    combat.offense_result = "Blocked!";
  }
};

// Enemy powers

function enemy_attack(ctx) {
  const combat = ctx.combat;
  const stats = enemy_m.enemy.stats[combat.enemy.type];

  combat.defense_action = "Attack!";

  // check miss
  if (Math.random() < 0.30) {
    combat.defense_result = "Miss!";
    feedback_m.play(ctx, "miss");
    return;
  }

  var attack_damage = roll(stats.atk_min, stats.atk_max);

  // check crit
  // enemy crits add min damage
  if (Math.random() < 0.05) {
    attack_damage += stats.atk_min;
    combat.defense_action = "Critical!";
    feedback_m.play(ctx, "critical");
  }
  else {
    feedback_m.play(ctx, "attack");
  }

  hurt_hero(ctx, attack_damage);
}

// evil enemy version of burn
function scorch(ctx) {
  const combat = ctx.combat;
  const stats = enemy_m.enemy.stats[combat.enemy.type];

  combat.defense_action = "Scorch!";

  // check miss
  if (Math.random() < 0.30) {
    combat.defense_result = "Miss!";
    feedback_m.play(ctx, "miss");
    return;
  }

  feedback_m.play(ctx, "fire");

  // scorch works like an enemy crit
  hurt_hero(ctx, roll(stats.atk_min, stats.atk_max) + stats.atk_min);
}

function hpdrain(ctx) {
  const combat = ctx.combat;
  const stats = enemy_m.enemy.stats[combat.enemy.type];

  combat.defense_action = "HP Drain!";

  // check miss
  if (Math.random() < 0.30) {
    combat.defense_result = "Miss!";
    feedback_m.play(ctx, "miss");
    return;
  }

  feedback_m.play(ctx, "hpdrain");

  // the enemy heals by the damage done
  combat.enemy.hp += hurt_hero(ctx, roll(stats.atk_min, stats.atk_max));
}

function mpdrain(ctx) {
  const combat = ctx.combat;
  combat.defense_action = "MP Drain!";

  // check miss
  if (Math.random() < 0.30) {
    combat.defense_result = "Miss!";
    feedback_m.play(ctx, "miss");
    return;
  }

  feedback_m.play(ctx, "mpdrain");

  if (ctx.avatar.mp > 0) {
    ctx.avatar.mp--;
    combat.defense_result = "-1 MP";
  }
  else {
    combat.defense_result = "No effect";
  }

  combat.hero_hurt = true;
}

/**
 * Choose a random power from the enemy's available powers
 */
exports.enemy = function(ctx) {

  // override for boss action
  if (ctx.combat.enemy.type == enemy_m.ENEMY_DEATH_SPEAKER) {
    switch (boss_m.choose_power(ctx)) {
      case "attack":
        enemy_attack(ctx);
        return;
      case "scorch":
        scorch(ctx);
        return;
      case "boneshield":
        boss_m.boneshield_activate(ctx);
        return;
    }
  }

  const powers = enemy_m.enemy.stats[ctx.combat.enemy.type].powers;
  switch (powers[Math.floor(Math.random() * powers.length)]) {
    case enemy_m.ENEMY_POWER_ATTACK:
      enemy_attack(ctx);
      return;
    case enemy_m.ENEMY_POWER_SCORCH:
      scorch(ctx);
      return;
    case enemy_m.ENEMY_POWER_HPDRAIN:
      hpdrain(ctx);
      return;
    case enemy_m.ENEMY_POWER_MPDRAIN:
      mpdrain(ctx);
      return;
  }
};
