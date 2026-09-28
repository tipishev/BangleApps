(function(back) {
  var FILE = "tennisscores.json";
  var TOURS = ["", "atp", "wta", "challenger", "itf", "juniors"];
  var TOUR_NAMES = [/*LANG*/"All", "ATP", "WTA", "Challenger", "ITF", "Juniors"];
  var settings;

  function readSettings() {
    settings = Object.assign({
      apikey: "",
      tour: "",
      auto: false,
      refresh: 15
    }, require("Storage").readJSON(FILE, true) || {});
  }

  function writeSettings(key, value) {
    var s = require("Storage").readJSON(FILE, true) || {};
    s[key] = value;
    require("Storage").writeJSON(FILE, s);
    readSettings();
  }

  readSettings();

  function buildMainMenu() {
    var mainmenu = {
      "": {"title": /*LANG*/"Tennis Scores"},
      "< Back": back,
      /*LANG*/"Tour": {
        value: Math.max(0, TOURS.indexOf(settings.tour)),
        min: 0,
        max: TOURS.length - 1,
        format: v => TOUR_NAMES[v],
        onchange: v => {
          writeSettings("tour", TOURS[v]);
        }
      },
      /*LANG*/"Auto refresh": {
        value: !!settings.auto,
        onchange: v => {
          writeSettings("auto", v);
        }
      },
      /*LANG*/"Refresh every": {
        value: settings.refresh,
        min: 5,
        max: 120,
        step: 5,
        format: v => v + "min",
        onchange: v => {
          writeSettings("refresh", v);
        }
      }
    };

    mainmenu[/*LANG*/"API key"] = function() {
      if (require("textinput")) {
        require("textinput").input({text: settings.apikey}).then(result => {
          if (result != "") {
            writeSettings("apikey", result);
          }
          E.showMenu(buildMainMenu());
        });
      } else {
        E.showAlert(/*LANG*/"Install a text input lib").then(() => {
          E.showMenu(buildMainMenu());
        });
      }
    };

    return mainmenu;
  }

  E.showMenu(buildMainMenu());
})
