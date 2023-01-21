const font_bg = E.toString([
0xff, 0x83, 0x83, 0xae, 0x83, 0x83, 0xff, // A
0xff, 0x83, 0x83, 0xab, 0x83, 0x93, 0xff, // B
0xff, 0x83, 0x83, 0xbb, 0xbb, 0xbb, 0xef // C
]);

const font_fg = E.toString([
0x0, 0x7c, 0x7c, 0x50, 0x7c, 0x7c, 0x0, // A
0x0, 0x7c, 0x7c, 0x54, 0x7c, 0x6c, 0x0, // B
0x0, 0x7c, 0x7c, 0x44, 0x44, 0x44, 0x0 // C
]);

//const bitmap = atob("FwgBAQEA+vr5tbWD68sW1tYNr6+AQEAIgIA=");



// TODO add justify aka g.setFontAlign
const SCALE = 5;
render = function(text, x, y) {
  text = text.toUpperCase();
  print(`rendering ${text}`);
  g.setFontCustom(font_bg, 65, "\7\7\6", 8|(SCALE<<8))
    .setColor(0,1,0)
    .drawString(text, x, y)
    .setFontCustom(font_fg, 65, "\7\7\6", 8|(SCALE<<8))
    .setColor(0,0,0)
    .drawString(text, x, y)
  ;
};


g.clear() && render("ABC", 20, 20)

/*
g.setFontCustom(atob("/b+f8bvdmd/m/9279VeI/z+/6q8="), 48, 4, 4|(32<<8));
*/
