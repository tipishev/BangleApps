/*
 Action menu for combat or casting spells out of combat

 The buttons are drawn where the original has them. On the watch there
 is no cursor to move around the grid: swipes left and right step
 through the buttons that are shown, and a tap uses the selected one.
 */

// module imports
const config_m = require("heroine_config");

const BUTTON_OFFSET = 2;
const SELECT_FRAME = 8; // in interface_images.js

// image in interface_images.js and position, like the original
const BUTTONS = {
  attack:  {image: 0, x: 120, y: 20},
  run:     {image: 1, x: 140, y: 20},
  heal:    {image: 2, x: 120, y: 40},
  burn:    {image: 3, x: 140, y: 40},
  unlock:  {image: 4, x: 120, y: 60},
  light:   {image: 5, x: 140, y: 60},
  freeze:  {image: 6, x: 120, y: 80},
  reflect: {image: 7, x: 140, y: 80},
};

// spells are learned in this order, avatar.spellbook is how many
const SPELLS = ["heal", "burn", "unlock", "light", "freeze", "reflect"];

// the buttons shown in the current state, in selection order
function shown(ctx) {
  const buttons = ctx.state == config_m.STATE_COMBAT ? ["attack", "run"] : [];
  return buttons.concat(SPELLS.slice(0, ctx.avatar.spellbook));
}

function draw(image, x, y) {
  // required on first use, exploring never needs the icons
  const images = require("heroine_interface_img").images;
  g.drawImage(images[image](),
              x + config_m.SCREEN_OFFSET_X, y + config_m.SCREEN_OFFSET_Y);
}

// exports

exports.init = function() {
  return {select: null};
};

// select the first button, or nothing if none is shown
exports.reset = function(ctx) {
  const buttons = shown(ctx);
  ctx.action.select = buttons.length ? buttons[0] : null;
};

// the selected button's name, e.g. "heal", or null
exports.selected = function(ctx) {
  return ctx.action.select;
};

// step the selection through the shown buttons, wrapping around
exports.move_select = function(ctx, step) {
  const buttons = shown(ctx);
  if (!buttons.length) return;
  const index = buttons.indexOf(ctx.action.select);
  const next = (index + step + buttons.length) % buttons.length;
  ctx.action.select = buttons[index < 0 ? 0 : next];
  ctx.redraw = true;
};

exports.render = function(ctx) {
  shown(ctx).forEach(function(name) {
    const button = BUTTONS[name];
    draw(button.image, button.x + BUTTON_OFFSET, button.y + BUTTON_OFFSET);
  });
  const selected = BUTTONS[ctx.action.select];
  if (selected) {
    draw(SELECT_FRAME, selected.x, selected.y);
  }
};
