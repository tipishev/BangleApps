// TODO add justify aka g.setFontAlign
exports.render = function(text, x, y) {
  text = text.toUpperCase();
  g.setFont("12x20")
    .setColor(0,0,0)
    .drawString(text, x-1, y)
    .drawString(text, x+1, y)
    .drawString(text, x, y-1)
    .drawString(text, x, y+1)
    .setColor(1,1,1)
    .drawString(text, x, y);
};
