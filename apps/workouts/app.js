//override E.showMenu for easily-tappable larger entries:
E.showMenu = function (menu) {
  const H = 60;
  if (menu === undefined) {
    g.clearRect(Bangle.appRect);
    return Bangle.setUI();
  }
  var menuIcon =
    "\0\f\f\x81\0\xFF\xFF\xFF\0\0\0\0\x0F\xFF\xFF\xF0\0\0\0\0\xFF\xFF\xFF";
  var options = menu[""] || {};
  if (!options.title) options.title = "Menu";
  var back = options.back || menu["< Back"];
  var keys = Object.keys(menu).filter((k) => k !== "" && k != "< Back");
  keys.forEach((k) => {
    var item = menu[k];
    if ("object" != typeof item) return;
    if ("boolean" == typeof item.value && !item.format)
      item.format = (v) =>
        "\0" +
        atob(
          v
            ? "EhKBAH//v/////////////5//x//j//H+eP+Mf/A//h//z//////////3//g"
            : "EhKBAH//v//8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA8AA///3//g"
        );
  });
  // Submenu for editing menu options...
  function showSubMenu(item, title) {
    /*if ("number"!=typeof item.value)
      return console.log("Unhandled item type");*/
    var step = item.step || 1;
    if (
      !item.noList &&
      item.min !== undefined &&
      item.max !== undefined &&
      (item.max - item.min) / step < 20
    ) {
      // show scrolling menu of options
      var scroller = E.showScroller({
        h: H,
        c: (item.max + step - item.min) / step,
        back: show, // redraw original menu
        remove: options.remove,
        scrollMin: -24,
        scroll: -24, // title is 24px, rendered at -1
        draw: (idx, r) => {
          if (idx < 0) {
            // TITLE
            var titleText = g.findFont(menuIcon + " " + title, {
              w: g.getWidth() - 2,
              h: 24,
              max: 24
            });
            return g
              .setFontAlign(-1, 0)
              .drawString(titleText.text, r.x + 12, r.y + H - 12);
          }
          g.setColor(g.theme.bg2).fillRect({
            x: r.x + 4,
            y: r.y + 2,
            w: r.w - 8,
            h: r.h - 4,
            r: 5
          });
          var v = idx * step + item.min,
            txt = item.format ? item.format(v, 1) : v;
          var itemText = g.findFont(txt, { w: r.w, h: r.h, wrap: 1, trim: 1 });
          g.setColor(g.theme.fg2)
            .setFontAlign(-1, 0)
            .drawString(itemText.text, r.x + 12, r.y + H / 2);
          g.drawImage(
            /* 20x20 */ atob(
              v == item.value
                ? "FBSBAAH4AH/gHgeDgBww8MY/xmf+bH/jz/88//PP/zz/88f+Nn/mY/xjDww4AcHgeAf+AB+A"
                : "FBSBAAH4AH/gHgeDgBwwAMYABmAAbAADwAA8AAPAADwAA8AANgAGYABjAAw4AcHgeAf+AB+A"
            ),
            r.x + r.w - 32,
            r.y + H / 2 - 10
          );
        },
        select: function (idx) {
          if (idx < 0) return; // TITLE
          Bangle.buzz(20);
          item.value = item.min + idx * step;
          if (item.onchange) item.onchange(item.value);
          if (scroller.isActive()) {
            // onchange may have changed menu!
            scr.scroll = l.scroller.scroll; // set scroll to prev position
            show(); // redraw original menu
          }
        }
      });
    } else {
      // show simple box for scroll up/down
      var R = Bangle.appRect;
      var v = item.value;
      g.reset().clearRect(R);
      g.setFont("12x20")
        .setFontAlign(0, 0)
        .drawString(menuIcon + " " + title, R.x + R.w / 2, R.y + 12);

      function draw() {
        var mx = R.x + R.w / 2,
          my = 12 + R.y + R.h / 2,
          txt = item.format ? item.format(v, 2) : v;
       // ,s = 30;
        g.reset()
          .setColor(g.theme.bg2)
          .fillRect({
            x: R.x + 24,
            y: R.y + 36,
            w: R.w - 48,
            h: R.h - 48,
            r: 5
          });
        g.setColor(g.theme.fg2)
          .setFontVector(
            Math.min(
              30,
              ((R.w - 52) * 100) / g.setFontVector(100).stringWidth(txt)
            )
          )
          .setFontAlign(0, 0)
          .drawString(txt, mx, my);
        g.fillPoly([mx, my - 45, mx + 15, my - 30, mx - 15, my - 30]).fillPoly([
          mx,
          my + 45,
          mx + 15,
          my + 30,
          mx - 15,
          my + 30
        ]);
      }
      function cb(dir) {
        if (dir) {
          v -= (dir || 1) * (item.step || 1);
          if (item.min !== undefined && v < item.min)
            v = item.wrap ? item.max : item.min;
          if (item.max !== undefined && v > item.max)
            v = item.wrap ? item.min : item.max;
          draw();
        } else {
          // actually selected
          item.value = v;
          if (item.onchange) item.onchange(item.value);
          if (Bangle.uiRedraw == draw) {
            // onchange may have changed menu!
            scr.scroll = l.scroller.scroll; // set scroll to prev position
            show(); // redraw original menu
          }
        }
      }
      draw();
      var dy = 0;
      Bangle.setUI({
        mode: "custom",
        back: show,
        remove: options.remove,
        redraw: draw,
        drag: (e) => {
          dy += e.dy; // after a certain amount of dragging up/down fire cb
          if (!e.b) dy = 0;
          while (Math.abs(dy) > 32) {
            if (dy > 0) {
              dy -= 32;
              cb(1);
            } else {
              dy += 32;
              cb(-1);
            }
            Bangle.buzz(20);
          }
        },
        touch: (_, e) => {
          Bangle.buzz(20);
          if (e.y < 82)
            cb(-1); // top third
          else if (e.y > 142)
            cb(1); // bottom third
          else cb(); // middle = accept
        }
      });
    }
  }
  var l = {
    draw: () => l.scroller.draw(),
    scroller: undefined
  };
  var scr = {
    h: H,
    c: keys.length /*title*/,
    scrollMin: -24,
    scroll: options.scroll ?? -24, // title is 24px, rendered at -1
    back: back,
    remove: options.remove,
    draw: (idx, r) => {
      g.setFontAlign(-1, 0);
      if (idx < 0)
        // TITLE
        return g.drawString(
          g.findFont(menuIcon + " " + options.title, { w: r.w, h: 24, max: 24 })
            .text,
          r.x + 12,
          r.y + H - 10
        );
      g.setColor(g.theme.bg2)
        .fillRect({ x: r.x + 4, y: r.y + 2, w: r.w - 8, h: r.h - 4, r: 5 })
        .setColor(g.theme.fg2);
      var item = menu[keys[idx]],
        pad = 16;
      if ("object" == typeof item) {
        var v = item.value;
        if (item.format) v = item.format(v);
        if (v !== undefined) {
          var val = g.findFont(v, { w: r.w / 2, h: r.h, wrap: 1, trim: 1 });
          g.setFontAlign(1, 0).drawString(
            val.text,
            r.x + r.w - 8,
            2 + r.y + H / 2
          );
          pad += g.stringWidth(val.text);
        }
      } else if ("function" == typeof item) {
        g.drawImage(
          /* 9x18 */ atob("CRKBAGA4Hg8DwPB4HgcDg8PB4eHg8HAwAA=="),
          r.x + r.w - 21,
          r.y + H / 2 - 9
        );
        pad += 16;
      }
      g.setFontAlign(-1, 0).drawString(
        g.findFont((item && item.title) ?? keys[idx], {
          w: r.w - pad,
          h: r.h,
          wrap: 1,
          trim: 1
        }).text,
        r.x + 8,
        2 + r.y + H / 2
      );
    },
    select: function (idx, touch) {
      if (idx < 0) return back && back(); // title
      var item = menu[keys[idx]];
      Bangle.buzz(20);
      if ("function" == typeof item) item(touch);
      else if ("object" == typeof item) {
        if ("number" == typeof item.value) {
          showSubMenu(item, keys[idx]);
        } else {
          // if a bool, just toggle it
          if ("boolean" == typeof item.value) item.value = !item.value;
          if (item.onchange) item.onchange(item.value, touch);
          if (l.scroller.isActive()) l.scroller.drawItem(idx);
        }
      }
    }
  };
  function show() {
    l.scroller = E.showScroller(scr);
  }
  show();
  return l;
};

let activities = [
  {
    name: /*LANG*/ "Bike Ride",
    hrmSportMode: 2,
    icon: require("heatshrink").decompress(
      atob(
        "mUywIsph4FEg/gAocD/gME/4FEn/ACIfv+AFD/v4AoUB/88AogXDEYIRDgF/FQkf/I9Dh/4n0MIQcH/YMC/waBwAkC8EHFgU/KoNgMIX//5KCgO//l4DwXP/8eHgXh9/k/+An/4vnzv/wjkPj993kOh0C8/fruB48Bzv390gnOA4d9/cMg3gkHf/nBgPwjE/79wsE8h5DBzEIh6BB//GgUDLAP+gIDBQoM3wEwgF2gEM4B7BjPAgxfBwEOnEDPINwg8HEAUPBIKBBWAcPT4UfWwgAhA="
      )
    )
  },
  {
    name: /*LANG*/ "Free Training",
    hrmSportMode: 25,
    icon: require("heatshrink").decompress(
      atob(
        "mUywIMJuAFEv4FEn/AAocP/AFDg/+AocB/+ADwngDBMB/grEnxWQGIsD/5EDAoIrDHoP/HogSEn4SEh9/EocHz/zCQUB8/8CQd5/8fAoU8v/DMgUPj/wvg9Cw/8h4SC8P/gIlCmF/SogYBLoh8Fv6VEs4SEjgSEKIISDgPzCQl4IYShCh4SDh+DXYcH4ASDgPwNIcA/ANBYAh8DCALIDCAIrDgfgEAIeDgArDng5BHoYUBVAYcBsDlHA"
      )
    )
  },
  {
    name: /*LANG*/ "Walk",
    hrmSportMode: 9,
    icon: require("heatshrink").decompress(
      atob(
        "mUywIMJuAFEv4FEn/AAocP/AFDg/+AocB/+ADwngDBMB/grEnxWQGIsD/5EDAoIrDHoP/HogSEn4SEh9/EocHz/zCQUB8/8CQd5/8fAoU8v/DMgUPj/wvg9Cw/8h4SC8P/gIlCmF/SogYBLoh8Fv6VEs4SEjgSEKIISDgPzCQl4IYShCh4SDh+DXYcH4ASDgPwNIcA/ANBYAh8DCALIDCAIrDgfgEAIeDgArDng5BHoYUBVAYcBsDlHA"
      )
    )
  },
  {
    name: /*LANG*/ "Outdoor Run",
    hrmSportMode: 1,
    icon: require("heatshrink").decompress(
      atob(
        "mUywI52h+AAocH+AFDgf+BwP4gHA/+Agf/gP4n/gCAMB/+P/PAAoX5/gfC///n1+AoN/7/yn4FBj/B/0fw//8/Av+P4P/GIM/74rCCYP3IgcP/YPBJIX8/gFCgP+h0AgkQHAJZEv5oCv4kBJwIACi4jDgEMNAIqDz42DgPzEoQAB/h1DgF+gYfDMwJDDj+AnxVD4EfUofgA4IqC/AHBFQcDG4aRBFQYcBTIQeBwCZCAAPAaQsBNIkAkD/eAAQA=="
      )
    )
  },
  {
    name: /*LANG*/ "Indoor Run",
    hrmSportMode: 21,
    icon: require("heatshrink").decompress(
      atob(
        "mUywI52h+AAocH+AFDgf+BwP4gHA/+Agf/gP4n/gCAMB/+P/PAAoX5/gfC///n1+AoN/7/yn4FBj/B/0fw//8/Av+P4P/GIM/74rCCYP3IgcP/YPBJIX8/gFCgP+h0AgkQHAJZEv5oCv4kBJwIACi4jDgEMNAIqDz42DgPzEoQAB/h1DgF+gYfDMwJDDj+AnxVD4EfUofgA4IqC/AHBFQcDG4aRBFQYcBTIQeBwCZCAAPAaQsBNIkAkD/eAAQA=="
      )
    )
  },
  {
    name: /*LANG*/ "Tennis",
    hrmSportMode: 7,
    icon: require("heatshrink").decompress(
      atob(
        "mUywIFCvALEn4FEjFgAocMjAFDgUCBwIFBgOAwEHBgVgsAIBDwQYEgcMFYn+HAk/n+AGYUOh/gngFBg8H/kPGIWB/8HFYXAv+B8AFBuAYB/A3CgPx/gFBDYMD/4eC8E//4eCn3/AocHAoJEDAoPAAoUf//wLocPFQQGCDAgZBDAZkBDAY/BDAkBG4YABv5cCGQRcCIoX+DC5EEJQJEE/oSEn8+JQmPFYcH8IrDgP4DAl8DAkfh4YDh+DGIcD8B2E/F8Aoc8j43EbIYYBwAeC"
      )
    )
  }
];

let avgBPM = 0;
let caloricAvgBPM = 0;
let caloricBPMCt = 0;
let caloricSteps = 0;
let bpmCount = 0;
let caloriesBurned = 0;
let caloriesInterval;
var Layout = require("Layout");
let chosenActivity = {};
let isPaused = false;
let drawInterval;
let bpmDrawListener;
let stepDrawListener;
let currentBPM = "--";
let stepsWhenStarted;
let activityOngoing = false;
let myProfile = require("Storage").readJSON("myprofile.json", 1)
let maxBPM = 0;
let secondsElapsed = 0;
var activityMenu = {
  "": { title: "Start New Activity" } // options
};
activities.forEach((activity, i) => {
  activityMenu[activity.name] = function () {
    activityOnboarding(activity);
  };
});
function stopHandler() {
  Bangle.setOptions({ hrmSportMode: -1 });
  if (drawInterval) {
    clearInterval(drawInterval);
    drawInterval = undefined;
  }
  if (caloriesInterval) {
    clearInterval(caloriesInterval);
    caloriesInterval = undefined;
  }
  if (stepDrawListener) {
    Bangle.removeListener("step", stepDrawListener);
    stepDrawListener = undefined;
  }
  if (bpmDrawListener) {
    Bangle.removeListener("HRM", bpmDrawListener);
    bpmDrawListener = undefined;
  }
  Bangle.setHRMPower(false, "workouts");
}
// initializes drawing and listeners
function startHandler() {
  Bangle.setOptions({ hrmSportMode: chosenActivity.hrmSportMode });
  Bangle.setHRMPower(true, "workouts");
  stepDrawListener = function () {
    caloricSteps += 1;
  };
  Bangle.on("step", stepDrawListener);

  bpmDrawListener = function (hrm) {
    if (hrm.confidence > 50 && activityOngoing && hrm.bpm != 0) {
      if (hrm.bpm > maxBPM) maxBPM = hrm.bpm;
      currentBPM = hrm.bpm;
      bpmCount++;
      caloricBPMCt++;
      caloricAvgBPM += currentBPM;
      avgBPM += currentBPM;
    }
  };
  Bangle.on("HRM", bpmDrawListener);
  if(global.calories){
    caloriesInterval = setInterval(function () {
      var avgBPM = caloricAvgBPM / caloricBPMCt;
      var steps = caloricSteps;

      caloricSteps = 0;
      caloricAvgBPM = 0;
      if (caloricBPMCt > 0 && avgBPM > 0 && steps > 0) {
        caloriesBurned += require("calories").calcCalories(
          { duration: 1, steps: steps, bpm: avgBPM },
          myProfile
        ).activeCalories;
      }
      caloricBPMCt = 0;
    }, 1000 * 60); // every minute update calories
  }
  drawInterval = setInterval(function () {
    secondsElapsed++;
    drawActivity();
  }, 1000);
}

function endActivity() {
  Bangle.buzz(200);
  stopHandler();

  avgBPM = Math.round(avgBPM / bpmCount);
  E.showPrompt(" ",{
    buttons:{"Back":true},
    buttonHeight:40
  }).then((v) => {
    g.clear()
    E.showMenu(activityMenu);
  })

  g.clearRect(0,0,g.getWidth(),g.getHeight()-42)
  g.setFont("Vector", 20)
    .setFontAlign(0, 0)
    .drawString(chosenActivity.name, g.getWidth() / 2, 25-6)
.setFont("Vector", 18)
    .drawString(`Avg BPM: ${avgBPM}`, g.getWidth() / 2, 60-6)
    .drawString(`Time: ${getElapsedTime()}`, g.getWidth() / 2, 85-6*2)
    .drawString(`Max HR: ${maxBPM}`, g.getWidth() / 2, 110-6*3)
    .drawString(`Cals: ${caloriesBurned}`, g.getWidth() / 2, 135-6*4);
}

function pauseHandler() {
  Bangle.buzz(120);
  isPaused = !isPaused;
  if (isPaused) {
    stopHandler();
  } else {
    startHandler();
  }
  drawActivity();
}

function renderDivider(l) {
  g.drawLine(0, l.y + l.h / 2, g.getWidth(), l.y + l.h / 2);
}

var activityLayout = new Layout(
  {
    type: "v",
    c: [
      { type: "", pad: 5 },
      { type: "", filly: 2 },

      {
        type: "h",
        c: [
          { type: "", pad: 5 },
          {
            type: "h",
            c: [
              {
                type: "img",
                src: atob(
                  "GBiBAAcAAA+AAA/AAA/AAB/AAB/gAA/g4A/h8A/j8A/D8A/D+AfH+AAH8AHn8APj8APj8AHj4AHg4AADAAAHwAAHwAAHgAAHgAADAA=="
                ),
                scale: 1
              },
              { type: "", pad: 4 },
              { type: "txt", font: "12%", label: "382", id: "steps" }
            ]
          },
          { type: "", fillx: 1 },
          {
            type: "h",
            c: [
              { type: "txt", font: "12%", label: "92", id: "calories" },
              {
                type: "img",
                src: atob(
                  "GBiBAAAAAAAAAAAAAAAAAAAQAAAQAAAYAAA8AAA+AAB+AAD+AAH+AAH+AAP+QAP+wAf/wAf/wAf/wAP/wAP/gAH/gAH/AAB8AAAAAA=="
                ),
                scale: 1
              }
            ]
          },
          { type: "", pad: 5 }
        ]
      },
      { type: "custom", render: renderDivider, pad: 5 },
      { type: "", pad: 5 },
      {
        type: "h",
        c: [
          { type: "txt", font: "20%", label: "95", id: "bpm" },
          { type: "", pad: 4 },
          {
            type: "img",
            src: atob(
              "Mi2BAAAAAAAAAAAP4AAf4AAf/wAf/gAP/+Af/+AH//wP//wD//+H//+B///z///w///+///8P///////n///////5///////+f///////3///////9////////f///////3///////9////////f///////j///////4///////+P///////B///////wf//////4D//////+Af//////AH//////gA//////4AH/////8AA/////+AAH/////AAB/////gAAP////wAAA////4AAAH///8AAAA///+AAAAH///AAAAA///AAAAAH//gAAAAAf/wAAAAAD/4AAAAAAf4AAAAAAB8AAAAAAAOAAAAAAAAAAAAAAAAAAAAAA=="
            ),
            scale: 0.75,
            col: "#f00"
          }
        ]
      },
      { type: "", pad: 5 },
      {
        type: "h",
        c: [
          {
            type: "img",
            src: atob(
              "MDCBAAAAAAAAAAAAD/AAAAAAD/gAAAAAH/gAAAAAD/gAAAAAD/AAAAAAB+BgAAAAB/DwAAAAP/34AAAA///4AAAD///4AAAH///wAAAP8A/wAAAfwAP4AAA/gAH8AAA+AAB8AAB+AAB+AAB/gAA+AAD74AAfAAD5+AAfAAD4/gAPAADwP8APgAHwH+APgADwD+APgADwB+APgAHwB+APgADwAcAPgAD4AAAPAAD4AAAfAAD4AAAfAAB8AAA+AAB+AAB+AAA/AAD8AAA/gAH8AAAfwAP4AAAP+B/wAAAH///gAAAD///AAAAA//8AAAAAP/wAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
            ),
            scale: 0.7
          },
          { type: "", pad: 3 },
          { type: "txt", font: "15%", label: "1:30", id: "timeElapsed" }
        ]
      },
      { type: "", filly: true },
      {
        type: "h",
        c: [
          {
            type: "btn",
            src: atob(
              "MDCBAAAAAAAAAAAAAAAAAAf/////4Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////8Af/////4AAAAAAAAAAAAAAAAA=="
            ),
            scale: 0.5,
            id: "endBtn",
            cb: function () {
              endActivity();
            },
            fillx: true
          },
          {
            type: "btn",
            src: atob(
              "MDCBAAAAAAAAAAAAAAAAAAf/8A//4Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//4AAAAAAAAAAAAAAAAA=="
            ),
            scale: 0.5,
            id: "pausePlayBtn",
            cb: function () {
              pauseHandler();
            },
            fillx: true
          }
        ]
      }
    ]
  },
  { lazy: true }
);

const getElapsedTime = () =>
  new Date(secondsElapsed * 1000).toISOString().slice(11, 19);

function drawActivity(forceRefresh) {
  activityLayout.steps.label = Bangle.getStepCount() - stepsWhenStarted;
  activityLayout.timeElapsed.label = getElapsedTime();
  activityLayout.bpm.label = currentBPM;
  activityLayout.calories.label = caloriesBurned;
  if (isPaused)
    activityLayout.pausePlayBtn.src = atob(
      "MDCBAAAAAAAAAAAAAAAAAAYAAAAAAAeAAAAAAAfAAAAAAAfwAAAAAAf8AAAAAAf/AAAAAAf/gAAAAAf/4AAAAAf/+AAAAAf//gAAAAf//wAAAAf//8AAAAf///AAAAf///gAAAf///4AAAf///+AAAf////gAAf////wAAf////8AAf/////AAf/////wAf/////4Af/////4Af/////gAf/////AAf////8AAf////wAAf////gAAf///+AAAf///4AAAf///gAAAf///AAAAf//8AAAAf//wAAAAf//AAAAAf/+AAAAAf/4AAAAAf/gAAAAAf+AAAAAAf8AAAAAAfwAAAAAAfAAAAAAAeAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAA=="
    );
  else
    activityLayout.pausePlayBtn.src = atob(
      "MDCBAAAAAAAAAAAAAAAAAAf/8A//4Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//8Af/8A//4AAAAAAAAAAAAAAAAA=="
    );
  if(forceRefresh) activityLayout.forgetLazyState()
  activityLayout.update();
  activityLayout.render();
}

function startActivity(activity) {
  chosenActivity = activity;

  activityLayout.setUI();
  stepsWhenStarted = Bangle.getStepCount();
  activityOngoing = true;
  startHandler();
  g.clear();
  drawActivity(true);
}

function activityOnboarding(activity) {
  E.showPrompt("Start " + activity.name + "?", {
    buttons: { Start: true, Cancel: false },
    buttonHeight: 50,
    img: activity.icon
  }).then(function (v) {
    if (v) {
      Bangle.buzz(200);
      startActivity(activity);
    } else {
      E.showMenu(activityMenu);
    }
  });
}

E.showMenu(activityMenu);

E.on("kill", function () {
  //reinstate sport mode to default
  Bangle.setOptions({ hrmSportMode: -1 });
});
