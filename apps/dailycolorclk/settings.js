(function(back) {
  const SETTINGS_FILE = "dailycolorclk.json";
  const storage = require('Storage');
  let settings = Object.assign(
      require("Storage").readJSON(SETTINGS_FILE, true) || {}
  );

  if (!settings.bgColors) settings.bgColors = ["#0F0", "#FF0", "#F00", "#0FF"];

  function writeSettings() {
    storage.write(SETTINGS_FILE, settings);
  }


  function showMainMenu() {
    let menu = {
      '': { 'title': 'Daily Color Clock' },
      /*LANG*/'< Back': back,
      /*LANG*/'Hide Widgets': {
        value: !!settings.hideWidgets,
        onchange: x => {
          settings.hideWidgets = x;
          writeSettings();
        },
      },
      /*LANG*/'Regenerate Queue': function () {
        E.showPrompt("Are you sure you want to regenerate queue?",{title:"Confirm",buttons:{ "Yes":true,"Cancel":false}}).then(function(v){
          if(v===true){
            settings.regenerate = true;
            writeSettings();
            E.showAlert("Regenerated Queue!", "Success")
              .then(function (v) {
                eval(require("Storage").read("dailycolorclk.settings.js"))(() => load());
              })     
            }else{
              eval(require("Storage").read("dailycolorclk.settings.js"))(() => load());   
            }

        })
      },
      /*LANG*/'Colors': () => { 
        require("colorpicker").show({
          onSelect : function (colors) {
            if (!colors || !colors.length) return; // don't allow saving an empty palette
            settings.bgColors = colors;
            writeSettings();
          },
          startingSelection:settings.bgColors,
          colors:[
            "#F00",
            "#FF0",
            "#0F0",
            "#00F",
            "#0FF",
            "#F0F",
            "#000",
            "#FFF",
            "#FC6A03",
            "#B200ED",
            "#ff7a7a",
            "#ff00ff",
            "#9dff00",
            "#0091ff",
            "#00ff91",
            "#a80000",
            "#a85100",
            "#FFAA00",
            "#888888",
            "#00AAAA",
            "#FF5555",
            "#AFAA00",
            "#5555FF",
            "#AA00AA",
            "#550000",
            "#005500",
            "#000055",
            "#550055",
            "#005555"
          ],
         
          
          multiSelect:true,
          showPreview:true,
          back:function(){
            E.showMenu(menu);
          }

        });
      },
    };
    
    E.showMenu(menu);
  }


  showMainMenu();
})
