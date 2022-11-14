/* Main Heroine Dusk module */


// load and draw widgets

g.clear();
Bangle.loadWidgets();
Bangle.drawWidgets();

// load modules

var avatar_m = require("heroine_avatar");
var gamestate_m = require("heroine_gamestate");
var explore_m = require("heroine_explore");
var mazemap_m = require("heroine_mazemap");

// declare objects

var avatar, explore, gamestate, mazemap;

function export_context() {
  var ctx = {};
  ctx.avatar = avatar;
  ctx.gamestate = gamestate;
  ctx.explore = explore;
  ctx.mazemap = mazemap;
  return ctx;
}

function import_context(ctx) {
  avatar = ctx.avatar;
  gamestate = ctx.gamestate;
  explore = ctx.explore;
  mazemap = ctx.mazemap;
}

function render() {
  gamestate_m.render(export_context());
  Bangle.buzz(100);  // half-an-hour later...
}

// initialize objects

avatar = avatar_m.init();
explore = explore_m.init();
gamestate = gamestate_m.init();
mazemap = mazemap_m.init();

render();

// controls
// TODO move to a separate module
Bangle.on("swipe",
    function(directionLR, directionUD){
    Bangle.buzz(50);
    var input = {};
    if (directionLR === 0 && directionUD === -1) {
      input.up = true;
    } else if (directionLR === -1 && directionUD === 0) {
      input.left = true;
    } else if (directionLR === +1 && directionUD === 0) {
      input.right = true;
    } else if (directionLR === 0 && directionUD === 1) {
      input.down = true;
    }

    var logic_ctx = export_context();
    logic_ctx.input = input;

    var logic_result = gamestate_m.logic(logic_ctx);
    import_context(logic_result);

    if (logic_result.redraw) {
      render();
    }
  });
