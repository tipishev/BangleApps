/**
 Constants shared by several modules
 */

// the original game resolution is 160x120
// Bangle.js2 resolution is 176x176
exports.SCREEN_OFFSET_X = 8; // place in the middle of the screen
exports.SCREEN_OFFSET_Y = 32; // allow 24px space for bottom and top widgets

// game states, see gamestate.js
exports.STATE_EXPLORE = 0;
exports.STATE_COMBAT = 1;
exports.STATE_INFO = 2;
exports.STATE_DIALOG = 3;
exports.STATE_TITLE = 4;
