/* Main Heroine Dusk module */


// load and draw widgets

g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

// load modules

const atlas_m = require("heroine_atlas");
const avatar_m = require("heroine_avatar");
const explore_m = require("heroine_explore");
const gamestate_m = require("heroine_gamestate");
const mazemap_m = require("heroine_mazemap");
const minimap_m = require("heroine_minimap");

// the whole game state, shared by all modules and mutated in place

const ctx = {
  state: gamestate_m.init(),
  input: {},
  redraw: false,
};

ctx.atlas = atlas_m.atlas();
ctx.avatar = avatar_m.init();
ctx.explore = explore_m.init();
mazemap_m.init(ctx);
avatar_m.after_load(ctx);
ctx.minimap = minimap_m.init();

function render() {
  gamestate_m.render(ctx);
}

function handle_input(input) {
  ctx.input = input;
  ctx.redraw = false;
  gamestate_m.logic(ctx);
  if (ctx.redraw) {
    render();
  }
}

render();

// the position isn't saved on every step, so save when the app closes
E.on("kill", function() {
  avatar_m.save(ctx);
});

// controls

Bangle.setUI({
  mode: "custom",
  swipe: function(directionLR, directionUD) {
    // ignore diagonal swipes
    if (directionLR !== 0 && directionUD !== 0) return;
    Bangle.buzz(50);
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
