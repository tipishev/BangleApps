/**
 * Minimap
 * Shown in the Info screen
 */

const atlas_m = require("heroine_atlas");
// const heatshrink_m = require("heatshrink");
const tileset_m = require("heroine_tileset");
const storage_m = require("Storage");

const ICON_SIZE = 5; // pixels

// explained by the position of game canvas offset
// TODO deduplicate with tileset.js constants
// maybe via a global settings module
const GLOBAL_MARGIN_LEFT = 8;
const GLOBAL_MARGIN_TOP = 32;

const MARGIN_LEFT = GLOBAL_MARGIN_LEFT + 2;
const MARGIN_TOP = GLOBAL_MARGIN_TOP + 2;


function render_square2(graphics, x, y) {
  graphics.fillRect(x * ICON_SIZE,
                    y * ICON_SIZE,
                    x * ICON_SIZE + (ICON_SIZE - 1),
                    y * ICON_SIZE + (ICON_SIZE - 1));
}

/*
Pre-render a set of images for fast drawing instead
of real-time iteration over all map's tiles.
Generate an object with 2 1-bpp images:
-map
-doors and shops
*/
function generate_map_images(mazemap) {
  const width = mazemap.width * ICON_SIZE;
  const height = mazemap.height * ICON_SIZE;

  const walkable = Graphics.createArrayBuffer(width, height, 1);
  const walls = Graphics.createArrayBuffer(width, height, 1);
  //const doors = Graphics.createArrayBuffer(width, height, 1);

  for (let x=0; x<mazemap.width; x++) {
    for (let y=0; y<mazemap.height; y++) {
      target_tile = mazemap_m.get_tile(mazemap, x, y);
      if (tileset_m.is_walkable(target_tile)) {
        render_square2(walkable, x, y);
      }
      else if (target_tile != 0) {
       render_square2(walls, x, y);
      }
  }
}
let walkable_image = walkable.asImage();
let walls_image = walls.asImage();
walkable_image.transparent = 0;
walls_image.transparent = 0;
// TODO compress with heatshrink
return {"walkable": walkable_image,
        "walls": walls_image};
}

// exports

exports.generate_map_images = generate_map_images;

exports.render = function(ctx) {
  const mazemap = ctx.mazemap;
  const avatar = ctx.avatar;

  const BLACK = "#000", WHITE = "#FFF", BLUE = "#00F", RED = "#F00";

  const atlas = atlas_m.atlas();

  let x, y;
  let target_tile;


  //images = generate_map_images(mazemap);
  images = storage_m.readJSON("heroine_minimap_1");
  g.setColor(BLACK)
   .drawImage(images.walls, MARGIN_LEFT, MARGIN_TOP)
   .setColor(WHITE)
   .drawImage(images.walkable, MARGIN_LEFT, MARGIN_TOP);


  // render exits
  for (let i=0; i<atlas.maps[mazemap.current_id].exits.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].exits[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].exits[i].exit_y;
    render_square(g, exit_x, exit_y, BLUE);
  }

  // render shops
  for (let i=0; i<atlas.maps[mazemap.current_id].shops.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].shops[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].shops[i].exit_y;
    render_square(exit_x, exit_y, BLUE);
  }

  render_cursor(avatar.x, avatar.y, avatar.facing, RED);
};

// x and y are logical coordinate, e.g. (0, 0)
function render_square(graphics, x, y, color) {
  graphics.setColor(color)
   .fillRect(MARGIN_LEFT + x * ICON_SIZE,
             MARGIN_TOP + y * ICON_SIZE,
             MARGIN_LEFT + x * ICON_SIZE + (ICON_SIZE - 1),
             MARGIN_TOP + y * ICON_SIZE +  (ICON_SIZE - 1));
}

function render_cursor(x, y, direction, color) {
  const TOP_LEFT_X = MARGIN_LEFT + x * ICON_SIZE;
  const TOP_LEFT_Y = MARGIN_TOP + y * ICON_SIZE;

  function rectangle(x1_offset, y1_offset, x2_offset, y2_offset) {
    return [TOP_LEFT_X + ICON_SIZE * x1_offset, TOP_LEFT_Y + ICON_SIZE * y1_offset,
            TOP_LEFT_X + ICON_SIZE * x2_offset, TOP_LEFT_Y + ICON_SIZE * y2_offset];
  }

  const HORIZONTAL_MIDDLE_RECTANGLE = rectangle(0, 1/3, 1, 2/3);
  const VERTICAL_MIDDLE_RECTANGLE = rectangle(1/3, 0, 2/3, 1);

  let base_rectangle, direction_rectangle;
  if (direction === "south") {
    base_rectangle = rectangle(0, 0, 1, 1/3);  // horizontal top
    direction_rectangle = VERTICAL_MIDDLE_RECTANGLE;
  } else if (direction === "north") {
    base_rectangle = rectangle(0, 2/3, 1, 1);  // horizontal bottom
    direction_rectangle = VERTICAL_MIDDLE_RECTANGLE;
  } else if (direction === "east") {
    base_rectangle = rectangle(0, 0, 1/3, 1); // vertical left
    direction_rectangle = HORIZONTAL_MIDDLE_RECTANGLE;
  }else if (direction === "west") {
    base_rectangle = rectangle(2/3, 0, 1, 1); // vertical right
    direction_rectangle = HORIZONTAL_MIDDLE_RECTANGLE;
  }
  g.setColor(color)
   .fillRect(base_rectangle[0],
             base_rectangle[1],
             base_rectangle[2],
             base_rectangle[3])
   .fillRect(direction_rectangle[0],
             direction_rectangle[1],
             direction_rectangle[2],
             direction_rectangle[3]);
}
