"use strict";

let Assert = require("node:assert/strict");
let Fs = require("node:fs/promises");
let Path = require("node:path");

let DashTx = require("../");

async function test() {
  {
    let filename = "dsf.tx-request.hex";
    let txInfo = await parseHexFile(filename);

    if (txInfo.versionHex !== "0200") {
      throw new Error(`${filename} versionHex is not 0200`);
    }
    if (txInfo.version !== 2) {
      throw new Error(`${filename} version is not 2`);
    }
    if (txInfo.typeHex !== "0000") {
      throw new Error(`${filename} typeHex is not 0000`);
    }
    if (txInfo.type !== 0) {
      throw new Error(`${filename} type is not 0`);
    }

    if (txInfo.inputs.length !== 18) {
      throw new Error(
        `${filename} # inputs is not 18: ${txInfo.inputs.length}`,
      );
    }
    if (txInfo.outputs.length !== 18) {
      throw new Error(
        `${filename} # ouputs is not 18: ${txInfo.ouputs.length}`,
      );
    }

    if (txInfo.locktimeHex !== "00000000") {
      throw new Error(`${filename} locktimeHex is not 00000000`);
    }
    if (txInfo.locktime !== 0) {
      throw new Error(`${filename} locktime is not 0`);
    }

    if (txInfo.extraPayloadHex !== "") {
      throw new Error(`${filename} extraPayloadHex is not '' (empty string)`);
    }

    if (txInfo.sigHashTypeHex) {
      throw new Error(`${filename} should not have sigHashTypeHex`);
    }
    if (txInfo.sigHashType) {
      throw new Error(`${filename} should not have sigHashType`);
    }
  }

  {
    let filename = "dss.tx-response.hex";
    let txInfo = await parseHexFile(filename);

    if (txInfo.versionHex !== "0200") {
      throw new Error(`${filename} versionHex is not 0200`);
    }
    if (txInfo.version !== 2) {
      throw new Error(`${filename} version is not 2`);
    }
    if (txInfo.typeHex !== "0000") {
      throw new Error(`${filename} typeHex is not 0000`);
    }
    if (txInfo.type !== 0) {
      throw new Error(`${filename} type is not 0`);
    }

    if (txInfo.inputs.length !== 2) {
      throw new Error(`${filename} # inputs is not 2: ${txInfo.inputs.length}`);
    }
    if (txInfo.outputs.length !== 0) {
      throw new Error(`${filename} # ouputs is not 0: ${txInfo.ouputs.length}`);
    }

    if (txInfo.locktimeHex !== "22227777") {
      throw new Error(
        `${filename} locktimeHex is not 22227777: ${txInfo.locktimeHex}`,
      );
    }
    if (txInfo.locktime !== 2004296226) {
      throw new Error(
        `${filename} locktime is not 2004296226: ${txInfo.locktime}`,
      );
    }

    if (txInfo.extraPayloadHex !== "") {
      throw new Error(`${filename} extraPayload is not '' (empty string)`);
    }
  }

  {
    let filename = "tx-broadcast.hex";
    let txInfo = await parseHexFile(filename);

    let filename2 = "tx-broadcast.commented.hex";
    let txInfo2 = await parseHexFile(filename2);

    Assert.deepEqual(txInfo2, txInfo);

    if (txInfo.inputs.length !== 11) {
      throw new Error(
        `${filename} # inputs is not 11: ${txInfo.inputs.length}`,
      );
    }
    for (let txInput of txInfo.inputs) {
      if (!txInput.signature) {
        throw new Error(
          `${filename} missing sig for ${txInput.txid}:${txInput.outputIndex}`,
        );
      }
    }

    if (txInfo.outputs.length !== 11) {
      throw new Error(
        `${filename} # ouputs is not 11: ${txInfo.ouputs.length}`,
      );
    }
  }

  {
    let filename = "sighash-all.tx.hex";
    let txInfo = await parseHexFile(filename);

    if (txInfo.versionHex !== "0200") {
      throw new Error(`${filename} versionHex is not 0200`);
    }
    if (txInfo.version !== 2) {
      throw new Error(`${filename} version is not 2`);
    }
    if (txInfo.typeHex !== "0000") {
      throw new Error(`${filename} typeHex is not 0000`);
    }
    if (txInfo.type !== 0) {
      throw new Error(`${filename} type is not 0`);
    }

    let scriptIndex = -1;
    let nulls = 0;
    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let txInput = txInfo.inputs[i];
      if (!txInput.script) {
        nulls += 1;
        continue;
      }

      if (scriptIndex > -1) {
        throw new Error(`${filename} has more than one script input`);
      }

      scriptIndex = i;
    }
    if (scriptIndex !== 1) {
      throw new Error(`${filename} inputs[1] should have a script to sign`);
    }
    if (nulls !== 10) {
      throw new Error(`${filename} should have 10 null inputs: ${nulls}`);
    }

    if (txInfo.outputs.length !== 11) {
      throw new Error(
        `${filename} # ouputs is not 11: ${txInfo.ouputs.length}`,
      );
    }

    if (txInfo.sigHashTypeHex !== "01000000") {
      throw new Error(
        `${filename} sigHashTypeHex should be '01000000': ${txInfo.sigHashTypeHex}`,
      );
    }
    if (txInfo.sigHashType !== 1) {
      throw new Error(
        `${filename} sigHashType should be 1: ${txInfo.sigHashType}`,
      );
    }
  }

  {
    let filename = "sighash-any.tx.hex";
    let txInfo = await parseHexFile(filename);

    if (txInfo.versionHex !== "0200") {
      throw new Error(`${filename} versionHex is not 0200`);
    }
    if (txInfo.version !== 2) {
      throw new Error(`${filename} version is not 2`);
    }
    if (txInfo.typeHex !== "0000") {
      throw new Error(`${filename} typeHex is not 0000`);
    }
    if (txInfo.type !== 0) {
      throw new Error(`${filename} type is not 0`);
    }

    let scriptIndex = -1;
    let nulls = 0;
    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let txInput = txInfo.inputs[i];
      if (!txInput.script) {
        nulls += 1;
        continue;
      }

      if (scriptIndex > -1) {
        throw new Error(`${filename} has more than one script input`);
      }

      scriptIndex = i;
    }
    if (scriptIndex !== 0) {
      throw new Error(`${filename} inputs[0] should have a script to sign`);
    }
    if (nulls !== 0) {
      throw new Error(`${filename} should have 0 null inputs: ${nulls}`);
    }

    if (txInfo.outputs.length !== 11) {
      throw new Error(
        `${filename} # ouputs is not 11: ${txInfo.ouputs.length}`,
      );
    }

    if (txInfo.sigHashTypeHex !== "81000000") {
      throw new Error(
        `${filename} sigHashTypeHex should be '81000000': ${txInfo.sigHashTypeHex}`,
      );
    }
    if (txInfo.sigHashType !== 81) {
      throw new Error(
        `${filename} sigHashType should be 81: ${txInfo.sigHashType}`,
      );
    }
  }

  console.info(
    `PASS: versions, inputs, outputs, scripts, and sigHashTypes match`,
  );
}

/**
 * @param {String} filename
 */
async function parseHexFile(filename) {
  let filepath = Path.join(__dirname, "../fixtures/", filename);
  let hex = await Fs.readFile(filepath, "utf8");
  // nix comments and whitespace used for debugging
  hex = hex.replace(/(^|\s)#.*/g, " ");
  hex = hex.replace(/[\s\n]+/g, "");

  let txInfo = DashTx.parseUnknown(hex);
  return txInfo;
}

test()
  .then(function () {
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:");
    console.error(err.stack || err);
    process.exit(1);
  });
