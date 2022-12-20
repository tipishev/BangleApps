const bitmap = atob("FwgBAQEA+vr5tbWD68sW1tYNr6+AQEAIgIA=");

// TODO add justify aka g.setFontAlign
exports.render = function(text, x, y) {
  text = text.toUpperCase();
  print(`rendering ${text}`);
  g.setFontCustom(bitmap, 65, 14, 8)
    .setColor(1,1,1)
    .drawString(text, x, y);
};


// g.clear() && require("heroine_bitfont").render("ABC", 50, 50)
