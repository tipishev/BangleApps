/**
 * Minimap
 * Shown in the Info screen
 */

// FIXME wrap constants in a function
const heatshrink_m = require("heatshrink");
const atlas_m = require("heroine_atlas");
const tileset_m = require("heroine_tileset");

const ICON_SIZE = 14; // pixels

// explained by the position of game canvas offset
// TODO deduplicate with tileset.js constants
const GLOBAL_MARGIN_LEFT = 8;
const GLOBAL_MARGIN_TOP = 32;

const MARGIN_LEFT = GLOBAL_MARGIN_LEFT + 2;
const MARGIN_TOP = GLOBAL_MARGIN_TOP + 2;

// exports

exports.render = function(ctx) {
  const mazemap = ctx.mazemap;
  const avatar = ctx.avatar;

  const BLACK = "#000";
  const WHITE = "#FFF";
  const BLUE = "#00F";
  const RED = "#F00";

  const atlas = atlas_m.atlas();

  let x;
  let y;
  var target_tile;

  // render map
  for (let x=0; x<mazemap.width; x++) {
    for (let y=0; y<mazemap.height; y++) {
      target_tile = mazemap_m.get_tile(mazemap, x, y);
      let color;
      if (tileset_m.is_walkable(target_tile)) {
        render_square(x, y, WHITE);
	  }
      else if (target_tile != 0) {
         render_square(x, y, BLACK);
      }
	}
  }


  // render exits
  for (let i=0; i<atlas.maps[mazemap.current_id].exits.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].exits[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].exits[i].exit_y;
    render_square(exit_x, exit_y, BLUE);
  }

  /*

  // render shops
  for (var i=0; i<atlas.maps[mazemap.current_id].shops.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].shops[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].shops[i].exit_y;
	draw_x = exit_x * ICON_SIZE + left_x;
	draw_y = exit_y * ICON_SIZE + top_y;
	render_icon(draw_x, draw_y, ICON_EXIT);
  }
  */

  // render avatar cursor
  //var cursor_direction;
  //if (avatar.facing == "west") cursor_direction = CURSOR_WEST;
  //else if (avatar.facing == "north") cursor_direction = CURSOR_NORTH;
  //else if (avatar.facing == "east") cursor_direction = CURSOR_EAST;
  //else if (avatar.facing == "south") cursor_direction = CURSOR_SOUTH;
  //render_cursor(draw_x, draw_y, cursor_direction);
  render_cursor(avatar.x, avatar.y, avatar.facing, RED);

};

// x and y are logical coordinate, e.g. (0, 0)
function render_square(x, y, color) {
  g.setColor(color)
   .fillRect(MARGIN_LEFT + x * ICON_SIZE,
             MARGIN_TOP + y * ICON_SIZE,
             MARGIN_LEFT + x * ICON_SIZE + (ICON_SIZE - 1),
             MARGIN_TOP + y * ICON_SIZE +  (ICON_SIZE - 1));
}

function render_cursor(x, y, direction, color) {
  print(direction);
  let base_rectangle, direction_rectangle;
  if (direction === "south") {
    // horizontal top
    base_rectangle = [MARGIN_LEFT + x * ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE,
                      MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE + ICON_SIZE / 3];
    // vertical middle
    direction_rectangle = [MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE/3,
                           MARGIN_TOP + y * ICON_SIZE,
                           MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE * 2/3,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE];
  } else if (direction === "north") {
      // horizontal bottom
    base_rectangle = [MARGIN_LEFT + x * ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE + ICON_SIZE * 2/3,
                      MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE + ICON_SIZE];
    // vertical middle
    direction_rectangle = [MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE/3,
                           MARGIN_TOP + y * ICON_SIZE,
                           MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE*2/3,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE];
  } else if (direction === "east") {
    // vertical left
    base_rectangle = [MARGIN_LEFT + x * ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE,
                      MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE * 1/3,
                      MARGIN_TOP + y * ICON_SIZE + ICON_SIZE];
    // horizontal middle
    direction_rectangle = [MARGIN_LEFT + x * ICON_SIZE,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE * 1/3,
                           MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE * 2/3];
  }else if (direction === "west") {
   // vertical right
    base_rectangle = [MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE * 2/3,
                      MARGIN_TOP + y * ICON_SIZE,
                      MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE,
                      MARGIN_TOP + y * ICON_SIZE + ICON_SIZE];
    // horizontal middle
    direction_rectangle = [MARGIN_LEFT + x * ICON_SIZE,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE * 1/3,
                           MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE,
                           MARGIN_TOP + y * ICON_SIZE + ICON_SIZE * 2/3];
  }
  g.setColor(color)
   .fillRect(base_rectangle[0], base_rectangle[1], base_rectangle[2], base_rectangle[3])
   .fillRect(direction_rectangle[0], direction_rectangle[1], direction_rectangle[2], direction_rectangle[3])
  ;

  /*g.fillPoly([
              // top left
              MARGIN_LEFT + x * ICON_SIZE,
              MARGIN_TOP + y * ICON_SIZE,

              // top right
              MARGIN_LEFT + x * ICON_SIZE + ICON_SIZE - 1,
              MARGIN_TOP + y * ICON_SIZE,

              // bottom middle
              MARGIN_LEFT + x * ICON_SIZE + (ICON_SIZE - 1)/ 2,
              MARGIN_TOP + y * ICON_SIZE + (ICON_SIZE - 1) * 1.3]);*/
}


/*
function render_cursor(screen_x, screen_y, cursor_dir) {
 ctx.drawImage(
    minimap.cursor,
    cursor_dir * MINIMAP_ICON_SIZE * PRESCALE,
	0,
	MINIMAP_ICON_SIZE * PRESCALE,
    MINIMAP_ICON_SIZE * PRESCALE,
    screen_x * SCALE,
    screen_y * SCALE,
    MINIMAP_ICON_SIZE * SCALE,
    MINIMAP_ICON_SIZE * SCALE
  );
}
*/


/*
minimap_m = require("heroine_minimap"); ctx = {mazemap: mazemap, avatar: avatar}; minimap_m.render(ctx);
*/