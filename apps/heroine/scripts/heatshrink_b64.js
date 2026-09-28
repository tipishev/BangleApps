#!/usr/bin/env node
/* eslint-env node */
/*
Compress stdin with Espruino's heatshrink (webtools/heatshrink.js, the
same code the watch decompresses with) and print it as base64.
Used by convert_image.py.
*/

const heatshrink = require(__dirname + "/../../../webtools/heatshrink.js");

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const data = new Uint8Array(Buffer.concat(chunks));
  const compressed = heatshrink.compress(data);
  process.stdout.write(Buffer.from(compressed).toString("base64"));
});
