/*
  Maze clock

  Create Bangle.js2 application. Use black on white text.

  Digits should be drawn using rectangles, as in 7-digit calculator. Digits should be on top of each other, with further digits smaller. Display just HHMM.

  On display touch, display HH:MM using big vector font, then SS, then date for 10 seconds.

*/

// Clear any existing watches or intervals
g.clear();
//Bangle.setUI({}); // Clear default UI behaviors

// State variables
let detailedViewTimeout = null;
let isDetailedView = false;

// 7-segment mapping for digits 0-9
// Segments: 0=top, 1=top-left, 2=top-right, 3=middle, 4=bottom-left, 5=bottom-right, 6=bottom
const segments = [
  0b01110111, // 0
  0b00100100, // 1
  0b01101011, // 2
  0b01101101, // 3
  0b00111100, // 4
  0b01011101, // 5
  0b01011111, // 6
  0b01100100, // 7
  0b01111111, // 8
  0b01111101  // 9
];

function color(i) {
  if (i)
    g.setColor(0, 0, 0); // Black text
  else
    g.setColor(1, 1, 1);
    
  
}

// Draw a single 7-segment digit using rectangles
function drawDigit(digit, x, y, w, h, thickness) {
  const mask = segments[digit];
  const midY = y + h / 2;
  

  // 0: Top
  color(mask & 0b01000000); g.fillRect(x, y, x + w, y + thickness);
  // 3: Middle
  color(mask & 0b00001000); g.fillRect(x, midY - thickness/2, x + w, midY + thickness/2);
  // 6: Bottom
  color (mask & 0b00000001); g.fillRect(x, y + h - thickness, x + w, y + h);
  // 1: Top-Left
  color(mask & 0b00010000); g.fillRect(x, y, x + thickness, midY);
  // 2: Top-Right
  color(mask & 0b00100000); g.fillRect(x + w - thickness, y, x + w, midY);
  // 4: Bottom-Left
  color (mask & 0b00000010); g.fillRect(x, midY, x + thickness, y + h);
  // 5: Bottom-Right
  color (mask & 0b00000100); g.fillRect(x + w - thickness, midY, x + w, y + h);
}

// Main draw loop
function draw() {
  // Clear screen to white
  g.setTheme({bg:1, fg:0});
  g.clear();

  const now = new Date();
  
  if (isDetailedView) {
    // Detailed View: HH:MM, SS, Date
    const hours = ("0" + now.getHours()).slice(-2);
    const minutes = ("0" + now.getMinutes()).slice(-2);
    const seconds = ("0" + now.getSeconds()).slice(-2);
    const dateStr = now.toString().split(" ").slice(0, 4).join(" ");

    g.setColor(0, 0, 0);
    
    // HH:MM (Big Vector Font)
    g.setFont("Vector", 46);
    g.setFontAlign(0, -1);
    g.drawString(`${hours}:${minutes}`, g.getWidth() / 2, 20);

    if (false) {
    // SS (Seconds)
    // Does not work well in once a minute update
      g.setFont("Vector", 38);
      g.drawString(seconds, g.getWidth() / 2, 75);
    } else {
       let bat = E.getBattery();
      g.setFont("Vector", 38);
      g.drawString(bat+" %", g.getWidth() / 2, 75);

    }
    

    // Date
    g.setFont("Vector", 16);
    g.drawString(dateStr, g.getWidth() / 2, 120);
    
  } else {
    // Stacked View: HHMM on top of each other, getting progressively smaller
    const timeStr = ("0" + now.getHours()).slice(-2) + ("0" + now.getMinutes()).slice(-2);
    
    let configs;
    if (0) {
    // Configurations for the 4 digits: [width, height, thickness, topY]
    // Further digits are drawn progressively smaller down the screen
    configs = [
      { w: 70, h: 45, t: 8,  y: 5   }, // H1 (Largest)
      { w: 55, h: 38, t: 6,  y: 55  }, // H2
      { w: 42, h: 30, t: 5,  y: 98  }, // M1
      { w: 32, h: 24, t: 4,  y: 133 }  // M2 (Smallest)
    ];
    } else {
    // Configurations for the 4 digits: [width, height, thickness, topY]
    configs = [
      { w: 160, h: 160, t: 8,  y: 5   }, // H1 (Largest)
      { w: 120, h: 120, t: 8,  y: 25  }, // H2
      { w: 80, h: 80, t: 8,  y: 45  }, // M1
      { w: 40, h: 40, t: 8,  y: 65 }  // M2 (Smallest)
    ];
    }

    for (let i = 0; i < 4; i++) {
      const c = configs[i];
      const digit = parseInt(timeStr[i]);
      const x = (g.getWidth() - c.w) / 2; // Center horizontally
      drawDigit(digit, x, c.y, c.w, c.h, c.t);
    }
  }
}

// Handle touch events
Bangle.on('touch', function(zone, e) {
  isDetailedView = true;
  draw();

  // Reset or set 10-second window
  if (detailedViewTimeout) clearTimeout(detailedViewTimeout);
  
  detailedViewTimeout = setTimeout(() => {
    isDetailedView = false;
    detailedViewTimeout = null;
    draw();
  }, 10000);
});

setInterval(() => {
  draw();
}, 60000);

// Initial draw
draw();
