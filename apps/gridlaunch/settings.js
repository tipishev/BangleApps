(function(back) {
  let settings = Object.assign({
    showClocks:false,showLaunchers:false, showWidgets:true
  },require("Storage").readJSON("gridlaunch.settings.json")||{});


  function save() {
    require("Storage").write("gridlaunch.settings.json",settings);
  }
  const appMenu = {
    "": { "title": /*LANG*/"Grid Launch" },
    /*LANG*/"< Back": back,
    /*LANG*/"Show Clocks": {
      value: !!settings.showClocks,
      onchange: (m) => {
        settings.showClocks=m;
        save();
        require("launch_utils").clearCache();
      }
    },
    /*LANG*/"Show Launchers": {
      value: !!settings.showLaunchers,
      onchange: (m) => {
        settings.showLaunchers=m;
        save();
        require("launch_utils").clearCache();
      }
    },
    /*LANG*/"Show Widgets": {
      value: !!settings.showWidgets,
      onchange: (m) => {
        settings.showWidgets=m;
        save();
      }
    }
  };
  E.showMenu(appMenu);
})