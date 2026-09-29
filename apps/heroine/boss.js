/**
 * Boss encounter logic and special art

 The Death Speaker's bone shield state lives in ctx.combat, which is new
 for every fight. choose_power() only decides; power.enemy() acts, so
 this module doesn't need power.js (which requires this one).
 */

// module imports
const config_m = require("heroine_config");
const enemy_m = require("heroine_enemy");
const mazemap_m = require("heroine_mazemap");

const DEAD_WALKWAYS = 9;
const TILE_GRASS = 6;

// exports

exports.reset = function(ctx) {
  ctx.combat.boneshield_active = false;
  ctx.combat.boneshield_count = 0;
  exports.alter_map(ctx);
};

// once defeated, the Death Speaker's tile becomes grass
exports.alter_map = function(ctx) {
  if (ctx.avatar.campaign.indexOf("dspeak") > -1) {
    if (ctx.mazemap.current_id == DEAD_WALKWAYS) {
      mazemap_m.set_tile(ctx.mazemap, 11, 5, TILE_GRASS);
    }
  }
};

exports.boneshield_activate = function(ctx) {
  const combat = ctx.combat;
  combat.boneshield_active = true;
  combat.defense_action = "Bone Shield!";
  combat.defense_result = "+Def Up!";
  combat.hero_hurt = false;
  //sounds_play(SFX_BONESHIELD);  // FIXME port feedback (M9)
};

// if the boss' bone shield is up, override the regular hero attack
exports.boneshield_heroattack = function(ctx) {
  ctx.combat.offense_result = "Absorbed!";
  //sounds_play(SFX_BLOCKED);  // FIXME port feedback (M9)
  ctx.combat.enemy_hurt = false;
};

exports.boneshield_render = function(ctx) {
  if (!ctx.combat.boneshield_active) return;
  g.drawImage(enemy_m.bone_shield_image(),
              config_m.SCREEN_OFFSET_X, config_m.SCREEN_OFFSET_Y);
};

/**
 * The boss chooses which action to perform:
 * returns "attack", "scorch" or "boneshield"
 */
exports.choose_power = function(ctx) {
  const combat = ctx.combat;

  // 2/3rds chance to simply attack
  if (Math.random() < 0.66) {
    return "attack";
  }

  // otherwise use scorch or boneshield (up to 3x)
  const power_roll = Math.random();  // drawn first, like the original
  if (combat.boneshield_active || combat.boneshield_count >= 3 || power_roll < 0.33) {
    return "scorch";
  }
  combat.boneshield_count++;
  return "boneshield";
};
