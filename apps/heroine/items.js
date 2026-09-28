/**
 Weapons, armors and spells, from the original info.js
 The avatar stores the index into each list
 */

exports.weapons = [
  {name:"Bare Fists",  atk_min:1,  atk_max:4,  gold:0},
  {name:"Wood Stick",  atk_min:2,  atk_max:6,  gold:0},
  {name:"Iron Knife",  atk_min:3,  atk_max:8,  gold:50},
  {name:"Bronze Mace", atk_min:4,  atk_max:10, gold:200},
  {name:"Steel Sword", atk_min:5,  atk_max:12, gold:1000},
  {name:"War Hammer",  atk_min:6,  atk_max:14, gold:5000},
  {name:"Battle Axe",  atk_min:7,  atk_max:16, gold:20000},
  {name:"Great Sword", atk_min:8,  atk_max:18, gold:100000},
];

exports.armors = [
  {name:"No Armor",      def:0,  gold:0},
  {name:"Serf Rags",     def:2,  gold:0},
  {name:"Travel Cloak",  def:4,  gold:50},
  {name:"Hide Cuirass",  def:6,  gold:200},
  {name:"Rivet Leather", def:8,  gold:1000},
  {name:"Chain Maille",  def:10, gold:5000},
  {name:"Plate Armor",   def:12, gold:20000},
  {name:"Wyvern Scale",  def:14, gold:100000},
];

// Light, Freeze and Reflect have no effect in the original either
exports.spells = [
  {name:"No Spell", gold:0},
  {name:"Heal", gold:0},
  {name:"Burn", gold:100},
  {name:"Unlock", gold:500},
  {name:"Light", gold:2500},
  {name:"Freeze", gold:10000},
  {name:"Reflect", gold:50000},
];
