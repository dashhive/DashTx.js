#!/usr/bin/env node

"use strict";

let hex = process.argv[2];
if (!hex) {
  console.error(`Usage: hex-reverse <hex-string>`);
  process.exit(1);
}

let Tx = require("../tx.js");
let reversed = Tx.utils.reverseHex(hex);

console.info(reversed);
