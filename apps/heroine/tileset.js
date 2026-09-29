// module imports
const config_m = require("heroine_config");

var SCREEN_OFFSET_X = config_m.SCREEN_OFFSET_X;
var SCREEN_OFFSET_Y = config_m.SCREEN_OFFSET_Y;

var background_images = [];
var is_walkable = [];

// Backgrounds

// 0: black
background_images[0] = function() {
  return require("heatshrink").decompress(atob("0F4wcBIf4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AD4A=="));
};

// 1: nightsky
background_images[1] = function() {
  return require("heatshrink").decompress(atob("0F4wcCkmSpICjk4mlATfyCJ15MuvkDrk8U/4CiyfJIP4C/AX4CWp4OMzwFD8gRQAX4C/ASl5BZVII/Q75nmSgB36oB03HYcEO/GQhA75wVAkESO/EAgA74wA7BGuMgO/Q7GyVAgh3wpA7GWYMEwQ7wVQyyBWeIyBgQIONDZ3VWYIABNcMEBxpuGHQWQcEQOMoBuGwEIWcVBO5sJJQ8AkCwfNAUEcAqGIiCzHgFBWeEChL1DAAYIDATgiBBxeQBww7EO8LvNGoMCgKzGiB3ghB3MiRuGkA7DIggCawEAgkSPoYOIAASJBpB9BWdI7Hd4UANwVAghDDHDpoCoCbBBAVAO5KqDgDvDOjykFHYZ9EQAY7BhI4CBwKAFHcZlHBwcJAYUgWYZ5eFYZzCXAMSCIoyEABB3eGwUCAoUIO5QAKXwI6dOIblBXAdJVIoAOerAtELoTbEHKYACZwwCQyAcDd4cAWoIAZHarfEOwYAdgQ7TiTpCO4oAgGpAriACPbtqmEAH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/A"));
};

// 2: tempest
background_images[2] = function() {
  return require("heatshrink").decompress(atob("0F4wcCkmSpICs//yF9oCEv///1P/mSp//HGACByf/AAXkHYICBHeHkz47DPoQ4vngyCHYgIBOmE8z/5HYqwxp88//Jkg6DWYOeHeH//1Jk46DPoOep47w+VJn47F/15HduT547CWQg7BAQQ7t/8nAoPkz46BXIY7zkg7B8gFBHYPJC5OCAocggQ7dNYg1EPQQXIGoUAgVAgAABgg7az41Dk7yBAoNP/gXJoMgiQ7BiQ6CHY4OBHaWeBZF/WwRxDAocBOgI7BAAoODpB9VHZN5BAosEG4x3GiEAerYCJpA7DyA7JAAUgwEBO49ALIgCXoEEyA7PgmApAdGwANCHC9BVoQgBHaD+BOgwACiRBCHaeQEYJZBkBZCL4YALhIdEBIZBDHwQ7Ra4MkboUCpMEHRwRBDoREGAgSzUwEJLIcCpA6OFgqPBAARcDYQKwTgEIbog6PHYjsEHAqzMpBKEgIzQAApTBSQZKNwRuHNAJBEHS0AoJcCBxTyBfYR6FcYI+EHbTpBiANKgSDEVogaCcwJKCLgOQHKrOBOhY1CBwRrEF4RHCyUIRIY7WACY7CoEEBAdAgA1DhMgHVKnDRgjmFgSYNADzsFAA8CHVcSHYOAF9YAKgmSpLgrABcBWANJHW0CdgVAHe0AhI43AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AH4A/AAMEHXMJkg76HXMSpAecgIcbyVAfZmADxxZZgVJkGSCBkEBJGQEApZMWDkJkhBGgMkHYoABCIrLRkmCKxsSQwI7GIgwRCOq1JLgSkFFIiDBySGGBwMJLgoRIWCA7BHwQ7Kgj7HkjLGpIRBd62SHAMCSQmAIIUIJQNAkg7GZYJuFgVIBAI7LEYIUDF4StBHYMgBATdCIgZ0CoEECgLsEHY4XCHYzCCFgQUEiSkCEAQOBMowjCAQSwHHY0JCgxoDBwILBAQJoFDoKtBDQRTFHY2QWA4RIHYpoBAQIICTAIgDDRQOCBZbRDDoI7MZAIXBBAxWBQYIXIARo7CgTdCZAQXLoIFDO4b1EHCgCCwEAkCeEkBcVeQJ0XHYcJkDUCBAIFBEbIC/AX4C/AX4C/AX4C/AX4C/AX4C/AX4C/AX4C/AWQ"));
};

// 3: interior
background_images[3] = function() {
  return require("heatshrink").decompress(atob("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"));
};


// Tiles: which ones can be walked on

is_walkable[0] = false; // true unwalkable void
is_walkable[1] = true; // dungeon_floor
is_walkable[2] = false; // dungeon_wall
is_walkable[3] = true; // dungeon_door
is_walkable[4] = false; // pillar_exterior
is_walkable[5] = true; // dungeon_ceiling
is_walkable[6] = true; // grass
is_walkable[7] = false; // pillar_interior
is_walkable[8] = true; // chest_interior
is_walkable[9] = true; // chest_exterior
is_walkable[10] = false; // medieval_house
is_walkable[11] = true; // medieval_door
is_walkable[12] = false; // tree_evergreen
is_walkable[13] = false; // grave_cross
is_walkable[14] = false; // grave_stone
is_walkable[15] = false; // water
is_walkable[16] = false; // skull_pile
is_walkable[17] = true; // hay_pile
is_walkable[18] = false; // locked_door
is_walkable[19] = true; // death_speaker

// Tile images live in heroine_tiles1..11 (tiles1.js ...): as one file
// the app was too big for the test runner's unchunked upload.
// For each tile, the number of its module (null for tile 0, the void)
const TILE_MODULES = [null, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 7, 8, 8, 9, 10, 11, 11];

var TILE_OFFSETS = [
  // x   y
  [0, 0], // 0
  [80, 0], // 1
  [0, 0], // 2
  [80, 0], // 3
  [0, 0], // 4
  [0, 0], // 5
  [80, 0], // 6
  [0, 0], // 7
  [80, 0], // 8
  [0, 0], // 9
  [0, 0], // 10
  [80, 0], // 11
  [0, 0], // 12
];

// exports

// render a background by its index
exports.background_render = function background_render(background_index) {
  g.drawImage(background_images[background_index](), SCREEN_OFFSET_X, SCREEN_OFFSET_Y);
};

// shakes the tiles (not the background) when the heroine is hurt
var render_offset = {x: 0, y: 0};

exports.set_render_offset = function(x, y) {
  render_offset = {x: x, y: y};
};

// render a single tile from tileset at tile_number
exports.tile_render = function(tileset_index, tile_number) {
  if (tileset_index == 0) return; // don't render void
  var tile_offset = TILE_OFFSETS[tile_number];
  var x_offset = tile_offset[0] + render_offset.x + SCREEN_OFFSET_X;
  var y_offset = tile_offset[1] + render_offset.y + SCREEN_OFFSET_Y;
  const images = require("heroine_tiles" + TILE_MODULES[tileset_index]).images;
  g.drawImage(images[tileset_index][tile_number](), x_offset, y_offset);
};

// answer if a tile is walkable
exports.is_walkable = function(tileset_index) {
  return is_walkable[tileset_index];
};
