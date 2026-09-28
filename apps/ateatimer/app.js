{
// Tea Timer Application for Bangle.js 2 using sched library

"Bangle.loadWidgets()" // HACK: Trick launch_utils that we load widgets so we get a pass to be fastloaded into. We don't mind widgets here but have no use for them either.
if (global.WIDGETS) require("widget_utils").hide(); 

const APP_RECT = Bangle.appRect;
const CENTER_Y = APP_RECT.y+APP_RECT.h/2;
const CENTER_X = APP_RECT.x+APP_RECT.w/2;

let timerDuration = (() => {
  let file = require("Storage").open("ateatimer.data", "r");
  let data = file.read(4); // Assuming 4 bytes for storage
  return data ? parseInt(data, 10) : 4 * 60; // Default to 4 minutes
})();
let timeRemaining = timerDuration;
let timerRunning = false;

const saveDefaultDuration = function() {
  let file = require("Storage").open("ateatimer.data", "w");
  file.write(timerDuration.toString());
}

const drawTime = function() {
  const TIME_RECT = {x:APP_RECT.x, y:CENTER_Y-20, w:APP_RECT.w, h:40}
  g.clearRect(TIME_RECT);
  g.setFont("Vector", 40);
  g.setFontAlign(0, 0); // Center align

  const minutes = Math.floor(Math.abs(timeRemaining) / 60);
  const seconds = Math.abs(timeRemaining) % 60;
  const sign = timeRemaining < 0 ? "-" : "";
  const timeStr = `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`;

  g.drawString(timeStr, CENTER_X, CENTER_Y);

  g.flip();
}

const drawButtons = function() {

  const ADJUST_FOR_WIDGETS_Y = APP_RECT.y == 0 ? 0 : APP_RECT.y/4;
  // Draw Increase button (triangle pointing up)
  g.fillPoly([
    CENTER_X, CENTER_Y - 80 + ADJUST_FOR_WIDGETS_Y, // Top vertex
    CENTER_X - 20, CENTER_Y - 60 + ADJUST_FOR_WIDGETS_Y, // Bottom-left vertex
    CENTER_X + 20, CENTER_Y - 60 + ADJUST_FOR_WIDGETS_Y  // Bottom-right vertex
  ]);

  // Draw Decrease button (triangle pointing down)
  g.fillPoly([
    CENTER_X, CENTER_Y + 80 - ADJUST_FOR_WIDGETS_Y, // Bottom vertex
    CENTER_X - 20, CENTER_Y + 60 - ADJUST_FOR_WIDGETS_Y, // Top-left vertex
    CENTER_X + 20, CENTER_Y + 60 - ADJUST_FOR_WIDGETS_Y // Top-right vertex
  ]);

  g.flip();
}

const drawInit = function() {
  g.clear(true);
  drawButtons();
  drawTime();
}

let updateIntervalID;
let clearUpdateInterval = ()=>{
  if (updateIntervalID) clearInterval(updateIntervalID);
  updateIntervalID = undefined;
}

const startTimer = function() {
  if (timerRunning) return;
  if (timeRemaining == 0) return;
  timerRunning = true;

  // Save the default duration on timer start
  timerDuration = timeRemaining;
  saveDefaultDuration();
  scheduleTimer();

  // Flash the time in green to indicate the timer started
  const GREEN = g.theme.dark?0x07E0:0x03E0;
  g.setColor(GREEN);
  drawTime();
  g.reset();

  Bangle.buzz(50);

  // Start the secondary timer to update the display
  updateIntervalID = setInterval(updateDisplay, 1000);
}

const scheduleTimer = function() {
  // Schedule a new timer using the sched library
  require("sched").setAlarm("ateatimer", {
    msg: "Tea is ready!",
    timer: timeRemaining * 1000, // Convert to milliseconds
    vibrate: ".." // Default vibration pattern
  });

  // Ensure the scheduler updates
  require("sched").reload();
}

const resetTimer = function() {
  // Cancel the existing timer
  require("sched").setAlarm("ateatimer", undefined);
  require("sched").reload();

  clearUpdateInterval();
  timerRunning = false;
  timeRemaining = timerDuration;
  drawTime();
  Bangle.buzz(75);
}

let adjustTime = function(amount) {
  if (-amount > timeRemaining) {
    // Return if result will be negative
    return;
  }
  timeRemaining += amount;
  timeRemaining = Math.max(0, timeRemaining); // Ensure time doesn't go negative
  if (timerRunning) {
    // Update the existing timer with the new remaining time
    let alarm = require("sched").getAlarm("ateatimer");
    if (alarm) {
      // Cancel the current alarm
      require("sched").setAlarm("ateatimer", undefined);

      // Set a new alarm with the updated time
      scheduleTimer();
    }
  }

  drawTime();
}

let handleTouch = (_, xy)=>{((_, y)=>{
  if (y < CENTER_Y - 40) {
    // Increase button area
    adjustTime(60);
  } else if (y > CENTER_Y + 40) {
    // Decrease button area
    adjustTime(-60);
  } else {
    // Center area
    if (!timerRunning) {
      startTimer();
    }
  }
})(_, xy.y)}

let updateTimeRemaining = ()=>{
  let alarm = require("sched").getAlarm("ateatimer");
  timeRemaining = Math.floor(require("sched").getTimeToAlarm(alarm) / 1000);
}

// Function to update the display every second
const updateDisplay = function() {
  if (timerRunning) {
    updateTimeRemaining();
    drawTime();
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      clearUpdateInterval();
      timerRunning = false;
    }
  }
}

// Handle physical button press for resetting timer
const BTN_HANDLER = setWatch(() => {
  if (timerRunning) {
    resetTimer();
  } else {
    startTimer();
  }
}, BTN1, { repeat: true, edge: "falling" });

// Handle touch
Bangle.on("touch", handleTouch);

let isRunning = require("sched").getAlarm("ateatimer");
if (isRunning) {
  timerRunning = true;
  // Start the timer to update the display
  updateIntervalID = setInterval(updateDisplay, 1000);
  updateTimeRemaining();
}
// Draw the initial timer display
drawInit();
global.BACK = Bangle.load; // Compatibility with backswipe app.
Bangle.uiRemove = ()=>{ // Make it possible to fastload out of the app.
  Bangle.removeListener("touch", handleTouch);
  if (BTN_HANDLER) clearWatch(BTN_HANDLER);
  clearUpdateInterval();
  delete global.BACK;
  if (global.WIDGETS) require("widget_utils").show();
}
}
