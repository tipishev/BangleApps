/**
 Combat routines

 Timers count frames of the original's 60 fps loop. They only advance on
 {tick: frames} input from the animation driver in app.js, which runs
 while ctx.animating is true; other input is ignored while it runs.

 Controls: swipe up attacks, swipe down runs, swipes left/right select
 an action, a tap uses it.
 */

// module imports
const action_m = require("heroine_action");
const avatar_m = require("heroine_avatar");
const bitfont_m = require("heroine_bitfont");
const config_m = require("heroine_config");
const enemy_m = require("heroine_enemy");
const info_m = require("heroine_info");
const mazemap_m = require("heroine_mazemap");
const power_m = require("heroine_power");
const tileset_m = require("heroine_tileset");
const treasure_m = require("heroine_treasure");

const COMBAT_PHASE_INTRO = 0;
const COMBAT_PHASE_INPUT = 1;
const COMBAT_PHASE_OFFENSE = 2;
const COMBAT_PHASE_DEFENSE = 3;
const COMBAT_PHASE_VICTORY = 4;
const COMBAT_PHASE_DEFEAT = 5;

const COMBAT_INTRO_DELAY = 15;
const ACTION_FRAMES = 30;
const TEXT_DELAY_FRAMES = 25;  // offense text shows from here on
const SHAKE_FRAMES = 15;  // shaking stops here

function stats(combat) {
  return enemy_m.enemy.stats[combat.enemy.type];
}

// a timer for the next phase, a single tick without animations
function phase_frames(ctx) {
  return ctx.options.animation ? ACTION_FRAMES : 1;
}

// count the timer down by the frames of this tick
function count_down(ctx) {
  const combat = ctx.combat;
  combat.timer = Math.max(0, combat.timer - ctx.input.tick);
  ctx.redraw = true;
}

function shake() {
  return {x: Math.round(Math.random() * 4) - 2, y: Math.round(Math.random() * 4) - 2};
}

function clear_messages(combat) {
  combat.offense_action = "";
  combat.offense_result = "";
  combat.defense_action = "";
  combat.defense_result = "";
}

// leave combat for exploring
function end_combat(ctx) {
  clear_messages(ctx.combat);
  ctx.state = config_m.STATE_EXPLORE;
  ctx.animating = false;
  ctx.redraw = true;
}

/**
 * Set the variable info for this enemy
 * Anything that changes during combat goes here (e.g. hp)
 * Otherwise we read values from the enemy list
 */
function set_enemy(ctx, enemy_id) {
  const combat = ctx.combat;
  combat.enemy.type = enemy_id;
  combat.enemy.hp = enemy_m.enemy.stats[enemy_id].hp;
  combat.enemy.category = enemy_m.enemy.stats[enemy_id].category;
  //boss_reset();  // FIXME port boss (M6)
  combat.victory_status = "";
  //sounds_play(SFX_MISS);  // FIXME port feedback (M9)
}

/**** Logic **************************/

function logic_intro(ctx) {
  const combat = ctx.combat;
  if (!ctx.input.tick) return;
  if (ctx.options.animation) {
    count_down(ctx);
    // animated sliding in from the left
    combat.enemy_offset = {x: 0 - combat.timer * 10, y: 0};
  }
  else {
    combat.timer = 0;
  }
  if (combat.timer == 0) {
    combat.phase = COMBAT_PHASE_INPUT;
    ctx.animating = false;
    ctx.redraw = true;
  }
}

function logic_input(ctx) {
  const avatar = ctx.avatar;
  const combat = ctx.combat;
  const input = ctx.input;

  combat.enemy_hurt = false;
  combat.hero_hurt = false;
  combat.run_success = false;

  // swipe up and down are shortcuts for attack and run
  var use = null;
  if (input.up) use = "attack";
  else if (input.down) use = "run";
  else if (input.tap) use = action_m.selected(ctx);

  var used_action = false;
  if (use == "attack") {
    power_m.hero_attack(ctx);
    used_action = true;
  }
  else if (use == "heal" && avatar.mp > 0 && avatar.spellbook >= 1 && avatar.hp < avatar.max_hp) {
    power_m.heal(ctx);
    used_action = true;
  }
  else if (use == "burn" && avatar.mp > 0 && avatar.spellbook >= 2) {
    power_m.burn(ctx);
    used_action = true;
  }
  else if (use == "unlock" && avatar.mp > 0 && avatar.spellbook >= 3 && combat.enemy.category == enemy_m.ENEMY_CATEGORY_AUTOMATON) {
    power_m.unlock(ctx);
    used_action = true;
  }
  else if (use == "run") {
    power_m.run(ctx);
    used_action = true;
  }

  if (used_action) {
    combat.phase = COMBAT_PHASE_OFFENSE;
    combat.timer = phase_frames(ctx);
    ctx.animating = true;
    ctx.redraw = true;
    return;
  }

  if (input.left) action_m.move_select(ctx, -1);
  if (input.right) action_m.move_select(ctx, 1);
}

function logic_offense(ctx) {
  const combat = ctx.combat;
  if (!ctx.input.tick) return;
  count_down(ctx);

  if (combat.timer > SHAKE_FRAMES && combat.enemy_hurt) {
    combat.enemy_offset = shake();
  }
  else {
    combat.enemy_offset = {x: 0, y: 0};
  }

  if (combat.timer == 0) {

    // check for defeated enemy
    if (combat.enemy.hp <= 0) {
      combat.phase = COMBAT_PHASE_VICTORY;
      ctx.animating = false;
      //sounds_play(SFX_COIN);  // FIXME port feedback (M9)
      determine_reward(ctx);
    }
    // check for successfully running away
    else if (combat.run_success) {
      end_combat(ctx);
      avatar_m.save(ctx);
    }
    else {
      power_m.enemy(ctx);
      combat.phase = COMBAT_PHASE_DEFENSE;
      combat.timer = phase_frames(ctx);
    }
  }
}

function logic_defense(ctx) {
  const combat = ctx.combat;
  if (!ctx.input.tick) return;
  count_down(ctx);

  if (combat.timer > SHAKE_FRAMES && combat.hero_hurt) {
    const offset = shake();
    tileset_m.set_render_offset(offset.x, offset.y);
  }
  else {
    tileset_m.set_render_offset(0, 0);
  }

  if (combat.timer == 0) {
    ctx.animating = false;

    // check for defeated hero
    if (ctx.avatar.hp <= 0) {
      combat.phase = COMBAT_PHASE_DEFEAT;
      // saved dead: closing the app now still respawns next time
      avatar_m.save(ctx);
      //sounds_play(SFX_DEFEAT);  // FIXME port feedback (M9)
    }
    else {
      combat.phase = COMBAT_PHASE_INPUT;
    }
  }
}

// end combat by tapping, swiping or pressing the button
function continued(input) {
  return input.tap || input.btn || input.up || input.down || input.left || input.right;
}

function logic_victory(ctx) {
  if (continued(ctx.input)) {
    end_combat(ctx);
  }
}

/**
 * The original waits on its defeat screen until the page is reloaded,
 * which respawns the heroine. Here any input does that.
 */
function logic_defeat(ctx) {
  if (continued(ctx.input)) {
    end_combat(ctx);
    avatar_m.respawn(ctx);
    avatar_m.save(ctx);
  }
}

function determine_reward(ctx) {
  const avatar = ctx.avatar;
  const combat = ctx.combat;

  // for now, just gold rewards
  const gold_min = stats(combat).gold_min;
  const gold_max = stats(combat).gold_max;

  const gold_reward = Math.round(Math.random() * (gold_max - gold_min)) + gold_min;
  combat.reward_result = "+" + gold_reward + " Gold!";

  avatar.gold += gold_reward;
  combat.gold_treasure = gold_reward;

  // if killed a named creature, remember
  if (combat.victory_status != "") {
    avatar.campaign.push(combat.victory_status);
  }

  avatar_m.save(ctx);
}

/**** Render **************************/

function render_enemy(ctx) {
  const combat = ctx.combat;
  enemy_m.enemy_render(combat.enemy.type, combat.enemy_offset.x, combat.enemy_offset.y);
  //boss_boneshield_render();  // FIXME port boss (M6)
}

function render_name(combat) {
  bitfont_m.render(stats(combat).name, 80, 2, bitfont_m.JUSTIFY_CENTER);
}

function render_offense_log(combat) {
  if (combat.offense_action != "") {
    bitfont_m.render("You:", 2, 20, bitfont_m.JUSTIFY_LEFT);
    bitfont_m.render(combat.offense_action, 2, 30, bitfont_m.JUSTIFY_LEFT);
    bitfont_m.render(combat.offense_result, 2, 40, bitfont_m.JUSTIFY_LEFT);
  }
}

function render_defense_log(combat) {
  if (combat.defense_action != "") {
    bitfont_m.render("Enemy:", 2, 60, bitfont_m.JUSTIFY_LEFT);
    bitfont_m.render(combat.defense_action, 2, 70, bitfont_m.JUSTIFY_LEFT);
    bitfont_m.render(combat.defense_result, 2, 80, bitfont_m.JUSTIFY_LEFT);
  }
}

function render_phase(ctx) {
  const combat = ctx.combat;
  switch (combat.phase) {
    case COMBAT_PHASE_INTRO:
      // skip the first frame, it would show the enemy at its final place
      if (combat.timer < COMBAT_INTRO_DELAY) render_enemy(ctx);
      render_name(combat);
      break;
    case COMBAT_PHASE_INPUT:
      render_enemy(ctx);
      render_name(combat);
      info_m.render_hpmp(ctx);
      action_m.render(ctx);
      render_offense_log(combat);
      render_defense_log(combat);
      break;
    case COMBAT_PHASE_OFFENSE:
      render_enemy(ctx);
      render_name(combat);
      // make text disappear for a short moment
      if (combat.timer <= TEXT_DELAY_FRAMES) render_offense_log(combat);
      break;
    case COMBAT_PHASE_DEFENSE:
      render_enemy(ctx);
      render_name(combat);
      render_offense_log(combat);
      render_defense_log(combat);
      break;
    case COMBAT_PHASE_VICTORY:
      render_offense_log(combat);
      render_name(combat);
      info_m.render_hpmp(ctx);
      bitfont_m.render("Victory!", 80, 60, bitfont_m.JUSTIFY_CENTER);
      bitfont_m.render(combat.reward_result, 80, 70, bitfont_m.JUSTIFY_CENTER);
      treasure_m.render_gold(combat.gold_treasure);
      info_m.render_gold(ctx);
      break;
    case COMBAT_PHASE_DEFEAT:
      render_enemy(ctx);
      render_name(combat);
      render_offense_log(combat);
      render_defense_log(combat);
      info_m.render_hpmp(ctx);
      bitfont_m.render("You are defeated...", 158, 100, bitfont_m.JUSTIFY_RIGHT);
      info_m.render_gold(ctx);
      break;
  }
}

// exports

exports.init = function() {
  return {
    timer: 0,
    phase: COMBAT_PHASE_INTRO,
    enemy: {type: 0, hp: 0, category: 0},
    enemy_offset: {x: 0, y: 0},
    offense_action: "",
    offense_result: "",
    defense_action: "",
    defense_result: "",
    reward_result: "",
    gold_treasure: 0,
    victory_status: "",
    enemy_hurt: false,
    hero_hurt: false,
    run_success: false,
  };
};

// start a fight, status is the campaign flag to set on victory ("" for none)
exports.start = function(ctx, enemy_id, status) {
  const combat = ctx.combat = exports.init();
  ctx.explore.encounter_chance = 0.0;
  ctx.state = config_m.STATE_COMBAT;
  action_m.reset(ctx);  // selects Attack, the state must be set first
  combat.timer = COMBAT_INTRO_DELAY;
  combat.phase = COMBAT_PHASE_INTRO;
  set_enemy(ctx, enemy_id);
  combat.victory_status = status || "";
  ctx.animating = true;
  ctx.redraw = true;
};

exports.logic = function(ctx) {
  switch (ctx.combat.phase) {
    case COMBAT_PHASE_INTRO:
      logic_intro(ctx);
      break;
    case COMBAT_PHASE_INPUT:
      logic_input(ctx);
      break;
    case COMBAT_PHASE_OFFENSE:
      logic_offense(ctx);
      break;
    case COMBAT_PHASE_DEFENSE:
      logic_defense(ctx);
      break;
    case COMBAT_PHASE_VICTORY:
      logic_victory(ctx);
      break;
    case COMBAT_PHASE_DEFEAT:
      logic_defeat(ctx);
      break;
  }
};

exports.render = function(ctx) {
  const avatar = ctx.avatar;
  const left = config_m.SCREEN_OFFSET_X;
  const top = config_m.SCREEN_OFFSET_Y;

  // the enemy slides in from outside and the view shakes:
  // clip to the game area like the original's canvas
  g.setClipRect(left, top, left + 159, top + 119);

  // visuals common to all combat phases
  tileset_m.background_render(ctx.atlas.maps[ctx.mazemap.current_id].background);
  mazemap_m.render(ctx.mazemap, avatar.x, avatar.y, avatar.facing);

  render_phase(ctx);

  g.setClipRect(0, 0, g.getWidth() - 1, g.getHeight() - 1);
};

exports.PHASE_INTRO = COMBAT_PHASE_INTRO;
exports.PHASE_INPUT = COMBAT_PHASE_INPUT;
exports.PHASE_OFFENSE = COMBAT_PHASE_OFFENSE;
exports.PHASE_DEFENSE = COMBAT_PHASE_DEFENSE;
exports.PHASE_VICTORY = COMBAT_PHASE_VICTORY;
exports.PHASE_DEFEAT = COMBAT_PHASE_DEFEAT;
