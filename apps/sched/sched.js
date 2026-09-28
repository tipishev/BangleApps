
// Chances are boot0.js got run already and scheduled *another*
// 'load(sched.js)' - so let's remove it first!
if (Bangle.SCHED) {
  clearInterval(Bangle.SCHED);
  delete Bangle.SCHED;
}

function formatMS(ms) {
  if (ms < 60000) {
    // less than a minute → show seconds
    return Math.round(ms / 1000) + "s";
  } else {
    // one minute or more → show minutes
    return Math.round(ms / 60000) + "m";
  }
}

function showSnoozeMenu(alarm){

  Bangle.buzz(40);

  function onSnooze(snoozeTime) {
    require("sched").snoozeAlarm(alarms, alarm, snoozeTime);
    load();
  }

  if(alarm.timer){

    let timerLength=alarm.timer;
    let buttons={ "15s": 15, "30s":30,"1m":60 ,"2m":120,"5m":300};
    let formattedLength = formatMS(timerLength)+"*";
    buttons[formattedLength] = Math.round(timerLength/1000);
    //different button lengths
    E.showPrompt("Choose snooze length", {
      title: "Snooze Options",
      buttons
    }).then(snoozeTime => onSnooze(snoozeTime * 1000));
  }else{
    E.showPrompt("Choose snooze length", {
      title: "Snooze Options",
      buttons: { "1m": 1, "2m":2,"5m": 5,"10m":10 }
    }).then(snoozeTime => onSnooze(snoozeTime * 60000));
  }
}

function showAlarm(alarm) {
  const settings = require("sched").getSettings();

  let message = "";
  message += alarm.timer ? require("time_utils").formatDuration(alarm.timer) : require("time_utils").formatTime(alarm.t);
  if (alarm.msg) {
    message += "\n" + alarm.msg;
  } else {
    message = (alarm.timer
      ? atob("ACQswgD//33vRcGHIQAAABVVVAAAAAAAABVVVAAAAAAAABVVVAAAAAAAABVVVAAAAAAAABVVVAAAAAAAABVVVAAAAAAAAAP/wAAAAAAAAAP/wAAAAAAAAAqqoAPAAAAAAqqqqoP8AAAAKqqqqqv/AAACqqqqqqq/wAAKqqqlWqqvwAAqqqqlVaqrAACqqqqlVVqqAAKqqqqlVVaqgAKqaqqlVVWqgAqpWqqlVVVqoAqlWqqlVVVaoCqlV6qlVVVaqCqVVfqlVVVWqCqVVf6lVVVWqKpVVX/lVVVVqqpVVV/+VVVVqqpVVV//lVVVqqpVVVfr1VVVqqpVVVfr1VVVqqpVVVb/lVVVqqpVVVW+VVVVqqpVVVVVVVVVqiqVVVVVVVVWqCqVVVVVVVVWqCqlVVVVVVVaqAqlVVVVVVVaoAqpVVVVVVVqoAKqVVVVVVWqgAKqlVVVVVaqgACqpVVVVVqqAAAqqlVVVaqoAAAKqqVVWqqgAAACqqqqqqqAAAAAKqqqqqgAAAAAAqqqqoAAAAAAAAqqoAAAAA==")
      : atob("AC0swgF97///RcEpMlVVVVVVf9VVVVVVVVX/9VVf9VVf/1VVV///1Vf9VX///VVX///VWqqlV///1Vf//9aqqqqpf//9V///2qqqqqqn///V///6qqqqqqr///X//+qqoAAKqqv//3//6qoAAAAKqr//3//qqAAAAAAqq//3/+qoAADwAAKqv/3/+qgAADwAACqv/3/aqAAADwAAAqp/19qoAAADwAAAKqfV1qgAAADwAAACqXVWqgAAADwAAACqlVWqAAAADwAAAAqlVWqAAAADwAAAAqlVWqAAAADwAAAAqlVaoAAAADwAAAAKpVaoAAAADwAAAAKpVaoAAAADwAAAAKpVaoAAAAOsAAAAKpVaoAAAAOsAAAAKpVaoAAAAL/AAAAKpVaoAAAAgPwAAAKpVaoAAACAD8AAAKpVWqAAAIAA/AAAqlVWqAAAgAAPwAAqlVWqAACAAADwAAqlVWqgAIAAAAAACqlVVqgAgAAAAAACqVVVqoAAAAAAAAKqVVVaqAAAAAAAAqpVVVWqgAAAAAACqlVVVWqoAAAAAAKqlVVVVqqAAAAAAqqVVVVVaqoAAAAKqpVVVVVeqqoAAKqqtVVVVV/6qqqqqqr/VVVVX/2qqqqqqn/1VVVf/VaqqqqpV/9VVVf9VVWqqlVVf9VVVf1VVVVVVVVX9VQ==")
    ) + " " + message;
  }

  Bangle.loadWidgets();
  Bangle.drawWidgets();

  let buzzCount = settings.buzzCount;

  function stopOrSleep(sleep) {
    buzzCount = 0;
    //long press triggered
    if(sleep==3){
      showSnoozeMenu(alarm);
      return;
    }
    if (sleep==1) {
      require("sched").snoozeAlarm(alarms, alarm, settings.defaultSnoozeMillis);
    } else { // sleep=2, stop the alarm
      require("sched").dismissAlarm(alarms, alarm);
    }

    load();
  }

  E.showPrompt(message, {
    title: alarm.timer ? /*LANG*/"TIMER!" : /*LANG*/"ALARM!",
    buttons: { /*LANG*/"Snooze": 1, /*LANG*/"Stop": 2 }, // default is sleep so it'll come back in some mins
    buttonsLong:{/*LANG*/"Snooze":3},
    back: () => stopOrSleep(settings.btnToStop ? 2 : 1)
  }).then(stopOrSleep);

  function buzz() {
    if (settings.unlockAtBuzz) {
      Bangle.setLocked(false);
    }

    const pattern = alarm.vibrate || (alarm.timer ? settings.defaultTimerPattern : settings.defaultAlarmPattern);
    require("buzz").pattern(pattern).then(() => {
      if (buzzCount == null || buzzCount--) {
        setTimeout(buzz, settings.buzzIntervalMillis);
      } else if (alarm.as) { // auto-snooze
        buzzCount = settings.buzzCount;
        setTimeout(buzz, settings.defaultSnoozeMillis);
      }
    });
  }

  if ((require("Storage").readJSON("setting.json", 1) || {}).quiet > 1)
    return;

  buzz();
}

let alarms = require("sched").getAlarms();
let active = require("sched").getActiveAlarms(alarms);
if (active.length) {
  // if there's an alarm, show it
  if (active[0].js) {
    // If there's custom JS, run it after a short delay, since it likely contains `load()` which we can't call from while loading *this* app
    E.showMessage(/*LANG*/"Loading...", /*LANG*/"ALARM");
    setTimeout(active[0].js, 10);
    setTimeout(load, 1000); // ensure that if the JS didn't load anything, we reload back to the clock
  } else { // normal alarm - show menu
    showAlarm(active[0]);
  }
} else {
  // otherwise just go back to default app
  setTimeout(load, 100);
}
