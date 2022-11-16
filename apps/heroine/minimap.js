/**
 * Minimap
 * Shown in the Info screen
 */

// FIXME wrap constants in a function
const atlas_m = require("heroine_atlas");
const tileset_m = require("heroine_tileset");

const ICON_SIZE = 3; // pixels

const MARGIN_LEFT = 2;
const MARGIN_TOP = 2;

// TODO de-atob-ize, store only strings.
const ICON_NONWALKABLE = require("heatshrink").decompress(atob("gcDwcBA4YA=="));
const ICON_EXIT = require("heatshrink").decompress(atob("gcDwcAkmSpMg"));
const ICON_WALKABLE = require("heatshrink").decompress(atob("gcDwcA/4AB8A"));

const CURSOR_SOUTH = require("heatshrink").decompress(atob("gcDwcAyV54kA"));
const CURSOR_WEST = require("heatshrink").decompress(atob("gcDwcAj1Jg+A"));
const CURSOR_EAST = require("heatshrink").decompress(atob("gcDwcAzlJk8A"));
const CURSOR_NORTH = require("heatshrink").decompress(atob("gcDwcAiF58mA"));

// exports

exports.render = function(ctx) {
  var mazemap = ctx.mazemap;
  var avatar = ctx.avatar;

  var atlas = atlas_m.atlas();

  // starting draw location
  var left_x = MARGIN_LEFT;
  var top_y = MARGIN_TOP;

  var draw_x;
  var draw_y;
  var target_tile;

  // render map
  for (var i=0; i<mazemap.width; i++) {
    draw_x = i * ICON_SIZE + left_x;

    for (var j=0; j<mazemap.height; j++) {
	  draw_y = j * ICON_SIZE + top_y;

      target_tile = mazemap_m.get_tile(mazemap, i, j);
      if (tileset_m.is_walkable[target_tile]) {
	    render_icon(ICON_WALKABLE, draw_x, draw_y);
	  }
      else if (target_tile != 0) {
        render_icon(ICON_NONWALKABLE, draw_x, draw_y);
      }
	}
  }
/*
  // render exits
  var exit_x;
  var exit_y;

  for (var i=0; i<atlas.maps[mazemap.current_id].exits.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].exits[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].exits[i].exit_y;
	draw_x = exit_x * ICON_SIZE + left_x;
	draw_y = exit_y * ICON_SIZE + top_y;
	render_icon(draw_x, draw_y, ICON_EXIT);
  }

  // render shops
  for (var i=0; i<atlas.maps[mazemap.current_id].shops.length; i++) {
    exit_x = atlas.maps[mazemap.current_id].shops[i].exit_x;
	exit_y = atlas.maps[mazemap.current_id].shops[i].exit_y;
	draw_x = exit_x * ICON_SIZE + left_x;
	draw_y = exit_y * ICON_SIZE + top_y;
	render_icon(draw_x, draw_y, ICON_EXIT);
  }

  // render avatar cursor
  draw_x = avatar.x * ICON_SIZE + left_x;
  draw_y = avatar.y * ICON_SIZE + top_y;
  var cursor_direction;
  if (avatar.facing == "west") cursor_direction = CURSOR_WEST;
  else if (avatar.facing == "north") cursor_direction = CURSOR_NORTH;
  else if (avatar.facing == "east") cursor_direction = CURSOR_EAST;
  else if (avatar.facing == "south") cursor_direction = CURSOR_SOUTH;
  render_cursor(draw_x, draw_y, cursor_direction);
  */

};

function render_icon(icon, screen_x, screen_y) {
  g.drawImage(icon, MARGIN_LEFT + screen_x + ICON_SIZE, MARGIN_TOP + screen_y + ICON_SIZE);
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