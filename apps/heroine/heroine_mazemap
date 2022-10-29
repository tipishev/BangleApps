/**
MazeMap class
MazeMap represents the current active map.
Atlas, another class, is a collection of all the map data.
While Atlas is a static collection, MazeMap can be altered by events.
2013 Clint Bellanger
*/

// load modules
var atlas_m = require("heroine_atlas");
var tileset_m = require("heroine_tileset");

// load a map from atlas
function set(mazemap, map_id) {
  var atlas = atlas_m.atlas();
  mazemap.tiles = atlas.maps[map_id].tiles;
  mazemap.width = atlas.maps[map_id].width;
  mazemap.height = atlas.maps[map_id].height;
  mazemap.current_id = map_id;
  // FIXME: port mapscript
  //mapscript_exec(map_id);
  // // reset encounter chance when moving to a new map
  // FIXME: port explore
  //explore.encounter_chance = 0;
  // FIXME: port avatar
  // // for save game info
  // avatar.map_id = map_id;
  return mazemap;
}

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

// Note: x,y flipped to ease map making
function mazemap_set_tile(pos_x, pos_y, tile_id) {
  if (mazemap_bounds_check(pos_x, pos_y)) {
    mazemap.tiles[pos_y][pos_x] = tile_id;
  }
}

// exports

exports.init = function() {
  var mazemap = {};
  return set(mazemap, 0);
};

// Note: x,y flipped to ease map making
exports.get_tile = function(mazemap, pos_x, pos_y) {
  if (bounds_check(mazemap, pos_x, pos_y)) {
    return mazemap.tiles[pos_y][pos_x];
  }
  else return 0;
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
 */
exports.check_exit = function(mazemap, avatar) {
  var result = {};
  var atlas = atlas_m.atlas();
  for (var i=0; i<atlas.maps[mazemap.current_id].exits.length; i++) {

    if ((avatar.x == atlas.maps[mazemap.current_id].exits[i].exit_x) &&
        (avatar.y == atlas.maps[mazemap.current_id].exits[i].exit_y)) {

      avatar.x = atlas.maps[mazemap.current_id].exits[i].dest_x;
      avatar.y = atlas.maps[mazemap.current_id].exits[i].dest_y;
      set(mazemap, atlas.maps[mazemap.current_id].exits[i].dest_map);
      result.mazemap = mazemap;
      result.avatar = avatar;
      return result;
    }
  }
  return false; // yeah, yeah, an unpure shortcut.
};

exports.check_shop = function (mazemap, avatar) {
  var atlas = atlas_m.atlas();
  for (var i=0; i<atlas.maps[mazemap.current_id].shops.length; i++) {

    if ((avatar.x == atlas.maps[mazemap.current_id].shops[i].exit_x) &&
        (avatar.y == atlas.maps[mazemap.current_id].shops[i].exit_y)) {

      // FIXME update for the shop
      shop_set(atlas.maps[mazemap.current_id].shops[i].shop_id);

      // put avatar back outside for save purposes
      avatar.x = atlas.maps[mazemap.current_id].shops[i].dest_x;
      avatar.y = atlas.maps[mazemap.current_id].shops[i].dest_y;

      return avatar;
    }
  }
  return avatar;
};