/*

  Create Bangle.js2 application. Use black on white text, just a vector font.
  
  It should show the current date and time using a large Vector font, but it also communicates how trustworthy the displayed time is. The app maintains (or estimates) the current absolute time uncertainty in seconds. The uncertainty grows as time passes since the last time synchronization event, using a drift model (e.g., drift in PPM multiplied by elapsed time). The user can optionally update/adjust the drift and last-sync values through whatever sync workflow they use.

  It displays date, day of week and HH:MM, when unlocked, also :SS. As uncertainty rises, the app still attempts to render the time, but it applies mild distortion—small randomized jitter and a faint masked overlay—so the digits remain legible while clearly signaling reduced accuracy. Distortion / jitter increases with error.

  Touching bottom left half of screen should toggle second/ no seconds. Touching bottom right part of screen should turn on GPS, and synchronize time from gps (and set expected error to zero.)

To debug: print(new Date()); print(getNow());
*/

// Clear any existing watch/intervals
g.clear();

// --- Configuration & State ---
let lastSync = require("Storage").readJSON("truetime.json", 1) || {
  time: Date.now() - 24*60*60 * 1000,
  drift: 0/1000000,  // 32 .. should be good for my watch
  limit: 150/1000000,  // 100 .. Standard quartz drift (should be < 100 ppm even for cheap quartz)
};

let showSeconds = true;
let gpsActive = false;
let gpsSet = true;
let gpsTimeout;
let gpsCorr = 0;
let gpsTime = 0;

// Save sync data helper
function saveSyncData() {
  require("Storage").writeJSON("truetime.json", lastSync);
}

// Calculate current uncertainty in seconds
function getUncertainty() {
  let elapsedSeconds = (Date.now() - lastSync.time) / 1000;
  return elapsedSeconds * (lastSync.limit);
}

function getNow() {
  let now = new Date();
  let err = (now - lastSync.time) * lastSync.drift;
  return new Date(now-err);
}

// --- Drawing Helper with Jitter & Distortion ---
function drawDistortedText(text, x, y, size, uncertainty) {  
  g.setFont("Vector", size);
  g.setFontAlign(0, 0); // Centered
  let s = size * 0.55;
  let i;
  for (i=text.length-1; i>=0; i--) {
        let maxJitter = uncertainty * 0.5;
        if (maxJitter > 50)
          maxJitter = 50;
        uncertainty = uncertainty / 3;
        let jX = 0;
        let jY = 0;

        jX = (Math.random() - 0.5) * maxJitter;
        jY = (Math.random() - 0.5) * maxJitter;
    g.drawString(text[i], x + jX + i*s, y + jY);
  }
}

function drawTime(t, y, fontSize) {
    let n = new Date(t);
  
    let hours = ("0" + n.getHours()).slice(-2);
    let minutes = ("0" + n.getMinutes()).slice(-2);
    let seconds = ("0" + n.getSeconds()).slice(-2);
    let timeStr = hours + ":" + minutes + ":" + seconds;
    
    g.drawString(timeStr, 5, y);
}

function drawDebug() {
  // Black on White Theme
  g.setTheme({bg:1, fg:0});
  g.setColor(1, 1, 1);
  g.fillRect(0, 0, g.getWidth(), g.getHeight());

  let now = getNow();

  // 1. Draw Date & Day of Week
  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let dateStr = days[now.getDay()] + " " + now.getDay();
  let bat = E.getBattery();
  if (bat < 30)
    dateStr += " BAT";
  g.setFont("Vector", 28);
  g.setColor(0, 0, 0);
  g.setFontAlign(0, -1);
  dateStr = Math.round((Date.now() - lastSync.time) / (1000 * 3600)) + "h";
  g.drawString(dateStr, g.getWidth() / 2, 2);

  // 2. Build Time String
  let fontSize = 40;
  g.setFontAlign(-1, -1);
  g.setFont("Vector", fontSize);
  
  let y = 28;
  drawTime(now.getTime() + 0, y, fontSize);
  y += fontSize;
  
  drawTime(getNow() + 0, y, fontSize);
  y += fontSize;

  drawTime(new Date(gpsTime) + 0, y, fontSize);
  y += fontSize;

  g.setFont("Vector", 28);
  
  let statusText = "";
  if (gpsActive) {
    if (!gpsCorr)
      statusText += " GPS";
    else
      statusText = Math.round(gpsCorr * 1000000) + "ppm";
  }
  g.setFontAlign(-1, 1);
  g.drawString(statusText, 5, g.getHeight() - 2);
}

// --- Main Render Loop ---
function draw() {
  if (gpsActive && gpsCorr) {
    drawDebug();
    return;
  }
  // Black on White Theme
  g.setTheme({bg:1, fg:0});
  g.setColor(1, 1, 1);
  g.fillRect(0, 0, g.getWidth(), g.getHeight());

  let now = getNow();
  let uncertainty = getUncertainty();

  // 1. Draw Date & Day of Week
  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  //let dateStr = days[now.getDay()] + " " + require("locale").date(now, true);
  let dateStr = days[now.getDay()] + " " + now.getDay();
  let bat = E.getBattery();
  if (bat < 30)
    dateStr += " BAT";
  g.setFont("Vector", 28);
  g.setColor(0, 0, 0);
  g.setFontAlign(0, -1);
  g.drawString(dateStr, g.getWidth() / 2, 2);

  // 2. Build Time String
  let i;
  let num = 10;
  let isLocked = Bangle.isLocked();
  let ss = (showSeconds && !isLocked);
  let fontSize = 58;
  let xstart = 25;
  g.setFont("Vector", fontSize);

  for (i=0; i<num; i++) {
    let o = (Math.random()-0.5) * 2000 * uncertainty;
    if (0 && i==num-1)
      o = 0;
    let n = new Date(now.getTime() + o);
  
    let hours = ("0" + n.getHours()).slice(-2);
    let minutes = ("0" + n.getMinutes()).slice(-2);
    let timeStr = hours + ":" + minutes;
  
    // 3. Draw Main Time (with uncertainty distortion)
    if (i==num-1)
      g.setColor(0, 0, 0); // Black text
    else
      g.setColor(Math.random() * 0.8, Math.random() * 0.8, Math.random() * 0.8);
    drawDistortedText(timeStr, xstart, 35+fontSize / 2, fontSize, uncertainty/10);
    
    if (ss) {
      let seconds = ("0" + n.getSeconds()).slice(-2);
      timeStr = "" + seconds;
      drawDistortedText(timeStr, 130, 27+1.5*fontSize, fontSize-10, uncertainty);
    }
  }

  // 4. Draw Status Area (Uncertainty & GPS status)
  fontSize = 28;
  g.setFont("Vector", fontSize);
  g.setFontAlign(-1, -1);
  g.setColor(0, 0, 0);

  let statusText = "±" + uncertainty.toFixed(2) + "s";
  if (gpsActive) {
    if (!gpsCorr)
      statusText += " GPS";
    else
      statusText = Math.round(gpsCorr * 1000000) + "ppm";
  }
  g.drawString(statusText, 5, g.getHeight() - 2 - fontSize);
  
  //let step = Bangle.getStepCount();
  let step = Bangle.getHealthStatus("day").steps;
  let s;
  let dist = step*0.179*0.001;
  if (dist > 0.5) {
    s = dist.toFixed(3) + "";
    if (!ss)
      s = dist.toFixed(3) + " km";
    g.drawString(s, 5, g.getHeight() - 2 - fontSize*2);
  }

  if (bat < 65) {
    s = bat + "%";
    g.drawString(s, 5, g.getHeight() - 2 - fontSize*3);
  }
}

// --- GPS Synchronization ---
function startGPSSync() {
  if (gpsActive) return;
  gpsTime = 0;
  gpsActive = true;
  Bangle.buzz(100); // Haptic feedback initiating sync
  
  Bangle.setGPSPower(1, "app");
  
  // Auto-disable GPS after 30 seconds if no lock is found to save battery
  gpsTimeout = setTimeout(function() {
    stopGPSSync(false);
  }, 30000);
}

function stopGPSSync(success) {
  gpsActive = false;
  Bangle.setGPSPower(0, "app");
  if (gpsTimeout) clearTimeout(gpsTimeout);
  
  if (success) {
    Bangle.buzz(500); // Long buzz for success
  } else {
    // Short double-buzz for timeout failure
    Bangle.buzz(100).then(() => {
      setTimeout(() => Bangle.buzz(100), 100);
    });
  }
}

// Listen to GPS events
Bangle.on('GPS', function(gps) {
  if (gps.time) {
    if (!gpsSet) {
      let now = Date.now();
      gpsTime = gps.time.getTime();
      gpsCorr = (now - gps.time.getTime()) / (now - lastSync.time);
      return;
    }
    // Update system time with GPS time
    setTime(gps.time.getTime() / 1000);
    
    // Reset uncertainty tracking
    lastSync.time = Date.now();
    saveSyncData();
    
    stopGPSSync(true);
  }
});

// --- Touch Handling ---
Bangle.on('touch', function(button, xy) {
  let yLimit = g.getHeight() / 2; // Bottom active zone
  if (xy.y > yLimit) {
    if (xy.x < g.getWidth() / 2) {
      // Bottom Left: Toggle Seconds
      showSeconds = !showSeconds;
    } else {
      // Bottom Right: GPS Sync
      gpsSet = true;
      startGPSSync();
    }
    draw();
  } else {
    if (xy.x >= g.getWidth() / 2) {
      gpsSet = false;
      startGPSSync();
    } else {
      lastSync.time = Date.now() - 24*60*60 * 1000;
    }
  }
  Bangle.buzz(50);
  draw();
});

// --- Lifecycle Event Handlers ---
// Refresh screen every second when unlocked, or every minute when locked
let interval;
function setupRefreshInterval() {
  if (interval) clearInterval(interval);
  let rate = Bangle.isLocked() ? 60000 : 1000;
  interval = setInterval(draw, rate);
  draw();
}

Bangle.on('lock', setupRefreshInterval);

// Initial setup
setupRefreshInterval();


