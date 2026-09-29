/**
 Dialog info for game shops
 set() fills ctx.dialog's three options for a shop, act() runs one
 */

// module imports
const avatar_m = require("heroine_avatar");
const config_m = require("heroine_config");
const feedback_m = require("heroine_feedback");
const items_m = require("heroine_items");

const SHOP_WEAPON = 0;
const SHOP_ARMOR = 1;
const SHOP_SPELL = 2;
const SHOP_ROOM = 3;
const SHOP_MESSAGE = 4;

const DIALOG_BUTTON_NONE = 0;
const DIALOG_BUTTON_BUY = 1;
const DIALOG_BUTTON_EXIT = 2;

const shops = [
  // Cedar Village Shops
  {name: "Cedar Arms", background: 3, item: [
    {type: SHOP_WEAPON, value: 2},
    {type: SHOP_WEAPON, value: 3}]},
  {name: "Simmons Fine Clothier", background: 3, item: [
    {type: SHOP_ARMOR, value: 2},
    {type: SHOP_ARMOR, value: 3}]},
  {name: "The Pilgrim Inn", background: 3, item: [
    {type: SHOP_MESSAGE, msg1: "We saw dead walking", msg2: "from the Canal Boneyard."},
    {type: SHOP_ROOM, value: 10}]},
  {name: "Sage Therel", background: 3, item: [
    {type: SHOP_MESSAGE, msg1: "Fire magic is effective", msg2: "against undead and bone."},
    {type: SHOP_SPELL, value: 2}]},
  {name: "Woodsman", background: 3, item: [
    undefined,
    {type: SHOP_MESSAGE, msg1: "I'm staying right here", msg2: "until the sun comes back."}]},
  {name: "Stonegate Entrance", background: 3, item: [
    {type: SHOP_MESSAGE, msg1: "No one allowed in or", msg2: "out of the city."},
    {type: SHOP_MESSAGE, msg1: "(The demo ends here.", msg2: "Thanks for playing!)"}]},
  {name: "Thomas the Fence", background: 3, item: [
    {type: SHOP_MESSAGE, msg1: "Unlock magic opens doors", msg2: "and harms automatons."},
    {type: SHOP_SPELL, value: 3}]},
  {name: "Thieves Guild", background: 3, item: [
    {type: SHOP_MESSAGE, msg1: "For a small fee we can", msg2: "sneak you to Stonegate."},
    {type: SHOP_MESSAGE, msg1: "(Support indie devs!", msg2: "Full version soon!)"}]},
  {name: "A Nightmare", background: 2, item: [
    {type: SHOP_MESSAGE, msg1: "Darkness has overtaken", msg2: "the human realm."},
    {type: SHOP_MESSAGE, msg1: "The monastery is no", msg2: "longer safe."}]},
];

//---- Set choice options for shops --------

function set_message(dialog, slot, msg1, msg2) {
  dialog.option[slot] = {button: DIALOG_BUTTON_NONE, msg1: msg1, msg2: msg2};
}

function set_buy(ctx, slot, name, cost, disable_reason) {
  const dialog = ctx.dialog;
  const option = {msg1: "Buy " + name};

  if (disable_reason != "") {
    option.msg2 = disable_reason;
  }
  else {
    option.msg2 = "for " + cost + " gold";
  }

  // display the dialog button if the item can be purchased
  var can_buy = true;
  if (ctx.avatar.gold < cost) can_buy = false;
  if (disable_reason != "") can_buy = false;

  option.button = can_buy ? DIALOG_BUTTON_BUY : DIALOG_BUTTON_NONE;
  dialog.option[slot] = option;

  // used to determine whether to display current gold
  dialog.items_for_sale = true;
}

function set_weapon(ctx, slot, weapon_id) {
  var disable_reason = "";
  if (weapon_id == ctx.avatar.weapon) disable_reason = "(You own this)";
  else if (weapon_id < ctx.avatar.weapon) disable_reason = "(Yours is better)";

  const weapon = items_m.weapons[weapon_id];
  set_buy(ctx, slot, weapon.name, weapon.gold, disable_reason);
}

function set_armor(ctx, slot, armor_id) {
  var disable_reason = "";
  if (armor_id == ctx.avatar.armor) disable_reason = "(You own this)";
  else if (armor_id < ctx.avatar.armor) disable_reason = "(Yours is better)";

  const armor = items_m.armors[armor_id];
  set_buy(ctx, slot, armor.name, armor.gold, disable_reason);
}

function set_spell(ctx, slot, spell_id) {
  var disable_reason = "";
  if (spell_id <= ctx.avatar.spellbook) disable_reason = "(You know this)";
  else if (spell_id > ctx.avatar.spellbook + 1) disable_reason = "(Too advanced)";

  const spell = items_m.spells[spell_id];
  set_buy(ctx, slot, "Spellbook: " + spell.name, spell.gold, disable_reason);
}

function set_room(ctx, slot, room_cost) {
  const avatar = ctx.avatar;
  var disable_reason = "";
  if (avatar.hp == avatar.max_hp && avatar.mp == avatar.max_mp) disable_reason = "(You are well rested)";
  set_buy(ctx, slot, "Room for the night", room_cost, disable_reason);
}

//---- Handle choices for shops --------

function bought(ctx, cost, message) {
  ctx.avatar.gold -= cost;
  feedback_m.play(ctx, "coin");
  ctx.dialog.message = message;
  exports.set(ctx, ctx.dialog.shop_id);
  // the original only saves on entering the shop
  avatar_m.save(ctx);
  ctx.redraw = true;
}

function buy_weapon(ctx, weapon_id) {
  const weapon = items_m.weapons[weapon_id];
  if (ctx.avatar.gold < weapon.gold) return;
  ctx.avatar.weapon = weapon_id;
  bought(ctx, weapon.gold, "Bought " + weapon.name);
}

function buy_armor(ctx, armor_id) {
  const armor = items_m.armors[armor_id];
  if (ctx.avatar.gold < armor.gold) return;
  ctx.avatar.armor = armor_id;
  bought(ctx, armor.gold, "Bought " + armor.name);
}

function buy_spell(ctx, spell_id) {
  const spell = items_m.spells[spell_id];
  if (ctx.avatar.gold < spell.gold) return;
  ctx.avatar.spellbook = spell_id;
  bought(ctx, spell.gold, "Learned " + spell.name);
}

function buy_room(ctx, cost) {
  if (ctx.avatar.gold < cost) return;
  avatar_m.sleep(ctx);
  bought(ctx, cost, "You have rested");
}

// exports

exports.DIALOG_BUTTON_NONE = DIALOG_BUTTON_NONE;
exports.DIALOG_BUTTON_BUY = DIALOG_BUTTON_BUY;
exports.DIALOG_BUTTON_EXIT = DIALOG_BUTTON_EXIT;

exports.background = function(shop_id) {
  return shops[shop_id].background;
};

exports.set = function(ctx, shop_id) {
  const dialog = ctx.dialog;
  const shop = shops[shop_id];

  dialog.shop_id = shop_id;
  dialog.title = shop.name;
  dialog.select = 2;
  dialog.items_for_sale = false;

  // most shops should use the exit button as the third option
  dialog.option[2] = {button: DIALOG_BUTTON_EXIT, msg1: "Exit", msg2: ""};

  // shops can have two items for purchase
  for (var i = 0; i <= 1; i++) {
    const item = shop.item[i];
    if (!item) {
      set_message(dialog, i, "", "");
    }
    else if (item.type == SHOP_WEAPON) {
      set_weapon(ctx, i, item.value);
    }
    else if (item.type == SHOP_ARMOR) {
      set_armor(ctx, i, item.value);
    }
    else if (item.type == SHOP_SPELL) {
      set_spell(ctx, i, item.value);
    }
    else if (item.type == SHOP_ROOM) {
      set_room(ctx, i, item.value);
    }
    else if (item.type == SHOP_MESSAGE) {
      set_message(dialog, i, item.msg1, item.msg2);
    }
  }
};

exports.act = function(ctx, slot) {
  if (slot == 2) {
    // exit
    feedback_m.play(ctx, "click");
    ctx.state = config_m.STATE_EXPLORE;
    ctx.redraw = true;
    return;
  }

  const item = shops[ctx.dialog.shop_id].item[slot];
  if (!item) return;
  if (item.type == SHOP_WEAPON) buy_weapon(ctx, item.value);
  else if (item.type == SHOP_ARMOR) buy_armor(ctx, item.value);
  else if (item.type == SHOP_SPELL) buy_spell(ctx, item.value);
  else if (item.type == SHOP_ROOM) buy_room(ctx, item.value);
};
