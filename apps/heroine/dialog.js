/**
 Conversation and shop handling

 Three options, the third is Exit (or "Wake up" in the opening
 nightmare). Swipes up/down move the selection between the options
 that can be used, a tap uses it, the button leaves like Exit.
 */

// module imports
const bitfont_m = require("heroine_bitfont");
const config_m = require("heroine_config");
const info_m = require("heroine_info");
const shop_m = require("heroine_shop");
const tileset_m = require("heroine_tileset");

// option positions, like the original
const OPTION_POS = [{x: 0, y: 60}, {x: 0, y: 80}, {x: 0, y: 100}];
const BUTTON_OFFSET = 2;
// in interface_images.js
const SELECT_FRAME = 8;
const BUTTON_IMAGES = [null, 9, 10]; // none, buy, exit

function draw(image, x, y) {
  const images = require("heroine_interface_img").images;
  g.drawImage(images[image](),
              x + config_m.SCREEN_OFFSET_X, y + config_m.SCREEN_OFFSET_Y);
}

function usable(dialog, slot) {
  return dialog.option[slot].button != shop_m.DIALOG_BUTTON_NONE;
}

// move the selection to the next usable option up (-1) or down (1),
// staying put at the ends like the original
function move_select(ctx, step) {
  const dialog = ctx.dialog;
  for (var slot = dialog.select + step; slot >= 0 && slot <= 2; slot += step) {
    if (usable(dialog, slot)) {
      dialog.select = slot;
      ctx.redraw = true;
      return;
    }
  }
}

function render_text(option, pos) {
  if (option.msg1 == "" && option.msg2 == "") return;

  if (option.msg2 == "") {
    bitfont_m.render(option.msg1, pos.x + 22, pos.y + 6, bitfont_m.JUSTIFY_LEFT);
  }
  else {
    bitfont_m.render(option.msg1, pos.x + 22, pos.y + 1, bitfont_m.JUSTIFY_LEFT);
    bitfont_m.render(option.msg2, pos.x + 22, pos.y + 11, bitfont_m.JUSTIFY_LEFT);
  }
}

// exports

// talk to a shop (the avatar is already back outside)
exports.open = function(ctx, shop_id) {
  ctx.dialog = {option: [], message: ""};
  shop_m.set(ctx, shop_id);
  ctx.state = config_m.STATE_DIALOG;
  ctx.redraw = true;
};

exports.logic = function(ctx) {
  const dialog = ctx.dialog;
  const input = ctx.input;

  if (input.tick) return;

  if (input.btn) {
    shop_m.act(ctx, 2);
    return;
  }

  if (input.up) move_select(ctx, -1);
  if (input.down) move_select(ctx, 1);

  if (input.tap && usable(dialog, dialog.select)) {
    shop_m.act(ctx, dialog.select);
  }
};

exports.render = function(ctx) {
  const dialog = ctx.dialog;

  tileset_m.background_render(shop_m.background(dialog.shop_id));

  bitfont_m.render(dialog.title, 80, 2, bitfont_m.JUSTIFY_CENTER);

  // only render gold if there is something for sale
  if (dialog.items_for_sale) {
    info_m.render_gold(ctx);
  }

  for (var slot = 0; slot < 3; slot++) {
    const option = dialog.option[slot];
    const pos = OPTION_POS[slot];
    if (option.button != shop_m.DIALOG_BUTTON_NONE) {
      draw(BUTTON_IMAGES[option.button], pos.x + BUTTON_OFFSET, pos.y + BUTTON_OFFSET);
    }
  }
  for (slot = 0; slot < 3; slot++) {
    render_text(dialog.option[slot], OPTION_POS[slot]);
  }

  const selected = OPTION_POS[dialog.select];
  draw(SELECT_FRAME, selected.x, selected.y);

  // a purchase message shows once
  if (dialog.message != "") {
    bitfont_m.render(dialog.message, 80, 40, bitfont_m.JUSTIFY_CENTER);
    dialog.message = "";
  }
};
