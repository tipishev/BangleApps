require("Font8x16").add(Graphics);
require("Font7x11Numeric7Seg").add(Graphics);
require("Font5x7Numeric7Seg").add(Graphics);
require("Font4x5").add(Graphics);

const locale = require("locale");
const Storage = require("Storage");

// The watchface was originally laid out on a 176x176 screen.
// Scale every coordinate and size so it also works on devices
// with a different screen size.
const W = g.getWidth();
const H = g.getHeight();
const S = Math.min(W, H) / 176;
function X(x) { return Math.round(x * W / 176); }
function Y(y) { return Math.round(y * H / 176); }
function F(n) { return Math.max(1, Math.round(n * S)); } // scaled font size
function P(w) { return Math.round(w * S); } // scaled pixel size

const timeTextY = Y(4);
const timeDataY = Y(23);
const DateTextY = Y(48);
const DateDataY = Y(67);
const stepGoalBatTextY = Y(100);
const stepGoalBatdataY = Y(119);
const statusTextY = Y(140);
const statusDataY = Y(159);
let stepGoal = (Storage.readJSON("health.json",1)||10000).stepGoal;
let steps = 0;
let alarmStatus = (Storage.readJSON('sched.json',1)||[]).some(alarm=>alarm.on);
let charching = Bangle.isCharging();
let chargeAniFrame= 0;
let btConnected = NRF.getSecurityStatus().connected;
let hasNewMessages = (Storage.readJSON('messages.json',1)||[]).some(messag=>messag.new==true);

const chargeAni =[require("heatshrink").decompress(atob("2GwgcEiFBAX4CbhEgwQC/ATeAUP4CegSh/ATyh/AT0AUP4CeUP4CeoCh/AT0BUP4CeUP4CewCh/AT0CUP4CeUP4CegCh/ATyh/AT1AUP4CegKh/ATyh/AT2AUP4CJgUBgAXSoBxNgEgaLUAAAMCCh8kKB4kCgKDXgAuBwAdLiRBCAoJEOgEEyFAAYJBVoECpMkyUIIJWChJEBAQJEBI4ZlIoIjBpJBQXI0AiRBCDoK/HQYQ+EyFIkiMBQxBlDpLuBQasADQIdDYRA4BIJAICKwsIMokkgB0GAR0EIIgdBBwh0BHApBIdIwjFwCDVDQZBDBYdIHBBBJwUBIJGQgBBTgBBMHxwIDdJJBWiJBGwDjCQCBBHdI2SEYT+JAQ+AII4pCHZwIGIJOQIKmBIIwdBF4KARBAhBBEY2SYryDXpBoBYo5BdBYI+UBAbFHyTFUwBBIHywIDII2QQYkAIP4CRDoxZBYrOCoBlGIKqDGgA+YBARBGyECX5oCGQYsggDFbgESdIyDUL4sAgECHy4IBiAcBU4pBWL4dIgHYgCDZwE2gCnFYSQCDgEJDoMAg3bAwKDYgO24EBEYNAgCATAQkALgJBCsEBIK8ghpBBEILKBEAJBYAAMSgHbtBIBQCgIBgFt2w/CAAI+WAQpBBjVtUgKDWgdp2EABAI4ThEgwQCGFgMIgdNEwZBToEbpuAMQIsJASiqDtKqCYqkA7VscAZBdEAcN23AgQ+RBAOAg3bsEBIMApDgO27EAYqeAm3bgAgEfxICSF4cAFISDTLJAyLgSDOF4qtBoEBIKMAboZBQQakSgHTtEAYqMAts2gEQBYr+ROIJBFGQ1AjVtwALHpJEHhEDtOwgALFQbZiFoEDposBPQpBCQY1AjdNKxA7URgiwJ2ywFkGShIFBbQ3btjaIYqICIeo0Ahu24ECYQmSoMkIgK5Eg3bsDsBaI47RRIxBHgkB23YgALBQARBDpIICgmAm3bgEIUIrFWAQggGIgMAm3agALBQYI+CAQeCCIJTFcw4yJgSJMMQ6zDzdAgJ6BII7IChuma4IdHYqYCGMQ4IBgHTtkAHw4CCoMAts2gEQDpFIfZgCLMQwmCoEatuAghBJpEDtOwgAdJHCBBTgdtGQJBJoEbKATjIBAQvDoDFRUhAICWwO2gESIJEA7bUBcZTFGIL0N23AgRBHyEG7dggKhKBAIvDCILFQMpckgO26EAII+Am3bgDCKIIwCFI5hBMwE07Q1BII0B2nYgAaKBAR9QIKcGzdAgJBFkEN0zRBIOOSgHTtkAIIsAts2gESpLFWARhlLkGSoEatuAghBDpEDtuggAIBIOI4C2A4CIINAjZKEUJi/QgBBDYpZxBXge2XgTOC7bOEILoCBoBBRkEN22Ag1Jk2Qg3bsEBIIShLBAJxCgJEQMRQIBGQcB03QgHJ0uAmnagAOEIJ8IILlBGQeAm2bgEPI4O07EAZYRBSkBBgX4ObsBBBhum4ECIIjmLIIoCPMRYFBGQWSgHTtkHkFt2kAiRB4oEbIIewgALDIMYgKyAyEyVIgdtw/jtuAghB5pMAhuAgdggALFIOvkgAACh5B78+eIANz55BGDpIIBiFBggCTQaX//Ef+fJIPVPk+fIPyDB/1AgZB9nnz43DzwLGkg7FEAuChACTIKN5k+Sg3AjxBpUI4jDAoKDFz027BB9knwIIMCIPuQIJTgGEAovCgMEiFBARpfHEYhBIzBBXwA+OIK80QbA+PIKESIJ47HEAg7PagQCCMRdBQaJBXgA7DIKeCIJ4dLGQ4CPYpcgQY026BB3ghBHQY7CKBATFKARbpMYoxBtU5iDPL5jFkyBBODRQICF4WAYr8SoJBFzBBFDRjFMgCDXwQFBHAc0QYyALYrKDNhJBMLhi/SAQwmNO4JBJC5aDHgJBSExpBKTZiDpkGSZAOQm3QIIYXNyBBtQYcSTZsSYQQCXFJ1BkkQIITOCIK8BQbwICwBBEC57FZiAsRIISAOBATFaQaDFBzECCiKDsmiDBINiwQwBBCYqkBQf4CGfxACIFiJBXHaICGQaE26BBQHa5BXQaJBdVpgICwBBCYRoICiFAIPqAcAQYvNiDFRoKDBATqDPzCDRwBBsmjFPQDwCDF5pBCYpr+YARKDngRB2QcZxNm3QYpr+aARKDMmyDcgJBxQcsQYphBBYpb+cARRBewCGhWxU2zBBLYUgCEQZM0QZgaBgDImQZJBLHcoCEGQKDTYVICDQaY+pgSGCAoI1Gm3QII7CpAQ5BGQY7CsZBWAIITCuARZ6DQYw+zQwsQgEAIIUSdjJEfkBABAAI+ZAUcBkmSgEBgkCIPMApJBBpEAFkjFVoESIIVJkDpdATlAHwJBCkkAIPMAINbdUghBFwECfzICeIP8gwA+DAQWQIMraTII8AfzQCdIP5B/IP5B/AQ8EIIuAFklAkGChACQII8CDSICmgBBFgBB/IIIsjwDaViRBDkD+cAT0AIIVIgBB8gJBBAYIphgTdZgAACfzgChIAJfaAX4CDcEIC8oCh/AT0BUP4CeUP4CewBxPA=")),
require("heatshrink").decompress(atob("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")),
require("heatshrink").decompress(atob("2GwgcEiFBAX4CbhEgwQC/ATeAUP4CegSh/ATyh/AT0AUP4CeUP4CeoCh/AT0BUP4CeUP4CewCh/AT0CUP4CeUP4CegCh/ATyh/AT1AUP4CegKh/ATyh/AT2AUP4CJgUBgAXSoBxNgEgaLUAAAMCCh8kKB4kCgKDXgAuBwAdLiRBCAoJEOgEEyFAAYJBVoECpMkyUIIJWChJEBAQJEBI4ZlIoIjBpJBQXI0AiRBCDoK/HQYQ+EyFIkiMBQxBlDpLuBQasADQIdDYRA4BIJAICKwsIMokkgB0GAR0EIIgdBBwh0BHApBIdIwjFwCDVDQZBDBYdIHBBBJwUBIJGQgBBTgBBMHxwIDdJJBWiJBGwDjCQCBBHdI2SEYT+JAQ+AII4pCHZwIGIJOQIKmBIIwdBF4KARBAhBBEY2SYryDXpBoBYo5BdBYI+UBAbFHyTFUwBBIHywIDII2QQYkAIP4CRDoxZBYrOCoBlGIKqDGgA+YBARBGyECX5oCGQYsggDFbgESdIyDUL4sAgECHy4IBiAcBU4pBWL4dIgHQgCDZwE2gCnFYSQCDgEJDoMAg2bAwKDYgO04EBEYNAgCATAQkALgJBCsEBIK8ghpBBEILKBEAJBYAAMSgHbthIBQCgIBgFt2w/CAAI+WAQpBBjdtwCDXgdt2EABAI4ThEgwQCGFgMIEwpBToBcDEAIsIASiqE0yqBYqkA6bgEILogDhs2wECHyIIBwEG6dggJBgFIcB03YgDFTwE2zcAEAj+JASQvDgE07cAQacB22YLIoyLgSDOF4sG7atBIKMAhu24ECIKCDUiUA7dsgDFRgFt20AiALFfyJxBIIoyGoEbtuABY9JIg8Igdt2EABYqDbMQtAFgMwgB6FIISDGoEaKxI7URgiwItO0WAsgyUJAoLaG7TaJYqICIeo0Ahs24ECYQmSoMkIgK5Eg3TsDsBaI47RRIxBHgkB03YgALBQARBDpIICgmAm3TgEIUIrFWAQggGIgMAm3bgALBQYI+CAQeCCIMB2xTDcw4yJgSJMMQ6zD7azBPQJBHZAUN2zXBDo7FTAQxiHBAMA7dsgA+HAQVBgFt20AiAdIpD7MARZiGEwVAjdpwEEIJNIgdN2EADpI4QIKYyB0EAIJJQBppQBcZAICF4dAYqKkIBAUAtK2BiRBIgHaagLjKYoxBehs24ECII+Qg3TsEBUJQIBF4YRBYqBlLkkB23YgBBHwE27cAYRRBGAQpHMIJg1EIIxNDDRQICPqBBTg3bXIJBFkEN2zRBIOOSgHbtEAIIsAtu2gESpLFWARhlLkGSoEatsAghBDpEDtOwgAIBIOI4Bpo4DIINAjdNwBKCUJi/QgBBDYpZxBXgVpXgbOC7VsZwZBdAQNAIKMghu24ECpMnyEG7dggJBCUJYIBOIUBIiBiKBAIyDgO27EApPkwE27cABwhBPhBBcoIyDHYcPI4pBUkBBgX4VAjtkhs2ZYQODcxZBFAR5iLAoIyCyUA6dog9gtO0gESIPFAjdMg8gtswgALDIMYgKyAyEyVIgdpw/jpuAghB5pMAhuAgdggALFIOvkgAACh5B78+eIANz55BGDpIIBiFBggCTQaX//Ef+fJIPVPk+fIPyDB/1AgZB9nnz43DzwLGkg7FEAuChACTIKN5k+Sg3AjxBpUI4jDAoKDFz007BB9knwIIMCIPuQm2YIJDgGEAovCgMEiFBARpfHEYhBhwA+OILHQIK4+PIKESII3YII47HEAg7PagQCCMRdBQZBBggA7DIKeCIJ4dLGQ4CPYpcgQaBBvghBHzBBGYRQICYpQCLdJjFGmiDHIMinMQYxBIL5jFkyBBODRQICF4WAYr8SoJBMDRjFMgCDXwQFBHAc26BBFQBbFZQZsJIIqDGLhi/SAQwmNO4JBJC5aDHgJBSExpBKTZiDpkGSZAJBGC5uQINuYIIUSTZsSYQQCXFJ1BkkQmiDBZwRBXgKDeBAWAIIgXPYrMQFiJBCQBwICYrSDQYoYURQdk26BBtWCGAmzFWgKDpYrj+IARAsRIK47RAQyDjHa5BXzBBuVpgICwE0QYLCNBAUQoBB9QDgCDF5sQIITFOoKDBATqDiwBBsm3QIJyAeAQYvNmzFPfzACJQZzFPNZECIOyDjYrr+aARKDNzCDbgJBimjFNQcsQYpZBCYpb+cARRBewCGhWxRBNYUgCEQZM26BBNgDImQZM2QZQ7lAQgyBQZJBJYVICDQaY+pgSGCAoKDQYVICHII2YIIzCsZBWAmiDBYVwCLPQZBCQYY+zQwsQgEAIIUSdjJEfkBABAAI+ZAUcBkmSgEBgkCIPMApJBBpEAFkjFVoESIIVJkDpdATlAHwJBCkkAIPMAINbdUghBFwECfzICeIP8gwA+DAQWQIMraTII8AfzQCdIP5B/IP5B/AQ8EIIuAFklAkGChACQII8CDSICmgBBFgBB/IIIsjwDaViRBDkD+cAT0AIIVIgBB8gJBBAYIphgTdZgAACfzgChIAJfaAX4CDcEIC8oCh/AT0BUP4CeUP4CewBxPA==")),
require("heatshrink").decompress(atob("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")),
require("heatshrink").decompress(atob("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"))
                  ];

const bluetoothOnIcon = require("heatshrink").decompress(atob("iEQwYROg3AAokYAgUMg0DAoUBwwFDgE2CIYdHAogREDoopFGoodGABI="));

const bluetoothOffIcon = require("heatshrink").decompress(atob("iEQwYLIgwFF4ADBgYFBjAKCsEGBAIABhgFEgOA7AdDmApKmwpCC4OGFIYjFGoVgIIkMEZAAD"));

const alarmIcon = require("heatshrink").decompress(atob("iEQyBC/AA3/8ABBB7INHA4YLLDqIHVApJRJCZodNCJ4dPHqqPJGp4RLOaozZT8btLF64hJFJpFbAEYA="));

const notificationIcon = require("heatshrink").decompress(atob("iEQyBC/AB3/8ABBD+4bHEa4VJD6YTNEKIf/D/rTDAJ7jTADo5hK+IA=="));


//the following 2 sections are used from waveclk to schedule minutely updates
// timeout used to update every minute
var drawTimeout;

// schedule a draw for the next minute
function queueDraw(time) {
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(function() {
    drawTimeout = undefined;
    draw();
  }, time - (Date.now() % time));

}

function getSteps() {
  steps = Bangle.getHealthStatus("day").steps;
}

function drawBackground() {
  g.setBgColor('#555555');
  g.setColor(1,1,1);
  g.clear();
  g.reset();
}
function drawBlackBox() {
  g.reset();
  g.setBgColor(1,0,0);
  g.setColor(0,0,0);

  //Hour, Min and Sec
  g.fillRect(X(50), timeDataY, X(83), timeDataY+Y(22));
  g.fillRect(X(90), timeDataY, X(123), timeDataY+Y(22));
  g.fillRect(X(128), timeDataY+Y(8), X(154), timeDataY+Y(22));
  //Day, Month, Day and Year
  g.fillRect(X(9), DateDataY, X(33), DateDataY+Y(15));
  g.fillRect(X(42), DateDataY, X(82), DateDataY+Y(15));
  g.fillRect(X(91), DateDataY, X(115), DateDataY+Y(15));
  g.fillRect(X(124), DateDataY, X(167), DateDataY+Y(15));
  //Present day
  g.fillRect(X(60), Y(86), X(107), Y(93));
  //Middle line
  g.drawLine(0, Y(95), W, Y(95));
  //Step and bat
  g.fillRect(X(3), stepGoalBatdataY-1, X(62), stepGoalBatdataY+Y(15));
  g.fillRect(X(121), stepGoalBatdataY-1, X(150), stepGoalBatdataY+Y(15));

  //Status
  g.fillRect(X(62), statusDataY-1, X(111), statusDataY+Y(15));
}


function draw(){
  let time = 60000;
  if(charching){
    drawCharging();
    time = 500;
  }else{
    drawWatchface();
  }
  queueDraw(time);
}
function drawGoal() {
  var goal = stepGoal <= steps;
  g.reset();
  g.setColor(0,0,0);

  g.fillRect(X(84), stepGoalBatdataY-1, X(92), stepGoalBatdataY+Y(15));

  if (goal){
    g.reset();
    g.setColor(0,1,0);
    g.fillRect(X(84), stepGoalBatdataY, X(92), stepGoalBatdataY+Y(7));
  } else {
    g.reset();
    g.setColor(1,0,0);
    g.fillRect(X(84), stepGoalBatdataY+Y(7), X(92), stepGoalBatdataY+Y(14));
  }
}
function drawRedkBox() {
  g.reset();
  g.setBgColor(1,0,0);
  g.setColor(1,0,0);
  //Hour, Min and Sec
  g.fillRect(X(50), timeTextY, X(83), timeTextY+Y(15));
  g.fillRect(X(90), timeTextY, X(123), timeTextY+Y(15));
  g.fillRect(X(128), timeTextY+Y(8), X(154), timeTextY+Y(23));
  //Day, Month, Day and Year
  g.fillRect(X(9), DateTextY, X(33), DateTextY+Y(15));
  g.fillRect(X(42), DateTextY, X(82), DateTextY+Y(15));
  g.fillRect(X(91), DateTextY, X(115), DateTextY+Y(15));
  g.fillRect(X(124), DateTextY, X(167), DateTextY+Y(15));
  //Step, Goal and Bat
  g.fillRect(X(2), stepGoalBatTextY, X(63), stepGoalBatTextY+Y(15));
  g.fillRect(X(70), stepGoalBatTextY, X(105), stepGoalBatTextY+Y(15));
  g.fillRect(X(120), stepGoalBatTextY, X(151), stepGoalBatTextY+Y(15));
  //Status
  g.fillRect(X(62), statusTextY, X(111), statusTextY+Y(15));
}

function drawCharging(){
  // Scale and center the full-screen charging animation to the current screen
  try {
    g.drawImage(chargeAni[chargeAniFrame], (W-176*S)/2, (H-176*S)/2, {scale: S});
  } catch(e) {
    g.drawImage(chargeAni[chargeAniFrame], 0, 0);
  }
  chargeAniFrame+=1;
  if(chargeAniFrame>=chargeAni.length){
    chargeAniFrame=0;
  }


  var date = new Date();
  var h = date.getHours(), m = date.getMinutes();

 if (h<10) {
    h = ("0"+h).substr(-2);
  }
  if (m<10) {
    m = ("0"+m).substr(-2);
  }

  //time
  g.reset();
  g.setBgColor(0,0,0);
  g.setColor(1,0,0);
  g.setFont("7x11Numeric7Seg",F(3));
  g.drawString(h, X(40), Y(105));
  g.drawString(m, X(95), Y(105));


  var bat = E.getBattery();
  var batl = bat.toString().length-1;
  var batDrawX = X(80)-(P(11)*batl);
  //80 69 58
  g.drawString(bat, batDrawX, Y(20));
}

function drawWatchface(){
  drawBackground();
  getSteps();
  drawBlackBox();
  drawRedkBox();
  drawGoal();
  var date = new Date();
  var h = date.getHours(), m = date.getMinutes(), s = date.getSeconds();
  var d = date.getDate(), y = date.getFullYear();//, w = date.getDay();

  if (h<10) {
    h = ("0"+h).substr(-2);
  }
  if (m<10) {
    m = ("0"+m).substr(-2);
  }
  if (s<10) {
    s = ("0"+s).substr(-2);
  }
  if (d<10) {
    d = ("0"+d).substr(-2);
  }

  g.reset();
  g.setBgColor(1,0,0);
  g.setColor(1,1,1);
  //Draw text
  g.setFont("8x16",F(1));
  g.drawString('HOUR', X(51), timeTextY+Y(1));
  g.drawString('MIN', X(96), timeTextY+Y(1));
  g.drawString('SEC', X(130), timeTextY+Y(9));

  g.drawString('DAY', X(10), DateTextY+Y(1));
  g.drawString('MONTH', X(43), DateTextY+Y(1));
  g.drawString('DAY', X(92), DateTextY+Y(1));
  g.drawString(' YEAR ', X(125), DateTextY+Y(1));

  g.drawString('STEPS', X(15), stepGoalBatTextY+Y(1));
  g.drawString('GOAL', X(72), stepGoalBatTextY+Y(1));
  g.drawString(' BAT ', X(120), stepGoalBatTextY+Y(1));
  g.drawString('STATUS', X(64), statusTextY+Y(1));

  //time
  g.reset();
  g.setBgColor(0,0,0);
  g.setColor(1,0,0);
  g.setFont("5x7Numeric7Seg",F(2));
  g.drawString(s, X(131), timeDataY+Y(8));
  g.setFont("7x11Numeric7Seg",F(2));
  g.drawString(h, X(53), timeDataY);
  g.drawString(m, X(93), timeDataY);
  //Date
  g.reset();
  g.setBgColor(0,0,0);
  g.setColor(0,1,0);
  g.setFont("5x7Numeric7Seg",F(2));
  g.drawString(d, X(13), DateDataY);
  g.drawString(y, X(127), DateDataY);
  g.setFont("8x16",F(1));
  g.drawString(locale.month(date, 2).toUpperCase(), X(52), DateDataY);
  g.drawString(locale.dow(date, 2).toUpperCase(), X(92), DateDataY);


  //status
  g.reset();
  g.setBgColor(0,0,0);
  g.setColor(1,1,0);
  g.setFont("5x7Numeric7Seg",F(2));
  var step = steps;
  var stepl = steps.toString().length;
  var stepdDrawX = X(4)+(P(36)-(stepl*P(6)))+(P(4)*(6-stepl));
  g.drawString(step, stepdDrawX, stepGoalBatdataY);
  var bat = E.getBattery();
  var batl = bat.toString().length;
  var batDrawX = X(122)+(P(18)-(batl*P(6)))+(P(4)*(3-batl));
  g.drawString(bat, batDrawX, stepGoalBatdataY);

  //status
  var b = bluetoothOffIcon;
  if (btConnected){
    b = bluetoothOnIcon;
  }
  g.drawImage(b, X(62), statusDataY-1);
  if (alarmStatus){
    g.drawImage(alarmIcon, X(78), statusDataY-1);
  }
  if (hasNewMessages){
    g.drawImage(notificationIcon, X(94), statusDataY-1);
  }

  g.reset();
  g.setBgColor(0,0,0);
  g.setColor(1,1,1);
  g.setFont("4x5",F(1));
  g.drawString('Present day', X(62), Y(88));

}

/**
 * This watch is mostly dark, it does not make sense to respect the
 * light theme as you end up with a white strip at the top for the
 * widgets and black watch. So set the colours to the dark theme.
 *
 */
g.setTheme({bg:"#000",fg:"#fff",dark:true}).clear();
//the following section is from waveclk
Bangle.on('lcdPower',function(on) {
  if (on) {
    draw(); // draw immediately, queue redraw
  } else { // stop draw timer
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = undefined;
  }
});

Bangle.on('charging', function(charging) {
  Bangle.setLCDTimeout(!charging);
  Bangle.setLCDPower(1);
  charching =  charging;
  draw();
});

NRF.on('connect', function() {
  btConnected = true;
});

NRF.on('disconnect', function() {
  btConnected = false;
});

Bangle.on("message", function() {
  hasNewMessages = (Storage.readJSON('messages.json',1)||[]).some(messag=>messag.new==true);
});


Bangle.setUI("clock");
// Load widgets, but don't show them
Bangle.loadWidgets();
require("widget_utils").swipeOn(); // hide widgets, make them visible with a swipe
g.clear(1);
draw();