function timeToMillis(time) {
  return (time.getHours() * 3600000) + (time.getMinutes() * 60000) + (time.getSeconds() * 1000);
}

function setNextRepeatDate(alarm) {
  let date = new Date(alarm.date);
  let rp = alarm.rp;
  if (rp===true) { // fallback in case rp is set wrong
    date.setDate(date.getDate() + 1);
  } else switch(rp.interval) { // rp is an object
    case "day":
      date.setDate(date.getDate() + rp.num);
      break;
    case "week":
      date.setDate(date.getDate() + (rp.num * 7));
      break;
    case "month":
      if (!alarm.od) alarm.od = date.getDate();
      date = new Date(date.getFullYear(), date.getMonth() + rp.num, alarm.od);
      if (date.getDate() != alarm.od) date.setDate(0);
      break;
    case "year":
      if (!alarm.od) alarm.od = date.getDate();
      date = new Date(date.getFullYear() + rp.num, date.getMonth(), alarm.od);
      if (date.getDate() != alarm.od) date.setDate(0);
      break;
    default:
      console.log(`sched: unknown repeat '${JSON.stringify(rp)}'`);
      break;
  }
  alarm.date = date.toLocalISOString().slice(0,10);
}

// Return an array of all alarms
exports.getAlarms = function() {
  // we do this direct in clkinfo.js to avoid loading the library
  return require("Storage").readJSON("sched.json",1)||[];
};
// Write a list of alarms back to storage
exports.setAlarms = function(alarms) {
  alarms.forEach(e => e.t %= 86400000); // Also fix #3281 from other apps, e.g. multitimer
  return require("Storage").writeJSON("sched.json",alarms);
};
// Return an alarm object based on ID
exports.getAlarm = function(id) {
  return exports.getAlarms().find(a=>a.id==id);
};
// Given a list of alarms from getAlarms, return a list of active alarms for the given time (or current time if time not specified)
exports.getActiveAlarms = function (alarms, time) {
  if (!time) time = new Date();
  // get current time 10s in future to ensure we alarm if we've started the app a tad early
  var currentTime = timeToMillis(time) + 10000;
  return alarms
    .filter(a =>
      a.on // enabled
      && (a.last != time.getDate()) // not already fired today
      && (a.t < currentTime)
      && (a.dow >> time.getDay() & 1) // is allowed on this day of the week
      && (!a.date || a.date == time.toLocalISOString().substr(0, 10)) // is allowed on this date
    )
    .sort((a, b) => a.t - b.t);
};
// Set up a modified alarm/timer so it's ready to insert into the list of alarms. For timers, they fire the set time from now, and alarms are set to fire at the right time on the right day
exports.updateAlarm = function(alarm) {
  var time = new Date(), currentTime = timeToMillis(time);
  if (alarm.timer) {
    if (alarm.ot!==undefined) {
      // if `ot` exists, the timer is currently snoozed. In that case,
      // `t` is expected to be the time of day the snoozed alarm
      // should trigger again. If `t` < current time of day, set
      // `date` to tomorrow to avoid an immediate false trigger.
      // (#4241)
      if (alarm.t < currentTime) {
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        alarm.date = tomorrow.toLocalISOString().substr(0, 10);
      }
    } else {
      // if it's a new timer, set the start time as a time from *now*
      alarm.t = (currentTime + alarm.timer) % 86400000; // alarm time in day
      if (alarm.t < currentTime || alarm.timer>86400000/*24h*/)
        alarm.date = new Date(time.getTime() + alarm.timer).toLocalISOString().substr(0, 10);
      else delete alarm.date;
    }
    alarm.last = 0; // don't need to specify a last day for alarms
    // if timer would have gone on until a later day, set a date (fix #4220)
  } else { // If it's an alarm, default to triggering tomorrow if time < current time of day (#4232)
    if (alarm.last===undefined) {
      var time = new Date();
      alarm.last = alarm.t < currentTime ? new Date().getDate() : 0;
    }
  }
}

// Set an alarm object based on ID. Leave 'alarm' undefined to remove it
exports.setAlarm = function(id, alarm) {
  var alarms = exports.getAlarms().filter(a=>a.id!=id);
  if (alarm !== undefined) {
    alarm.id = id;
    if (alarm.dow===undefined) alarm.dow = 0b1111111;
    if (alarm.on!==false) alarm.on=true;
    exports.updateAlarm(alarm);
    alarms.push(alarm);
  }
  exports.setAlarms(alarms);
  return alarm;
};

// Put an alarm on snooze for `snoozeTime` milliseconds (if already
// snoozed, this will add to the existing snooze time).
//
// `alarms` is the list of alarms from getAlarms, and `alarm` is the
// alarm object from that list to snooze.
exports.snoozeAlarm = function(alarms, alarm, snoozeTime) {
  if (alarms.indexOf(alarm) < 0) {
    console.error('[sched] snoozeAlarm: Given alarm not in list of alarms');
    return 'error';
  }

  if (alarm.ot === undefined) {
    alarm.ot = alarm.t;
  }
  let time = new Date();
  let currentTime = timeToMillis(time);
  alarm.t = currentTime + snoozeTime;
  alarm.t %= 86400000;

  // This makes updateAlarm() recompute the last alarm date so
  // that it works correctly if we're snoozing beyond midnight
  delete alarm.last;

  exports.updateAlarm(alarm);

  // Save snoozed alarm (still a member of `alarms`) back to storage
  exports.setAlarms(alarms);
  Bangle.emit("alarmSnooze", alarm);
  return 'snoozed';
};

// Stop and dismiss an expired alarm. This will cancel any snooze status
// on the alarm, turn the alarm off (or delete the alarm if configured
// to do so), or reschedule the alarm if it's set to repeat.
//
// Returns the string 'stopped', 'deleted', or 'rescheduled' to indicate
// what action was taken.
//
// `alarms` is the list of alarms from getAlarms, and `alarm` is the
// alarm object from that list to dismiss.
exports.dismissAlarm = function(alarms, alarm) {
  const alarmIndex = alarms.indexOf(alarm);
  if (alarmIndex < 0) {
    console.error('[sched] dismissAlarm: Given alarm not in list of alarms');
    return 'error';
  }

  const settings = exports.getSettings();
  let actionTaken = 'stopped';
  let del = alarm.del === undefined ? settings.defaultDeleteExpiredTimers : alarm.del;
  if (del) {
    alarms.splice(alarmIndex, 1);
    actionTaken = 'deleted';
  } else {
    if (alarm.date && alarm.rp) {
      setNextRepeatDate(alarm);
      actionTaken = 'rescheduled';
    } else if (!alarm.timer) {
      alarm.last = new Date().getDate();
    }
    if (alarm.ot !== undefined) {
      alarm.t = alarm.ot;
      delete alarm.ot;
    }
    if (!alarm.rp) {
      alarm.on = false;
    }
  }

  // Save dismissed alarm (still a member of `alarms`) back to storage
  require("sched").setAlarms(alarms);
  Bangle.emit("alarmDismiss", alarm);
  return actionTaken;
};

/// Get time until the given alarm (object). Return undefined if alarm not enabled, or if 86400000 or more, alarm could be *more* than a day in the future
exports.getTimeToAlarm = function(alarm, time) {
  if (!alarm) return undefined;
  if (!time) time = new Date();
  var currentTime = timeToMillis(time);
  var active = alarm.on && (alarm.dow>>((time.getDay()+(alarm.t<currentTime))%7))&1 && (!alarm.date || alarm.date==time.toLocalISOString().substr(0,10));
  if (!active) return undefined;
  var t = alarm.t-currentTime;
  if (alarm.last == time.getDate() || t < -60000) t += 86400000;
  return t;
};
/// Force a reload of the current alarms and widget
exports.reload = function() {
  eval(require("Storage").read("sched.boot.js"));
  Bangle.emit("alarmReload");
};
// Factory that creates a new alarm with default values
exports.newDefaultAlarm = function () {
  var settings = exports.getSettings(),
      alarm = {
    t: 12 * 3600000, // Default to 12:00
    del: false, // Never delete an alarm when it expires
    on: true,
    rp: false,
    as: settings.defaultAutoSnooze,
    dow: 0b1111111,
    last: 0,
    vibrate: settings.defaultAlarmPattern,
  };
  return alarm;
};
// Factory that creates a new timer with default values
exports.newDefaultTimer = function () {
  var settings = exports.getSettings(),
      timer = {
    timer: 5 * 60 * 1000, // 5 minutes
    del: settings.defaultDeleteExpiredTimers,
    on: true,
    rp: false,
    as: false,
    dow: 0b1111111,
    last: 0,
    vibrate: settings.defaultTimerPattern
  };
  return timer;
};
// Return the scheduler settings
exports.getSettings = function () {
  return Object.assign({
      unlockAtBuzz: true,
      defaultSnoozeMillis: 600000, // 10 minutes
      defaultAutoSnooze: false,
      defaultDeleteExpiredTimers: true, // Always
      btnToStop: false, // pressing the button on the alarm screen will stop the alarm instead of snoozing it
      buzzCount: 10,
      buzzIntervalMillis: 3000, // 3 seconds
      defaultAlarmPattern: "==",
      defaultTimerPattern: "=="
    },
    require("Storage").readJSON("sched.settings.json", true) || {}
  );
};
// Write the updated settings back to storage
exports.setSettings = function(settings) {
  require("Storage").writeJSON("sched.settings.json", settings);
};
