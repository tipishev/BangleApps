/**
 Treasure
 Handles display of loot on the ground
 */

// module imports
const config_m = require("heroine_config");
const images_m = require("heroine_treasure_img");

const TREASURE_POS_X = 64;
const TREASURE_POS_Y = 88;

// icon positions on the ground in the 3D view
// see art_src/treasure/gold_pos.xcf of the original for reference
const GOLD_POS = [
  [65, 93], [56, 96], [74, 95], [74, 86], [50, 80],
  [63, 78], [41, 92], [90, 76], [87, 94], [29, 77],
];

// [gold value bit, icon] in treasure pile draw order
const GOLD_DRAW_ORDER = [
  [128, 7], [512, 9], [32, 5], [16, 4], [8, 3],
  [1, 0], [4, 2], [64, 6], [2, 1], [256, 8],
];

// draw an icon in game coordinates, clipped to the game area like the
// original's canvas (some gold piles reach below it)
function render_icon(item_id, x, y) {
  const left = config_m.SCREEN_OFFSET_X;
  const top = config_m.SCREEN_OFFSET_Y;
  g.setClipRect(left, top, left + 159, top + 119)
   .drawImage(images_m.images[item_id](), left + x, top + y)
   .setClipRect(0, 0, g.getWidth() - 1, g.getHeight() - 1);
}

// exports

/**
 * Renders a gold pile with the correct gold value, up to 1023
 */
exports.render_gold = function(total_value) {
  GOLD_DRAW_ORDER.forEach(function(entry) {
    if (total_value & entry[0]) {
      const item_id = entry[1];
      render_icon(item_id, GOLD_POS[item_id][0], GOLD_POS[item_id][1]);
    }
  });
};

exports.render_item = function(item_id) {
  render_icon(item_id, TREASURE_POS_X, TREASURE_POS_Y);
};
