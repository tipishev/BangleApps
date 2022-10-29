/**
 Primary game state switcher
 */

var STATE_EXPLORE = 0;
var STATE_COMBAT = 1;
var STATE_INFO = 2;
var STATE_DIALOG = 3;
var STATE_TITLE = 4;

// exports

exports.STATE_EXPLORE = STATE_EXPLORE;
exports.STATE_COMBAT = STATE_COMBAT;
exports.STATE_INFO = STATE_INFO;
exports.STATE_DIALOG = STATE_DIALOG;
exports.STATE_TITLE = STATE_TITLE;

// TODO expose logic/render inputs/outputs for each state to callers
exports.init = function() {
  return STATE_EXPLORE;
};

exports.logic = function(ctx) {
  switch(ctx.gamestate) {
    case STATE_EXPLORE:
	  return explore_m.logic(ctx);
	case STATE_INFO:
	  info_logic();
	  break;
	case STATE_COMBAT:
	  combat_logic();
	  break;
    case STATE_DIALOG:
      dialog_logic();
      break;
	case STATE_TITLE:
	  title_logic();
	  break;
  }
};

exports.render = function(ctx) {

  //bitfont_determinecolor();

  switch(ctx.gamestate) {
    case STATE_EXPLORE:
	  explore_m.render(ctx);
	  break;
	case STATE_INFO:
	  //info_render();
	  break;
	case STATE_COMBAT:
	  //combat_render();
	  break;
    case STATE_DIALOG:
      //dialog_render();
      break;
	case STATE_TITLE:
	  //title_render();
	  break;
  }
};
