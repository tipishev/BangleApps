// Storm watch

// TODO: logarithmic precipation
// show precipation probability?
// something to do with cape?

const LOCATION_FILE = "mylocation.json";
let pos;

// requires the myLocation app
function loadLocation() {
  pos = require("Storage").readJSON(LOCATION_FILE,1)||{"lat":50,"lon":14.75,"location":"Czechia"};
}

loadLocation();

function msg(s) {
  print("msg", s);
  g.reset().clear();
  g.setFont("Vector", 38);
  g.drawString(s, 10, 10);
  g.flip();
}

function BgetUrl(url, cb) {
  Bangle.http(url).then(result => {
    print("Got http data");
    cb(result.resp);
  }).catch(err => {
    draw_msg("http\nerror");
  });
}

let w_current = null;
let w_hourly = null;
let w_daily = null;
let w_minutely = null;
let mode = "warn";

function draw_msg(s) {
  g.reset().setColor(1,1,1);
  g.fillRect(0, 88, 176, 176);
  
  g.setColor(0,0,0);
  g.setFont("Vector", 29);
  g.drawString(s, 2, 88);
  g.flip();
}

function draw_current() {
  let w = w_current;
  if (!w)
    return;  
  draw_msg(w.temperature_2m + "C " + w.cloud_cover + "%\n" + w.precipitation + "mm " + w.wind_speed_10m + "km/h\n" + w.pressure_msl + "hPa " + w.elevation + "m");
}


function draw_warn() {
  function fmt_time(i) {
    let r = Math.floor(i/4);
    if (i%4 == 0)
      return r+"a ";
    if (i%4 == 1)
      return r+"b ";
    if (i%4 == 2)
      return r+"c ";
    if (i%4 == 3)
      return r+"d ";
  }
  // .':| ... same width; space is way wider; , is wider 

  let data = w_minutely;
  if (!data)
    return;
  let n = data.temperature_2m.length;
  let s = "", t = "";
  let f = 4;
  let temp_base = data.temperature_2m[f];
  let wind_base = 3;
  let day = data.is_day[f];
  let temp_min = 99;
  let temp_max = -99;
  let wind_max = 0;

  for (let i = f; i < n - 1; i++) {
    let v;
    
    v = data.temperature_2m[i];
    if (Math.abs(v-temp_base) > 5) {
      s += fmt_time(i) + "" + v + "C,";
      temp_base = v;
    }
    if (v < temp_min)
      temp_min = v;
    if (v > temp_max)
      temp_max = v;

    v = data.wind_speed_10m[i];
    if (Math.abs(v-wind_base) > 5) {
      s += fmt_time(i) + "wind " + v + "km/h,";
      wind_base = v;
    }
    if (v > wind_max)
      wind_max = v;

    v = data.precipitation[i];
    if (v > 1.0)
      s += fmt_time(i) + "RAIN,";

    v = data.is_day[i];
    if (v != day) {
      s += fmt_time(i) + "sunset,";
      day = v;
    }
    
    if (s.length > 1) {
      t = t + s + "\n";
      s = "";
    }
  }

  let res = t + s + temp_min + "C.." + temp_max + "C\nwind " + wind_max + "km/h";
  print("res: "+res);
  draw_msg(res);
}

function scale(y0, h, v) {
  if (v < 0)
    v = 0;
  if (v > 1)
    v = 1;
  return y0 - v * h;
}
function scale_temp(y0, h, v) { return scale(y0, h, (v - 10) / 30); }
function scale_wind(y0, h, v) { return scale(y0, h, v / 30); }
function scale_rain(y0, h, v) { return scale(y0, h, v); }
function scale_cloud(y0, h, v) { return scale(y0, h, 1 - (v / 100)); }

function thickLine(a, b, c, d) {
  g.drawLine(a, b-2, c, d-2);
  g.drawLine(a, b-1, c, d-1);
  g.drawLine(a, b, c, d);
  g.drawLine(a, b+1, c, d+1);
  g.drawLine(a, b+2, c, d+2);
}

function thickLineV(a, b, c, d) {
  g.drawLine(a-1, b, c-1, d);
  g.drawLine(a, b, c, d);
  g.drawLine(a+1, b, c+1, d);
}

function get_url(mode) {
  let url = "https://api.open-meteo.com/v1/forecast?latitude="+pos.lat+"&longitude="+pos.lon;
  // ,precipitation_hours,precipitation_probability_max
  let daily = "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";
  // ,cape,is_day,sunshine_duration"
  let detail = "weather_code,temperature_2m,precipitation,wind_speed_10m,cloud_cover,pressure_msl,precipitation_probability,is_day";
  let hourly = "&hourly="+detail
  let minutely = "&minutely_15="+detail
  if (mode == "cur")
    return url+"&current="+detail;

  // forecast\?latitude\=40\&longitude\=14.45\&daily\=sunrise\,sunset\,moonrise\,moonset\,moon_phase\,precipitation_sum\,precipitation_hours\,precipitation_probability_max\&hourly\=precipitation_probability\,cloud_cover\&models\=best_match\&current\=is_day\&m

  // it is possible to get just hours around current
  // &forecast_hours=6&past_hours=1
  // It is possible to get unix timestamps
  // &timeformat=unixtime
  let today = "&forecast_days=2";
  let past_future = "&past_days=1&forecast_days=16";
  let short = "&forecast_minutely_15\=24\&past_minutely_15\=4";
  if (mode == "daily")
    return url+daily+past_future;
  if (mode == "hourly")
    return url+hourly+today;
  if (mode == "minutely")
    return url+short+minutely;
}

function download(mode) {
  let url = get_url(mode);
  draw_msg(".oO\n"+mode);
  BgetUrl(url, result => {
    print("Got result", result);
    let data = JSON.parse(result);
    if (mode == "cur") {
      w_current = data.current;
      w_current.elevation = data.elevation;
    }
    if (mode == "daily")
      w_daily = data.daily;
    if (mode == "hourly")
      w_hourly = data.hourly;
    if (mode == "minutely")
      w_minutely = data.minutely_15;
    draw_any();
  });
  
}

function draw_any() {
  if (mode == "cur")
    return draw_current();
  if (mode == "warn")
    return draw_warn();

  g.setColor(1,1,1);
  g.fillRect(0, 88, 176, 176);
  if (mode == "daily")
    return draw_common(w_daily);
  if (mode == "hourly")
    return draw_common(w_hourly);
  if (mode == "minutely")
    return draw_common(w_minutely);
}

function draw_common(data) {
  if (!data)
    return;

  // Title
  g.setColor(0,0,0);
  g.setFont("6x15", 1);
  if (mode == "daily")
    g.drawString("Daily Weather", 5, 89);
  if (mode == "hourly")
    g.drawString("         Hourly Weather", 5, 89);
  if (mode == "minutely")
    g.drawString("                      Minutely", 5, 89);

  let times = data.time;
  let utcHour = 0;
  if (mode == "hourly") {
    // Slice next 6 hours
    times = data.time.slice(0, 48);
    // FIXME: this will start at midnight
    // print(times, temps);

    let d = new Date();
    // Get the current hour in UTC (0-23)
    utcHour = d.getHours() - (d.getTimezoneOffset() / 60);
  }
  if (mode == "minutely") {
    utcHour = 4;
  }

  print("utc:", utcHour);

  let x0 = 20, y0 = 165, w = 140, h = 50;
  let n = times.length;
  let dx = w / (n - 1);

  // Draw axes
  g.setColor(0.5, 0.5, 0.5);
  g.drawLine(x0, y0, x0 + w, y0);
  g.drawLine(x0, y0, x0, y0 - h);

  // Plot lines
  for (let i = 0; i < n - 1; i++) {
    let px1 = x0 + (i * dx), px2 = x0 + ((i + 1) * dx);

    if (mode == "daily") {
      g.setColor(1, 0, 0); // Red for Max Temp
      let tMaxY1 = scale_temp(y0, h, data.temperature_2m_max[i]);
      let tMaxY2 = scale_temp(y0, h, data.temperature_2m_max[i+1]);
      thickLine(px1, tMaxY1, px2, tMaxY2);

      let tMinY1 = scale_temp(y0, h, data.temperature_2m_min[i]);
      let tMinY2 = scale_temp(y0, h, data.temperature_2m_min[i+1]);
      thickLine(px1, tMinY1, px2, tMinY2);

      g.setColor(0, 1, 0); // Green for wind
      let Y1 = scale_wind(y0, h, data.wind_speed_10m_max[i]);
      let Y2 = scale_wind(y0, h, data.wind_speed_10m_max[i+1]);
      thickLine(px1, Y1, px2, Y2);

      g.setColor(0, 0, 1); // Blue for rain
      Y1 = scale_rain(y0, h, data.precipitation_sum[i]);
      Y2 = scale_rain(y0, h, data.precipitation_sum[i+1]);
      thickLine(px1, Y1, px2, Y2);
    } else {
      if (i == utcHour) {
        g.setColor(0, 0, 0);
        thickLine(0, y0-h, px1, y0-h);
        thickLineV(px1, y0-h, px1, y0);
      }      
      
      let tY1 = scale_temp(y0, h, data.temperature_2m[i]);
      let tY2 = scale_temp(y0, h, data.temperature_2m[i+1]);

      g.setColor(1, 0, 0);
      thickLine(px1, tY1, px2, tY2);

      g.setColor(0, 1, 0); // Green for wind
      let Y1 = scale_wind(y0, h, data.wind_speed_10m[i]);
      let Y2 = scale_wind(y0, h, data.wind_speed_10m[i+1]);
      thickLine(px1, Y1, px2, Y2);

      g.setColor(0, 0, 1); // Blue for rain
      Y1 = scale_rain(y0, h, data.precipitation[i]);
      Y2 = scale_rain(y0, h, data.precipitation[i+1]);
      thickLine(px1, Y1, px2, Y2);

      g.setColor(1, 1, 0); // Yellow four cloud cover
      Y1 = scale_cloud(y0, h, data.cloud_cover[i]);
      Y2 = scale_cloud(y0, h, data.cloud_cover[i+1]);
      thickLine(px1, Y1, px2, Y2);
      
      // Draw small time indicators at the bottom
      g.setColor(0.7, 0.7, 0.7);
      let hourStr = times[i].split("T")[1];
      g.drawString(hourStr, px1 - 6, y0 + 3);
      
    }
  }
}


function draw() {
  g.reset().clear();
  let now = new Date();

  // 1. Draw Date & Day of Week
  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let dateStr = days[now.getDay()] + " " + now.getDate();
  let bat = E.getBattery();
  if (bat < 30)
    dateStr += " BAT";
  g.setFont("Vector", 28);
  g.setColor(0, 0, 0);
  g.setFontAlign(0, -1);
  g.drawString(dateStr, g.getWidth() / 2, 2);

  // 2. Build Time String
  let fontSize = 58;
  let xstart = 12;
  g.setFont("Vector", fontSize);

  {
    let n = now;
  
    let hours = ("0" + n.getHours()).slice(-2);
    let minutes = ("0" + n.getMinutes()).slice(-2);
    let timeStr = hours + ":" + minutes;
  
    g.setColor(0, 0, 0); // Black text
    g.setFontAlign(-1, -1);
    g.drawString(timeStr, xstart, 30, fontSize);
  }

  //draw_current(w_current);
  draw_any();
}

function cycle() {
  if (mode == "cur") {
    mode = "minutely";
  } else if (mode == "minutely") {
    mode = "hourly";
  } else if (mode == "hourly") {
    mode = "daily";
  } else if (mode == "daily") {
    mode = "warn";
  } else if (mode == "warn") {
    mode = "cur";
  }
  draw_msg(mode);    
}

let prev_button = 0;

Bangle.on('drag', function(xy) {
  print("button", prev_button, xy.b);
  if (!xy.b || prev_button) {
    prev_button = xy.b;
    return;
  }
  prev_button = xy.b;

  let xLimit = g.getHeight() / 2; // Bottom active zone                       
  let yLimit = g.getHeight() / 2; // Bottom active zone                       
  
  if (xy.y <= yLimit) {
    if (xy.x <= xLimit) {
      download(mode);
    } else {
      cycle();
    }
  } else {
    if (xy.x <= xLimit) {
      draw_current();
    } else {
      cycle();
    }
  }    
});

let interval;
function setupRefreshInterval() {
  if (interval) clearInterval(interval);
  // Display update is way too slow
  let rate = Bangle.isLocked() ? 60000 : 5000;
  interval = setInterval(draw, rate);
  draw();
}

// This causes [object] on screen
//Bangle.on('GB', (s) => { msg(s); });
if (0) {
  download("minutely");
  mode = "warn";
}

msg("weather\nfor\n" + pos.location);
Bangle.on('lock', setupRefreshInterval);
//draw_any();

