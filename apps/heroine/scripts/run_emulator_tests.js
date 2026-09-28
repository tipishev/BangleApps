#!/usr/bin/env node
/* eslint-env node */
/*
Run heroine's test.json in the emulator:

  node apps/heroine/scripts/run_emulator_tests.js [-v] [--testindex N]

Same as `node bin/runapptests.js --id heroine`, except that:
- files are uploaded in chunks like the web App Loader does. The node App
  Loader in core/lib/apploader.js doesn't set Const.UPLOAD_CHUNKSIZE, so
  it sends each file as one command, and heroine_tileset (~150 KB)
  doesn't fit in the emulator's RAM that way.
- without --testindex, every test runs in its own process: runapptests.js
  gives all tests of an app 60 s together, not enough for this app.

Needs EspruinoWebIDE cloned next to this repository, see bin/runapptests.js.
*/

const BASE_DIR = __dirname + "/../../..";

if (!process.argv.includes("--testindex")) {
  const {spawnSync} = require("child_process");
  const tests = require(__dirname + "/../test.json").tests;
  const failed = [];
  tests.forEach((test, index) => {
    const args = [__filename, "--testindex", String(index)]
      .concat(process.argv.slice(2));
    const run = spawnSync(process.execPath, args, {encoding: "utf8"});
    const output = run.stdout + run.stderr;
    const ok = run.status === 0;
    if (!ok) failed.push(index);
    console.log(`${ok ? "OK  " : "FAIL"} ${index}: ${test.description}`);
    if (!ok || process.argv.includes("-v")) {
      output.split("\n")
        .filter((line) => line.startsWith(">") || line.includes("Error"))
        .forEach((line) => console.log("     " + line));
    }
  });
  console.log(`${tests.length - failed.length}/${tests.length} tests passed`);
  process.exit(failed.length ? 1 : 0);
}

// loads core/lib/apploader.js, which (re)defines global.Const
require(BASE_DIR + "/core/lib/apploader.js");
global.Const.UPLOAD_CHUNKSIZE = 1024; // the value in core/js/utils.js

if (!process.argv.includes("--id")) process.argv.push("--id", "heroine");
require(BASE_DIR + "/bin/runapptests.js");
