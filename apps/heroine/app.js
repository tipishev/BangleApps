/* Main Heroine Dusk module */


// load and draw widgets

g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

// load modules

const action_m = require("heroine_action");
const atlas_m = require("heroine_atlas");
const avatar_m = require("heroine_avatar");
const config_m = require("heroine_config");
const explore_m = require("heroine_explore");
const gamestate_m = require("heroine_gamestate");
const info_m = require("heroine_info");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");
const options_m = require("heroine_options");
const title_m = require("heroine_title");

// the whole game state, shared by all modules and mutated in place

const ctx = {
  state: gamestate_m.init(),
  input: {},
  redraw: false,
  animating: false,  // see animate()
  loading: true,  // no scripted fights while loading the game
  options: options_m.load(),
};

ctx.atlas = atlas_m.atlas();
// the title offers Continue if there was a saved game at start
title_m.init(ctx, avatar_m.has_save());
ctx.avatar = avatar_m.init();
ctx.explore = explore_m.init();
ctx.info = info_m.init();
ctx.action = action_m.init();
ctx.mazemap = mazemap_m.init();
avatar_m.start(ctx);
ctx.loading = false;
ctx.minimap = minimap_m.init();

function render() {
  gamestate_m.render(ctx);
}

// frames per second of the animations, their timers count
// the original's 60 fps frames whatever the real rate
const ANIMATION_FPS = 10;
let animation_interval;

/**
 * While ctx.animating (combat intro, attacks) tick the game state with
 * the number of 60 fps frames since the last tick
 */
function animate() {
  if (animation_interval) return;
  let last = Date.now();
  animation_interval = setInterval(function() {
    const now = Date.now();
    const frames = Math.max(1, Math.round((now - last) * 60 / 1000));
    last = now;
    handle_input({tick: frames});
  }, 1000 / ANIMATION_FPS);
}

function stop_animation() {
  if (animation_interval) clearInterval(animation_interval);
  animation_interval = undefined;
}

function handle_input(input) {
  ctx.input = input;
  ctx.redraw = false;
  gamestate_m.logic(ctx);
  if (ctx.redraw) {
    render();
  }
  if (ctx.animating) animate();
  else stop_animation();
}

render();

// the position isn't saved on every step, so save when the app closes
E.on("kill", function() {
  // a game that was never started isn't saved (no Continue next time)
  if (ctx.state != config_m.STATE_TITLE) avatar_m.save(ctx);
});

// controls

Bangle.setUI({
  mode: "custom",
  swipe: function(directionLR, directionUD) {
    // ignore diagonal swipes
    if (directionLR !== 0 && directionUD !== 0) return;
    if (ctx.options.vibration) Bangle.buzz(50);
    handle_input({
      up: directionUD === -1,
      down: directionUD === 1,
      left: directionLR === -1,
      right: directionLR === 1,
    });
  },
  touch: function(button, xy) {
    handle_input({tap: {x: xy.x, y: xy.y}});
  },
  btn: function() {
    handle_input({btn: true});
  },
});
