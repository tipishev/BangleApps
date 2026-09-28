/**
 * Resolve power use
 */

// module imports
const avatar_m = require("heroine_avatar");
const config_m = require("heroine_config");
const enemy_m = require("heroine_enemy");
const mapscript_m = require("heroine_mapscript");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");

// used by the combat powers below, not ported yet
const ENEMY_POWER_ATTACK = enemy_m.ENEMY_POWER_ATTACK;
const ENEMY_POWER_SCORCH = enemy_m.ENEMY_POWER_SCORCH;
const ENEMY_POWER_HPDRAIN = enemy_m.ENEMY_POWER_HPDRAIN;
const ENEMY_POWER_MPDRAIN = enemy_m.ENEMY_POWER_MPDRAIN;

const TILE_DUNGEON_DOOR = 3;
const TILE_DUNGEON_CEILING = 5;
const TILE_SKULL_PILE = 16;
const TILE_LOCKED_DOOR = 18;

//---- Ported ----------------------------------------------------------

exports.heal = function(ctx) {
  const avatar = ctx.avatar;

  if (avatar.mp == 0) return;
  if (avatar.hp == avatar.max_hp) return;

  var heal_amount = Math.floor(avatar.max_hp/2) + Math.floor(Math.random() * avatar.max_hp/2);
  avatar.hp = avatar.hp + heal_amount;
  if (avatar.hp > avatar.max_hp) avatar.hp = avatar.max_hp;

  //sounds_play(SFX_HEAL);  // FIXME port feedback (M9)
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
    //sounds_play(SFX_FIRE);  // FIXME port feedback (M9)
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
    //sounds_play(SFX_UNLOCK);  // FIXME port feedback (M9)
  }
  else {
    ctx.info.power_action = "(No Target)";
    //sounds_play(SFX_BLOCK);  // FIXME port feedback (M9)
  }
};

//---- Not ported yet (combat, M5): verbatim from the original ---------

/* eslint-disable */
function power_hero_attack() {

  combat.offense_action = "Attack!";

  // special: override hero action if the boss has bone shield up
  if (boss.boneshield_active) {
    boss_boneshield_heroattack();
    return;
  }

  // check miss
  var hit_chance = Math.random();
  if (hit_chance < 0.20) {
    combat.offense_result = "Miss!";
    //sounds_play(SFX_MISS);
    return;
  }

  // Hit: calculate damage
  var atk_min = info.weapons[avatar.weapon].atk_min + avatar.bonus_atk;
  var atk_max = info.weapons[avatar.weapon].atk_max + avatar.bonus_atk;
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // check crit
  // hero crits add max damage
  var crit_chance = Math.random();
  if (crit_chance < 0.10) {
    attack_damage += atk_max;
    combat.offense_action = "Critical!";
    //sounds_play(SFX_CRITICAL);
  }
  else {
    //sounds_play(SFX_ATTACK);
  }

  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;

}


/**
 * Choose a random power from the enemy's available powers
 */
function power_enemy(enemy_id) {

  // override for boss action
  if (enemy_id == ENEMY_DEATH_SPEAKER) {
    boss_power();
    return;
  }

  var power_options = enemy.stats[enemy_id].powers.length;
  var power_roll = Math.floor(Math.random() * power_options);
  var power_choice = enemy.stats[enemy_id].powers[power_roll];

  switch (power_choice) {
    case ENEMY_POWER_ATTACK:
      power_enemy_attack();
      return;
    case ENEMY_POWER_SCORCH:
      power_scorch();
      return;
    case ENEMY_POWER_HPDRAIN:
      power_hpdrain();
      return;
    case ENEMY_POWER_MPDRAIN:
      power_mpdrain();
      return;
  }
}

function power_enemy_attack() {
  combat.defense_action = "Attack!";

  // check miss
  var hit_chance = Math.random();
  if (hit_chance < 0.30) {
    combat.defense_result = "Miss!";
    //sounds_play(SFX_MISS);
    return;
  }

  var atk_min = enemy.stats[combat.enemy.type].atk_min;
  var atk_max = enemy.stats[combat.enemy.type].atk_max;
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // check crit
  // enemy crits add min damage
  var crit_chance = Math.random();
  if (crit_chance < 0.05) {
    attack_damage += atk_min;
    combat.defense_action = "Critical!";
    //sounds_play(SFX_CRITICAL);
  }
  else {
    //sounds_play(SFX_ATTACK);
  }

  // armor absorb
  attack_damage -= info.armors[avatar.armor].def;
  if (attack_damage <= 0) attack_damage = 1;

  avatar.hp -= attack_damage;
  combat.defense_result = attack_damage + " damage";

  combat.hero_hurt = true;
}

function power_burn() {
  if (avatar.mp == 0) return;

  combat.offense_action = "Burn!";

  var atk_min = (info.weapons[avatar.weapon].atk_min + avatar.bonus_atk);
  var atk_max = (info.weapons[avatar.weapon].atk_max + avatar.bonus_atk);
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // against undead, burn does 2x crit
  if (combat.enemy.category == ENEMY_CATEGORY_UNDEAD) {
    attack_damage += atk_max + atk_max;
  }
  // against most creatures burn does 1x crit
  else if (combat.enemy.category != ENEMY_CATEGORY_DEMON) {
    attack_damage += atk_max;
  }
  // against demons, burn does regular weapon damage.

  avatar.mp--;
  //sounds_play(SFX_FIRE);

  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;

  if (boss.boneshield_active) {
    boss.boneshield_active = false;  
  }
}

function power_run() {

  combat.offense_action = "Run!";
  //sounds_play(SFX_RUN);

  var chance_run = Math.random();
  if (chance_run < 0.66) {
    combat.run_success = true;
    combat.offense_result = "";
    return;
  }
  else {
    combat.offense_result = "Blocked!";
    return;
  }
}

function power_unlock() {
  if (avatar.mp == 0) return;
  combat.offense_action = "Unlock!";

  var atk_min = (info.weapons[avatar.weapon].atk_min + avatar.bonus_atk);
  var atk_max = (info.weapons[avatar.weapon].atk_max + avatar.bonus_atk);
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // unlock can only be cast against Automatons
  // so apply the full damage
  attack_damage += atk_max + atk_max;

  avatar.mp--;
  combat.enemy.hp -= attack_damage;
  combat.offense_result = attack_damage + " damage";

  combat.enemy_hurt = true;
  //sounds_play(SFX_UNLOCK);

}


// Enemy special powers

// evil enemy version of burn
function power_scorch() {

  combat.defense_action = "Scorch!";

  // check miss
  var hit_chance = Math.random();
  if (hit_chance < 0.30) {
    combat.defense_result = "Miss!";
    //sounds_play(SFX_MISS);
    return;
  }

  sounds_play(SFX_FIRE);

  var atk_min = enemy.stats[combat.enemy.type].atk_min;
  var atk_max = enemy.stats[combat.enemy.type].atk_max;
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // scorch works like an enemy crit
  attack_damage += atk_min;

  // armor absorb
  attack_damage -= info.armors[avatar.armor].def;
  if (attack_damage <= 0) attack_damage = 1;

  avatar.hp -= attack_damage;
  combat.defense_result = attack_damage + " damage";

  combat.hero_hurt = true;

}

function power_hpdrain() {

  combat.defense_action = "HP Drain!";

  // check miss
  var hit_chance = Math.random();
  if (hit_chance < 0.30) {
    combat.defense_result = "Miss!";
    //sounds_play(SFX_MISS);
    return;
  }

  //sounds_play(SFX_HPDRAIN);

  var atk_min = enemy.stats[combat.enemy.type].atk_min;
  var atk_max = enemy.stats[combat.enemy.type].atk_max;
  var attack_damage = Math.round(Math.random() * (atk_max - atk_min)) + atk_min;

  // armor absorb
  attack_damage -= info.armors[avatar.armor].def;
  if (attack_damage <= 0) attack_damage = 1;

  avatar.hp -= attack_damage;
  combat.enemy.hp += attack_damage;

  combat.defense_result = attack_damage + " damage";
  combat.hero_hurt = true;
}

function power_mpdrain() {
  combat.defense_action = "MP Drain!";

  // check miss
  var hit_chance = Math.random();
  if (hit_chance < 0.30) {
    combat.defense_result = "Miss!";
    //sounds_play(SFX_MISS);
    return;
  }

  //sounds_play(SFX_MPDRAIN);

  if (avatar.mp > 0) {
    avatar.mp--;
    combat.defense_result = "-1 MP";
  }
  else {
    combat.defense_result = "No effect";
  }

  combat.hero_hurt = true;
}

/* eslint-enable */
