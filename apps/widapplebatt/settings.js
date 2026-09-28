(function(back) {
  const FILE = "widapplebatt.settings.json";
  // Load settings
  var settings = Object.assign({
    showPercent: true,
  }, require('Storage').readJSON(FILE, true) || {});

  function writeSettings() {
    require('Storage').writeJSON(FILE, settings);
  }


  // Show the menu
  E.showMenu({
    "" : { "title" : "Apple Battery" },
    "< Back" : () => back(),
    'Show Percent': {
      value: !!settings.showPercent,  // !! converts undefined to false
      onchange: v => {
        settings.showPercent = v;
        writeSettings();
        if(WIDGETS["applebatt"]) WIDGETS["applebatt"].reload()
        if(WIDGETS["applebatt"]) WIDGETS["applebatt"].draw()

      }
    }
  });
})