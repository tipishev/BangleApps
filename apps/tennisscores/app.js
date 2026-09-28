const FILE = "tennisscores.json";
const BASE = "https://api.livetennisapi.com/api/public/v1";

let settings = Object.assign({
  apikey: "",
  tour: "",     // "" = all tours, or atp/wta/challenger/itf/juniors
  auto: false,  // periodic refresh while the app is open
  refresh: 15   // minutes
}, require("Storage").readJSON(FILE, true) || {});

let state = "loading"; // loading | live | fixtures | nokey | error
let matches = [];  // slimmed live matches
let fixtures = []; // slimmed upcoming fixtures
let index = 0;     // current page
let lastError = "";
let errDetail = "";
let updatedAt = null;
let autoTimer = null;
let loading = false;

function tourQuery() {
  return settings.tour ? "&tour=" + settings.tour : "";
}

function apiGet(path) {
  if (!Bangle.http)
    return Promise.reject(/*LANG*/"Gadgetbridge required");
  return Bangle.http(BASE + path, {
    timeout: 15000,
    headers: {Authorization: "Bearer " + settings.apikey}
  }).then(ev => {
    let r = JSON.parse(ev.resp);
    // the API reports failures as {"error":"unauthorized"} etc
    if (r && r.error) throw new Error(r.error);
    return r;
  });
}

// map a rejection to a short, watch-readable message (null = not recognised)
function humanError(e) {
  let s = "" + ((e && e.message) || e);
  if (/unauthori[sz]ed|forbidden/i.test(s)) return /*LANG*/"Check API key";
  if (/rate.?limit|too many/i.test(s)) return /*LANG*/"Rate limited";
  if (/timeout|timed out/i.test(s)) return /*LANG*/"Request timed out";
  if (/bluetooth/i.test(s)) return /*LANG*/"Not connected";
  if (/gadgetbridge/i.test(s)) return /*LANG*/"Needs Gadgetbridge";
  if (/connect|resolve|unreachable|network|internet|dns/i.test(s)) return /*LANG*/"No connection";
  if (/bad response|json|parse|expect/i.test(s)) return /*LANG*/"Bad response";
  return null;
}

function trunc(s, n) {
  if (!s) return "";
  return s.length > n ? s.substr(0, n - 1) + "." : s;
}

function pad2(n) {
  return (n < 10 ? "0" : "") + n;
}

function fmtTime(iso) {
  if (!iso) return "";
  let d = new Date(iso);
  return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " +
         pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

// keep only what we draw - the full API objects are too big to hold many of
function slimMatch(m) {
  let s = m.score;
  let p = m.players || {};
  return {
    tournament: m.tournament || "",
    round: m.round || "",
    doubles: !!m.is_doubles,
    n1: (p.p1 && p.p1.name) || "?",
    n2: (p.p2 && p.p2.name) || "?",
    // score.games is [games_p1, games_p2], each a per-set list
    g1: (s && s.games && s.games[0]) || [],
    g2: (s && s.games && s.games[1]) || [],
    // in-game points as tennis strings; entries can be null
    pt1: (s && s.points && s.points[0]) || null,
    pt2: (s && s.points && s.points[1]) || null,
    server: (s && s.server) || null, // 1, 2 or null
    tiebreak: !!(s && s.is_tiebreak)
  };
}

function slimFixture(f) {
  return {
    tournament: f.tournament || "",
    round: f.round || "",
    n1: f.player1_name || "?",
    n2: f.player2_name || "?",
    date: f.event_date || null,
    time: f.start_time || null // null until the order of play assigns one
  };
}

function scheduleAuto() {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = null;
  if (settings.auto)
    autoTimer = setTimeout(() => refresh(), settings.refresh * 60000);
}

function refresh() {
  if (loading) return;
  if (!settings.apikey) {
    state = "nokey";
    draw();
    return;
  }
  loading = true;
  drawUpdating();
  apiGet("/matches?status=live" + tourQuery() + "&limit=10").then(r => {
    if (!r || !Array.isArray(r.data)) throw new Error(/*LANG*/"Bad response");
    if (r.data.length) {
      matches = r.data.map(slimMatch);
      state = "live";
      return;
    }
    // nothing live - show the next scheduled fixtures instead
    return apiGet("/fixtures?limit=8" + tourQuery()).then(r2 => {
      if (!r2 || !Array.isArray(r2.data)) throw new Error(/*LANG*/"Bad response");
      fixtures = r2.data.map(slimFixture);
      state = "fixtures";
    });
  }).then(() => {
    loading = false;
    index = 0;
    updatedAt = new Date();
    scheduleAuto();
    draw();
  }).catch(e => {
    loading = false;
    let h = humanError(e);
    lastError = h || /*LANG*/"Error";
    // only surface the raw text (small, below) when we can't name the problem
    errDetail = h ? "" : ("" + ((e && e.message) || e)).substr(0, 40);
    state = "error";
    scheduleAuto();
    draw();
  });
}

function pageCount() {
  if (state === "live") return matches.length;
  if (state === "fixtures") return Math.ceil(fixtures.length / 2);
  return 1;
}

function drawUpdating() {
  let R = Bangle.appRect;
  g.reset().clearRect(R.x, R.y2 - 10, R.x2, R.y2);
  g.setFont("6x8").setFontAlign(0, 1);
  g.drawString(/*LANG*/"Updating...", (R.x + R.x2) / 2, R.y2);
}

function drawFooter(R) {
  g.setFont("6x8").setFontAlign(0, 1);
  let s = (pageCount() > 1 ? (index + 1) + "/" + pageCount() + "  " : "") +
    (updatedAt ? /*LANG*/"upd " + pad2(updatedAt.getHours()) + ":" + pad2(updatedAt.getMinutes()) : "") +
    "  " + /*LANG*/"tap=reload";
  g.drawString(s, (R.x + R.x2) / 2, R.y2);
}

function drawScoreRow(games, points, serving, y, R) {
  g.setFont("6x8", 2).setFontAlign(-1, -1);
  // show at most the last 3 sets so BO5 still fits on screen
  let shown = games.length > 3 ? games.slice(games.length - 3) : games;
  let s = shown.join(" ");
  if (points !== null && points !== undefined) s += "  " + points;
  g.drawString(s, R.x + 24, y);
  if (serving) g.fillCircle(R.x + 12, y + 7, 4);
}

function drawLive(R) {
  let m = matches[index];
  if (!m) return;
  let y = R.y + 2;
  g.setFont("6x8").setFontAlign(-1, -1);
  g.drawString(trunc(m.tournament, 29), R.x + 2, y);
  y += 10;
  g.drawString(trunc(m.round + (m.doubles ? /*LANG*/" (doubles)" : ""), 29), R.x + 2, y);
  y += 14;
  g.setFont("12x20").setFontAlign(-1, -1);
  g.drawString(trunc(m.n1, 14), R.x + 2, y);
  y += 22;
  drawScoreRow(m.g1, m.pt1, m.server === 1, y, R);
  y += 20;
  g.setFont("12x20").setFontAlign(-1, -1);
  g.drawString(trunc(m.n2, 14), R.x + 2, y);
  y += 22;
  drawScoreRow(m.g2, m.pt2, m.server === 2, y, R);
  y += 20;
  if (m.tiebreak) {
    g.setFont("6x8").setFontAlign(-1, -1);
    g.drawString(/*LANG*/"Tiebreak", R.x + 24, y);
  }
  drawFooter(R);
}

function drawFixtures(R) {
  let y = R.y + 2;
  g.setFont("6x8", 2).setFontAlign(0, -1);
  g.drawString(/*LANG*/"Nothing live", (R.x + R.x2) / 2, y);
  y += 20;
  g.setFont("6x8").setFontAlign(0, -1);
  g.drawString(settings.tour ? settings.tour.toUpperCase() + /*LANG*/" - next up:" : /*LANG*/"Next up:", (R.x + R.x2) / 2, y);
  y += 12;
  let shown = fixtures.slice(index * 2, index * 2 + 2);
  if (!shown.length) {
    g.setFont("6x8", 2).setFontAlign(0, -1);
    g.drawString(/*LANG*/"No fixtures", (R.x + R.x2) / 2, y + 10);
  }
  shown.forEach(f => {
    g.setFont("6x8").setFontAlign(-1, -1);
    let when = f.time ? fmtTime(f.time) :
      (f.date ? f.date.substr(8, 2) + "/" + f.date.substr(5, 2) + " " : "") + /*LANG*/"TBA";
    g.drawString(trunc(when + " " + f.tournament, 29), R.x + 2, y);
    y += 10;
    g.setFont("6x8", 2).setFontAlign(-1, -1);
    g.drawString(trunc(f.n1, 14), R.x + 2, y);
    y += 16;
    g.drawString(trunc(f.n2, 14), R.x + 2, y);
    y += 20;
  });
  drawFooter(R);
}

function drawCentered(lines, R) {
  let y = (R.y + R.y2) / 2 - lines.length * 8;
  g.setFont("6x8", 2).setFontAlign(0, -1);
  lines.forEach(l => {
    g.drawString(l, (R.x + R.x2) / 2, y);
    y += 18;
  });
}

function draw() {
  let R = Bangle.appRect;
  g.reset().clearRect(R);
  if (state === "live") drawLive(R);
  else if (state === "fixtures") drawFixtures(R);
  else if (state === "nokey") {
    drawCentered([/*LANG*/"No API key", /*LANG*/"Set one in", /*LANG*/"Settings"], R);
    g.setFont("6x8").setFontAlign(0, 1);
    g.drawString("livetennisapi.com", (R.x + R.x2) / 2, R.y2);
  } else if (state === "error") {
    g.setFont("6x8", 2).setFontAlign(0, -1);
    let lines = g.wrapString(lastError, R.w - 8);
    let y = (R.y + R.y2) / 2 - lines.length * 9 - (errDetail ? 8 : 0);
    g.drawString(lines.join("\n"), (R.x + R.x2) / 2, y);
    if (errDetail) {
      g.setFont("6x8").setFontAlign(0, -1);
      g.drawString(g.wrapString(errDetail, R.w - 8).slice(0, 2).join("\n"), (R.x + R.x2) / 2, y + lines.length * 18 + 4);
    }
    g.setFont("6x8").setFontAlign(0, 1);
    g.drawString(/*LANG*/"tap to retry", (R.x + R.x2) / 2, R.y2);
  } else {
    drawCentered([/*LANG*/"Loading..."], R);
  }
}

Bangle.setUI({mode: "updown"}, dir => {
  if (!dir) {
    refresh(); // tap / button = manual refresh
    return;
  }
  let n = pageCount();
  if (n < 2) return;
  index = (index + dir + n) % n;
  draw();
});

Bangle.loadWidgets();
draw();
Bangle.drawWidgets();
refresh();
