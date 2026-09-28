/**
MazeMap class
MazeMap represents the current active map.
Atlas, another class, is a collection of all the map data.
While Atlas is a static collection, MazeMap can be altered by events.
2013 Clint Bellanger
*/

// load modules
var tileset_m = require("heroine_tileset");

function bounds_check(mazemap, pos_x, pos_y) {
  return (pos_x >= 0 && pos_y >= 0
          && pos_x < mazemap.width && pos_y < mazemap.height);
}

// Note: x,y flipped to ease map making
function render_tile(mazemap, pos_x, pos_y, position) {
  if (bounds_check(mazemap, pos_x, pos_y)) {
    tileset_m.tile_render(mazemap.tiles[pos_y][pos_x], position);
  }
}

// exports

// an empty map, see set() and avatar.start()
exports.init = function() {
  return {};
};

// load a map from atlas
exports.set = function(ctx, map_id) {
  var mazemap = ctx.mazemap;
  var map = ctx.atlas.maps[map_id];
  // copy the rows so that map events (chests, doors, bones)
  // don't alter the atlas
  mazemap.tiles = map.tiles.map(function(row) { return row.slice(); });
  mazemap.width = map.width;
  mazemap.height = map.height;
  mazemap.current_id = map_id;
  // restore opened chests, burned bones and unlocked doors
  // (required here, not at the top: mapscript requires this module)
  require("heroine_mapscript").exec(ctx, map_id);
  // reset encounter chance when moving to a new map
  ctx.explore.encounter_chance = 0;
  // for save game info
  ctx.avatar.map_id = map_id;
};

// Note: x,y flipped to ease map making
exports.get_tile = function(mazemap, pos_x, pos_y) {
  if (bounds_check(mazemap, pos_x, pos_y)) {
    return mazemap.tiles[pos_y][pos_x];
  }
  else return 0;
};

// Note: x,y flipped to ease map making
exports.set_tile = function(mazemap, pos_x, pos_y, tile_id) {
  if (bounds_check(mazemap, pos_x, pos_y)) {
    mazemap.tiles[pos_y][pos_x] = tile_id;
  }
};

/**
The visibility cone is shaped like this:

.........
..VVVVV..
..VVVVV..
...V@V...
.........
Drawing is done in this order (a=10, b=11, c=12)
.........
..02431..
..57986..
...acb...
.........
*/
exports.render = function(mazemap, x, y, facing) {

  /* TODO replace with tileset_m.tiles_render
   for faster(?) rendering
   need to think about bounds check. */
  // TODO shorten
  if (facing == "north") {
    // back row
    render_tile(mazemap, x-2,y-2,0);
    render_tile(mazemap, x+2,y-2,1);
    render_tile(mazemap, x-1,y-2,2);
    render_tile(mazemap, x+1,y-2,3);
    render_tile(mazemap, x,  y-2,4);
    // middle row
    render_tile(mazemap, x-2,y-1,5);
    render_tile(mazemap, x+2,y-1,6);
    render_tile(mazemap, x-1,y-1,7);
    render_tile(mazemap, x+1,y-1,8);
    render_tile(mazemap, x,  y-1,9);
    // front row
    render_tile(mazemap, x-1,y, 10);
    render_tile(mazemap, x+1,y, 11);
    render_tile(mazemap, x,  y, 12);
  }
  else if (facing == "south") {
    // back row
    render_tile(mazemap, x+2,y+2,0);
    render_tile(mazemap, x-2,y+2,1);
    render_tile(mazemap, x+1,y+2,2);
    render_tile(mazemap, x-1,y+2,3);
    render_tile(mazemap, x,y+2,4);
    // middle row
    render_tile(mazemap, x+2,y+1,5);
    render_tile(mazemap, x-2,y+1,6);
    render_tile(mazemap, x+1,y+1,7);
    render_tile(mazemap, x-1,y+1,8);
    render_tile(mazemap, x,y+1,9);
    // front row
    render_tile(mazemap, x+1,y,10);
    render_tile(mazemap, x-1,y,11);
    render_tile(mazemap, x,y,12);
  }
  else if (facing == "west") {
    // back row
    render_tile(mazemap, x-2,y+2,0);
    render_tile(mazemap, x-2,y-2,1);
    render_tile(mazemap, x-2,y+1,2);
    render_tile(mazemap, x-2,y-1,3);
    render_tile(mazemap, x-2,y,4);
    // middle row
    render_tile(mazemap, x-1,y+2,5);
    render_tile(mazemap, x-1,y-2,6);
    render_tile(mazemap, x-1,y+1,7);
    render_tile(mazemap, x-1,y-1,8);
    render_tile(mazemap, x-1,y,9);
    // front row
    render_tile(mazemap, x,y+1,10);
    render_tile(mazemap, x,y-1,11);
    render_tile(mazemap, x,y,12);
  }
  else if (facing == "east") {
    // back row
    render_tile(mazemap, x+2,y-2,0);
    render_tile(mazemap, x+2,y+2,1);
    render_tile(mazemap, x+2,y-1,2);
    render_tile(mazemap, x+2,y+1,3);
    render_tile(mazemap, x+2,y,4);
    // middle row
    render_tile(mazemap, x+1,y-2,5);
    render_tile(mazemap, x+1,y+2,6);
    render_tile(mazemap, x+1,y-1,7);
    render_tile(mazemap, x+1,y+1,8);
    render_tile(mazemap, x+1,y,9);
    // front row
    render_tile(mazemap, x,y-1,10);
    render_tile(mazemap, x,y+1,11);
    render_tile(mazemap, x,y,12);
  }
};


/**
 * Each map in the atlas has a list of exits
 * If the avatar is on an exit tile, move them to the new map
 * Returns true if the map changed
 */
exports.check_exit = function(ctx) {
  var avatar = ctx.avatar;
  var exits = ctx.atlas.maps[ctx.mazemap.current_id].exits;
  for (var i=0; i<exits.length; i++) {
    if (avatar.x == exits[i].exit_x && avatar.y == exits[i].exit_y) {
      avatar.x = exits[i].dest_x;
      avatar.y = exits[i].dest_y;
      exports.set(ctx, exits[i].dest_map);
      return true;
    }
  }
  return false;
};

/**
 * If the avatar is on a shop tile, put them back outside
 * Returns the shop id, or -1 if there is no shop here
 */
exports.check_shop = function(ctx) {
  var avatar = ctx.avatar;
  var shops = ctx.atlas.maps[ctx.mazemap.current_id].shops;
  for (var i=0; i<shops.length; i++) {
    if (avatar.x == shops[i].exit_x && avatar.y == shops[i].exit_y) {
      // put avatar back outside for save purposes
      avatar.x = shops[i].dest_x;
      avatar.y = shops[i].dest_y;
      return shops[i].shop_id;
    }
  }
  return -1;
};
