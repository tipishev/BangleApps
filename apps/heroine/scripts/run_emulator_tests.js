#!/usr/bin/env node
/* eslint-env node */
/*
Run all of heroine's emulator tests:

  node apps/heroine/scripts/run_emulator_tests.js [-v] [--testindex N]

`test.json` holds the few tests CI runs (bin/runapptests.js gives all of
an app's tests 60 s together); `test_more.json` holds the rest. This runs
both, every test in its own process so each gets the 60 s.

Needs EspruinoWebIDE cloned next to this repository, see bin/runapptests.js.
*/

const BASE_DIR = __dirname + "/../../..";
const APP_DIR = __dirname + "/..";
const fs = require("fs");

function all_tests() {
  const read = (file) => JSON.parse(fs.readFileSync(APP_DIR + "/" + file, "utf8"));
  return {
    app: "heroine",
    tests: read("test.json").tests.concat(read("test_more.json").tests),
  };
}

if (!process.argv.includes("--testindex")) {
  const {spawnSync} = require("child_process");
  const tests = all_tests().tests;
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

// show runapptests.js both files as its test.json
const read_file = fs.readFileSync;
fs.readFileSync = function(path) {
  if (String(path).endsWith("/apps/heroine/test.json")) {
    return Buffer.from(JSON.stringify(all_tests()));
  }
  return read_file.apply(this, arguments);
};

if (!process.argv.includes("--id")) process.argv.push("--id", "heroine");
require(BASE_DIR + "/bin/runapptests.js");
