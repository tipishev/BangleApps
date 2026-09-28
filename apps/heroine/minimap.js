/**
 * Minimap
 * Shown in the Info screen
 */

const config_m = require("heroine_config");
const mazemap_m = require("heroine_mazemap");
const tileset_m = require("heroine_tileset");

const ICON_SIZE = 3; // pixels

const MARGIN_LEFT = config_m.SCREEN_OFFSET_X + 2;
const MARGIN_TOP = config_m.SCREEN_OFFSET_Y + 2;

/*
Pre-render a set of 1-bpp layers for fast drawing instead
of real-time iteration over all map's tiles.
The layers are rebuilt in RAM on every map change (a few hundred
bytes each), because map events change tiles at runtime.
*/

function as_layer(graphics) {
  const image = graphics.asImage();
  image.transparent = 0;
  return image;
}

function generate_layers(ctx) {
  const mazemap = ctx.mazemap;

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
      const target_tile = mazemap_m.get_tile(mazemap, x, y);
      if (tileset_m.is_walkable(target_tile)) {
        render_square(walkable, x, y);
      } else if (target_tile != 0) {
        render_square(walls, x, y);
      }
    }
  }

  // generate doors layer with shops and exits from atlas
  const map = ctx.atlas.maps[mazemap.current_id];
  map.exits.concat(map.shops).forEach(function(exit) {
    render_square(doors, exit.exit_x, exit.exit_y);
  });

  return {
    walkable: as_layer(walkable),
    walls: as_layer(walls),
    doors: as_layer(doors)
  };
}

// exports

exports.init = function() {
  // remove files left by the old on-flash minimap cache
  const storage = require("Storage");
  storage.list(/^heroine_minimap_cache_/).forEach(function(filename) {
    storage.erase(filename);
  });
  return {
    map_id: null,
    layers: null
  };
};

exports.set_map = function(ctx) {
  const minimap = ctx.minimap;
  if (minimap.map_id === ctx.mazemap.current_id) return;  // noop
  minimap.layers = generate_layers(ctx);
  minimap.map_id = ctx.mazemap.current_id;
};

// rebuild the layers after a tile of the current map has changed
exports.invalidate = function(ctx) {
  ctx.minimap.map_id = null;
  exports.set_map(ctx);
};

exports.render = function(ctx) {
  const avatar = ctx.avatar;
  // rebuild the layers if the map has changed since the last render
  exports.set_map(ctx);
  const layers = ctx.minimap.layers;

  const BLACK = "#000", WHITE = "#FFF", BLUE = "#00F", RED = "#F00";

  g.setColor(BLACK)
   .drawImage(layers.walls, MARGIN_LEFT, MARGIN_TOP)
   .setColor(WHITE)
   .drawImage(layers.walkable, MARGIN_LEFT, MARGIN_TOP)
   .setColor(BLUE)
   .drawImage(layers.doors, MARGIN_LEFT, MARGIN_TOP)
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