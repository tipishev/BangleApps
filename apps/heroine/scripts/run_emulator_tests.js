#!/usr/bin/env node
/* eslint-env node */
/*
Run heroine's test.json in the emulator:

  node apps/heroine/scripts/run_emulator_tests.js [-v] [--testindex N]

Same as `node bin/runapptests.js --id heroine`, except that files are
uploaded in chunks like the web App Loader does. The node App Loader in
core/lib/apploader.js doesn't set Const.UPLOAD_CHUNKSIZE, so it sends
each file as one command, and heroine_tileset (~150 KB) doesn't fit in
the emulator's RAM that way.

Needs EspruinoWebIDE cloned next to this repository, see bin/runapptests.js.
*/

const BASE_DIR = __dirname + "/../../..";

// loads core/lib/apploader.js, which (re)defines global.Const
require(BASE_DIR + "/core/lib/apploader.js");
global.Const.UPLOAD_CHUNKSIZE = 1024; // the value in core/js/utils.js

if (!process.argv.includes("--id")) process.argv.push("--id", "heroine");
require(BASE_DIR + "/bin/runapptests.js");
