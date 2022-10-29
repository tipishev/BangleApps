// this style of game doesn't update visually often
// set this flag anytime the render function should update the view

// first things first
Bangle.loadWidgets();
Bangle.drawWidgets();

// load modules

var avatar_m = require("heroine_avatar");
var gamestate_m = require("heroine_gamestate");
var explore_m = require("heroine_explore");
var mazemap_m = require("heroine_mazemap");

var gamestate = gamestate_m.init();
var avatar = avatar_m.init();
var mazemap = mazemap_m.init();
var explore = explore_m.init();

//mazemap_m.render(mazemap, avatar.x, avatar.y, avatar.facing);

// controls
// TODO move to a separate module
Bangle.on("swipe",
    // produce intput object
    function(directionLR, directionUD){
    Bangle.buzz(100);
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

    // pack all context for logic
    var ctx = {}; // context
    // TODO restrict context based on gamestate requirements?
    ctx.explore = explore;
    ctx.avatar = avatar;
    ctx.mazemap = mazemap;
    var logic_result = gamestate_m.logic(gamestate, input, ctx);
    // TODO update only entities in the result.
    explore = logic_result.explore;
    avatar = logic_result.avatar;
    mazemap = logic_result.mazemap;

    ctx = {};
    ctx.avatar = avatar;
    ctx.mazemap = mazemap;
    if (logic_result.redraw) {
      gamestate_m.render(gamestate, ctx);
    }
  });