/**
 * Minimap
 * Shown in the Info screen
 */

const atlas_m = require("heroine_atlas");
// const heatshrink_m = require("heatshrink");
const tileset_m = require("heroine_tileset");
const storage_m = require("Storage");

const ICON_SIZE = 3; // pixels

// explained by the position of game canvas offset
// TODO deduplicate with tileset.js constants
// maybe via a global settings module
const GLOBAL_MARGIN_LEFT = 8;
const GLOBAL_MARGIN_TOP = 32;

const MARGIN_LEFT = GLOBAL_MARGIN_LEFT + 2;
const MARGIN_TOP = GLOBAL_MARGIN_TOP + 2;

/*
Pre-render a set of 1-bpp layers for fast drawing instead
of real-time iteration over all map's tiles.
*/

function as_layer(graphics) {
  const image = graphics.asImage();
  image.transparent = 0;
  return image;
}

function generate_layers(mazemap) {

  function render_square(graphics, x, y) {
  graphics.fillRect(x * ICON_SIZE,
                    y * ICON_SIZE,
                    x * ICON_SIZE + (ICON_SIZE - 1),
                    y * ICON_SIZE + (ICON_SIZE - 1));
  }

  const width = mazemap.width * ICON_SIZE;
  const height = mazemap.height * ICON_SIZE;

  const walkable = Graphics.createArrayBuffer(width, height, 1);
  const walls = Graphics.createArrayBuffer(width, height, 1);
  const doors = Graphics.createArrayBuffer(width, height, 1);

  // generate walkable tiles and walls layers
  for (let x = 0; x < mazemap.width; x++) {
    for (let y = 0; y < mazemap.height; y++) {
      target_tile = mazemap_m.get_tile(mazemap, x, y);
      if (tileset_m.is_walkable(target_tile)) {
        render_square(walkable, x, y);
      } else if (target_tile != 0) {
        render_square(walls, x, y);
      }
    }
  }

  // generate doors layer with shops and exits from atlas
  const atlas = atlas_m.atlas();
  for (let i = 0; i < atlas.maps[mazemap.current_id].exits.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].exits[i].exit_x;
    exit_y = atlas.maps[mazemap.current_id].exits[i].exit_y;
    render_square(doors, exit_x, exit_y);
  }
  for (let i = 0; i < atlas.maps[mazemap.current_id].shops.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].shops[i].exit_x;
    exit_y = atlas.maps[mazemap.current_id].shops[i].exit_y;
    render_square(doors, exit_x, exit_y);
  }

  // TODO compress with heatshrink?
  return {
    walkable: as_layer(walkable),
    walls: as_layer(walls),
    doors: as_layer(doors)
  };
}

// exports

exports.init = function() {
  return {
    map_id: null,
    layers: null,
    cache: {}
  };
};

exports.set_map = function(minimap, mazemap) {
  const map_id = mazemap.current_id;
  if (minimap.map_id === map_id) {
    return minimap;  // noop
  } else if (minimap.cache.hasOwnProperty(map_id)) {
    minimap.layers = storage_m.readJSON(minimap.cache[map_id]);
    minimap.map_id = map_id;
  } else  {
    const filename = `heroine_minimap_cache_${map_id}`;
    const layers = generate_layers(mazemap);
    storage_m.writeJSON(filename, layers);
    minimap.layers = layers;
    minimap.cache[map_id] = filename;
    minimap.map_id = map_id;
  }
  return minimap;
};

exports.render = function(ctx) {
  const mazemap = ctx.mazemap;
  const avatar = ctx.avatar;
  const minimap = ctx.minimap;

  const BLACK = "#000", WHITE = "#FFF", BLUE = "#00F", RED = "#F00";

  let x, y;
  let target_tile;

  g.setColor(BLACK)
   .drawImage(minimap.layers.walls, MARGIN_LEFT, MARGIN_TOP)
   .setColor(WHITE)
   .drawImage(minimap.layers.walkable, MARGIN_LEFT, MARGIN_TOP)
   .setColor(BLUE)
   .drawImage(minimap.layers.doors, MARGIN_LEFT, MARGIN_TOP)
  ;
  render_cursor(avatar.x, avatar.y, avatar.facing, RED);
};

function render_cursor(x, y, direction, color) {
  const TOP_LEFT_X = MARGIN_LEFT + x * ICON_SIZE;
  const TOP_LEFT_Y = MARGIN_TOP + y * ICON_SIZE;

  function rectangle(x1_offset, y1_offset, x2_offset, y2_offset) {
    return [TOP_LEFT_X + ICON_SIZE * x1_offset,
            TOP_LEFT_Y + ICON_SIZE * y1_offset,
            TOP_LEFT_X + ICON_SIZE * x2_offset,
            TOP_LEFT_Y + ICON_SIZE * y2_offset];
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