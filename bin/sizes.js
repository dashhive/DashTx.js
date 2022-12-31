#!/usr/bin/env node
"use strict";

let BlockTx = require("../blocktx.js");

console.info("HEADER SIZE:", BlockTx.HEADER_SIZE);
console.info("MIN INPUT SIZE:", BlockTx.MIN_INPUT_SIZE);
console.info("PAD INPUT SIZE:", BlockTx.MAX_INPUT_PAD);
console.info("MAX INPUT SIZE:", BlockTx.MAX_INPUT_SIZE);
console.info("OUTPUT SIZE:", BlockTx.OUTPUT_SIZE);
