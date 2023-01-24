#!/usr/bin/env node
"use strict";

let DashTx = require("../dashtx.js");

console.info("HEADER SIZE:", DashTx.HEADER_SIZE);
console.info("MIN INPUT SIZE:", DashTx.MIN_INPUT_SIZE);
console.info("PAD INPUT SIZE:", DashTx.MAX_INPUT_PAD);
console.info("MAX INPUT SIZE:", DashTx.MAX_INPUT_SIZE);
console.info("OUTPUT SIZE:", DashTx.OUTPUT_SIZE);
