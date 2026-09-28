
var blueWatch = require("bluewatch");
var settings = require("Storage").readJSON("bluewatch.settings.json") || {
  overrideGPS: true
};
var weatherLocInterval;
var systemDataInterval;
var savedData = require("Storage").readJSON("bluewatchData.json") || {
  phoneConnected: false,
  appsUsingGPS: []
};
let appsUsingGPS = savedData.appsUsingGPS || [];
global.phoneConnected = savedData.phoneConnected;

function updateWeatherAndLocation() {
  blueWatch.sendData("Request Location",true);
  setTimeout(function () {
    blueWatch.sendData("Request Weather",true);
  }, 60 * 10);
}
function setUpdateIntervals() {
  if (weatherLocInterval)
    clearInterval(weatherLocInterval);

  if (systemDataInterval)
    clearInterval(systemDataInterval);

  weatherLocInterval = setInterval(updateWeatherAndLocation, 10 * 60 * 1000);
  systemDataInterval = setInterval(blueWatch.sendSystemData, 6 * 60 * 1000); // 6 mins
}

Bangle.on("BlueWatchConnected", function () {
  blueWatch.sendSystemData();
  updateWeatherAndLocation();
  setUpdateIntervals();
});
if (global.phoneConnected) {
  setUpdateIntervals();
  updateWeatherAndLocation();
}
NRF.on("disconnect", function () {
  global.phoneConnected = false;
  if (weatherLocInterval) {
    clearInterval(weatherLocInterval);
    weatherLocInterval = undefined;
  }
  if (systemDataInterval) {
    clearInterval(systemDataInterval);
    systemDataInterval = undefined;
  }
});

Bangle.on("health", function (health) {
  blueWatch.sendRawHealthData(health);
});

function refreshGPSFunctions() {
  if (appsUsingGPS.length <= 0) {
    blueWatch.sendData("Stop Polling GPS");
    Bangle.isGPSOn = () => false;
  }
  if (appsUsingGPS.length > 0) {
    blueWatch.sendData("Start Polling GPS");
    Bangle.isGPSOn = () => true;
  }
}

if (settings.overrideGPS) {
  Bangle.setGPSPower = function (isOn, appID) {
    if (isOn) {
      appsUsingGPS.push(appID);
    } else {
      appsUsingGPS = appsUsingGPS.filter((app) => app !== appID);
    }
    appsUsingGPS = appsUsingGPS.filter(
      (app) => app !== undefined && app !== null
    );
    print(appsUsingGPS);
    refreshGPSFunctions();
  };
  refreshGPSFunctions();
}

Bangle.on("GPS", function (arg) {
  setMyLocation(arg);
});

function setMyLocation(d) {
  /* Example:
    {"lat":"2912.0744", "lon":"2333.332", "city":"Chicago"}*/
  let locationJson = {
    t: "location",
    lat: d.lat,
    lon: d.lon,
    city: d.city
  };
  // Convert string fields to numbers
  const numFields = ["lat", "lon"];
  numFields.forEach((field) => {
    if (locationJson[field] != null) locationJson[field] = +locationJson[field];
  });
  let myLocationSaved = require("Storage").readJSON("mylocation.json", true) || {}
  
  
  //load mylocation file
  let myLocationJson = Object.assign(
    {
      lat: d.lat,
      lon: d.lon,
      location: d.city
    },
    require("Storage").readJSON("mylocation.json", true) || {}
  );
  //remove notification from phone
  if(myLocationSaved.lat){
    if (
      Math.abs(myLocationJson.lat - locationJson.lat) < 0.0001 &&
      Math.abs(myLocationJson.lon - locationJson.lon) < 0.0001
    ) {
      //same location, do not write
      return;
    }
  }

  myLocationJson.lon = locationJson.lon;
  myLocationJson.lat = locationJson.lat;
  myLocationJson.location = locationJson.city;
  require("Storage").writeJSON("mylocation.json", myLocationJson);
}

function saveData() {
  savedData.phoneConnected = global.phoneConnected;
  savedData.appsUsingGPS = appsUsingGPS;
  require("Storage").writeJSON("bluewatchData.json", savedData);
}

E.on("kill", function () {
  saveData();
});
