// this style of game doesn't update visually often
// set this flag anytime the render function should update the view

// first things first
Bangle.loadWidgets();
Bangle.drawWidgets();

// load modules

// short for avatar_module
var avatar_m = require("heroine_avatar");
var mazemap_m = require("heroine_mazemap");

var avatar = avatar_m.init();
var mazemap = mazemap_m.init();
mazemap_m.render(mazemap, avatar.x, avatar.y, avatar.facing);

// controls
// TODO move to a separate module
Bangle.on("swipe",
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
  });

// TODO pass the savefile

/*
var redraw = false;
var init_complete = false;

//---- Main Loop --------------------------------------------------

setInterval(function() {
  if (!init_complete) return;
  logic();
  render();
}, 1000/FPS);

//---- Logic Function ---------------------------------------------

function logic() {
  gamestate_logic();
}

//---- Render Function ---------------------------------------------

function render() {

  // only render if something has changed
  if (!redraw) return;
  redraw = false;

  gamestate_render();
}

//---- Init Function -----------------------------------------------

  // load some user preferences
  var json_save = getCookie("options");
  if (json_save != null) {
    OPTIONS = JSON.parse(json_save);
  }

  // initialize all game units
  bitfont_init();
  tileset_init();
  mazemap_init();
  info_init();
  minimap_init();
  avatar_init();
  action_init();
  enemy_init();
  combat_init();
  dialog_init();
  boss_init();
  title_init();
  sounds_init();
  treasure_init();

  init_complete = true;
}*/