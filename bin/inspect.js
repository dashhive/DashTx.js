#!/usr/bin/env node

"use strict";

let Fs = require("node:fs");

let Tx = require("../dashtx.js");

let filepath = process.argv[2];

const OP_RETURN = 0x6a; // 106

async function main() {
  /* jshint maxstatements: 200 */
  let hasInputScript = false;
  let totalUnits = 0;

  let hex = Fs.readFileSync(filepath, "utf8");
  hex = hex.trim();

  let next = 0;
  let versionHex = hex.substr(next, 8);
  // TODO reverse
  let version = parseInt(versionHex.substr(0, 2), 16);
  next += 8;
  console.info();
  console.info();
  console.info(`${versionHex}                  # VERSION (${version})`);

  let numInputsHex = hex.substr(next, 2);
  let numInputs = parseInt(numInputsHex, 16);
  next += 2;

  if (numInputs > 252) {
    if (253 === numInputs) {
      numInputsHex += hex.substr(next, 4);
    } else if (254 === numInputs) {
      numInputsHex += hex.substr(next, 8);
    } else if (255 === numInputs) {
      numInputsHex += hex.substr(next, 16);
    }
    numInputs = parseInt(numInputsHex, 16);
    next += numInputsHex.length - 2;
  }
  console.info(
    `${numInputsHex}                        # Inputs (${numInputs})`,
  );

  for (let i = 0; i < numInputs; i += 1) {
    let count = i + 1;
    console.info();
    console.info(`# Input ${count} of ${numInputs}`);
    let txId = hex.substr(next, 64);
    next += 64;
    console.info("   ", txId.slice(0, 16), "     # Previous Output TX ID");
    console.info("   ", txId.slice(16, 32));
    console.info("   ", txId.slice(32, 48));
    console.info("   ", txId.slice(48, 64));

    let outputIndexHex = hex.substr(next, 8);
    let outputIndex = parseInt(outputIndexHex.slice(0, 2));
    console.info(
      `    ${outputIndexHex}              # Previous Output index (${outputIndex})`,
    );
    next += 8;

    // TODO VarInt
    let scriptSizeHex = hex.substr(next, 2);
    let scriptSize = parseInt(scriptSizeHex, 16);
    console.info(
      `    ${scriptSizeHex}                    # Script Size (${scriptSize} bytes)`,
    );
    next += 2;

    if (0 === scriptSize) {
      // "Raw" Tx
    } else if (25 === scriptSize) {
      // "Hashable" Tx
      hasInputScript = true;

      let script = hex.substr(next, 2 * scriptSize);
      next += 2 * scriptSize;

      console.info(
        "   ",
        script.slice(0, 4),
        "                 # (Hashable) Lock Script",
      );
      console.info("   ", script.slice(4, 6));
      console.info("   ", script.slice(6, 26));
      console.info("   ", script.slice(26, 46));
      console.info("   ", script.slice(46, 50));
    } else if (scriptSize >= 106 && scriptSize <= 109) {
      hasInputScript = true;

      let script = hex.substr(next, 2 * scriptSize);
      next += 2 * scriptSize;

      let sigSizeHex = script.substr(0, 2);
      let sigSize = parseInt(sigSizeHex, 16);
      console.info(
        `    ${sigSizeHex}                    # Signature Script Size (${sigSize})`,
      );

      let asn1Seq = script.substr(2, 2);
      let asn1Bytes = script.substr(4, 2);
      console.info(
        `    ${asn1Seq}${asn1Bytes}                  # ASN.1 ECDSA Signature`,
      );

      let rTypeHex = script.substr(6, 2);
      let rSizeHex = script.substr(8, 2);
      let rSize = parseInt(rSizeHex, 16);
      console.info(`    ${rTypeHex}${rSizeHex}`);

      let sIndex = 10;
      let rValue = script.substr(sIndex, 2 * rSize).padStart(66, " ");
      sIndex += 2 * rSize;
      console.info(`    ${rValue}`);

      let sTypeHex = script.substr(sIndex, 2);
      sIndex += 2;

      let sSizeHex = script.substr(sIndex, 2);
      let sSize = parseInt(sSizeHex, 16);
      sIndex += 2;
      console.info(`    ${sTypeHex}${sSizeHex}`);

      let sValue = script.substr(sIndex, 2 * sSize).padStart(66, " ");
      sIndex += 2 * sSize;
      console.info(`    ${sValue}`);

      let sigHashTypeHex = script.substr(sIndex, 2);
      let sigHashType = parseInt(sigHashTypeHex, 16);
      sIndex += 2;
      console.info(
        `    ${sigHashTypeHex}                    # Sig Hash Type (${sigHashType})`,
      );

      let publicKeySizeHex = script.substr(sIndex, 2);
      let publicKeySize = parseInt(publicKeySizeHex, 16);
      sIndex += 2;
      console.info(
        `    ${publicKeySizeHex}                    # Public Key Size (${publicKeySize})`,
      );

      let publicKeyHex = script.substr(sIndex, 2 * publicKeySize);
      sIndex += 2 * publicKeySize;
      console.info(`    ${publicKeyHex}`);

      let rest = script.substr(sIndex);
      if (rest) {
        console.error("spurious extra in script???");
        console.error(rest);
      }

      // "Signed" Tx
    } else {
      throw new Error(
        `expected a "script" size of 0 (raw), 25 (hashable), or 106-109 (signed), but got '${scriptSize}'`,
      );
    }

    let sequence = hex.substr(next, 8);
    next += 8;
    console.info(`    ${sequence}              # Sequence (always 0xffffffff)`);
  }

  let numOutputsHex = hex.substr(next, 2);
  // TODO varint
  let numOutputs = parseInt(numOutputsHex, 16);
  next += 2;
  console.info();
  console.info(
    `${numOutputsHex}                        # Outputs (${numOutputs})`,
  );

  for (let i = 0; i < numOutputs; i += 1) {
    let count = i + 1;
    console.info(`# Output ${count} of ${numOutputs}`);

    let unitsHexReverse = hex.substr(next, 16);
    next += 16;
    let unitsHex = Tx.utils.reverseHex(unitsHexReverse);
    let units = parseInt(unitsHex, 16);
    totalUnits += units;

    console.info(
      `    ${unitsHexReverse}      # Base Units (satoshis) (${units})`,
    );

    // TODO VarInt
    let lockScriptSizeHex = hex.substr(next, 2);
    let lockScriptSize = parseInt(lockScriptSizeHex, 16);
    console.info(
      `    ${lockScriptSizeHex}                    # Lock Script Size (${lockScriptSize} bytes)`,
    );
    next += 2;

    let script = hex.substr(next, 2 * lockScriptSize);
    next += 2 * lockScriptSize;

    let scriptTypeHex = script.slice(0, 2);
    let scriptType = parseInt(scriptTypeHex, 16);
    if (OP_RETURN === scriptType) {
      console.info(
        "   ",
        scriptTypeHex,
        script.slice(2, 4),
        "                # Memo (OP_RETURN)",
      );
      let memo = script.slice(4, 2 * lockScriptSize);
      let decoder = new TextDecoder();
      let bytes = Tx.utils.hexToBytes(memo);
      let msg = "";
      try {
        msg = decoder.decode(bytes);
      } catch (e) {
        msg = memo;
      }
      let chars = msg.split("");
      for (; chars.length; ) {
        let part = chars.splice(0, 20);
        let str = part.join("");
        console.info("   ", str);
      }
    } else {
      console.info("   ", script.slice(0, 4), "                 # Script");
      console.info("   ", script.slice(4, 6));
      console.info("   ", script.slice(6, 26));
      console.info("   ", script.slice(26, 46));
      console.info("   ", script.slice(46, 50));
    }
    console.info();
  }

  // TODO reverse
  let locktimeHex = hex.substr(next, 8);
  let locktime = parseInt(locktimeHex.slice(0, 2));
  next += 8;
  console.info(`${locktimeHex}                  # LOCKTIME (${locktime})`);
  console.info();

  let sigHashTypeHex = hex.substr(next);
  if (sigHashTypeHex) {
    let sigHashType = parseInt(sigHashTypeHex.slice(0, 2));
    hex = hex.slice(0, -8);
    console.info(
      `${sigHashTypeHex}                  # SIGHASH_TYPE (0x${sigHashType})`,
    );
    console.info();

    let txHash = await Tx.hashPartial(hex, Tx.SIGHASH_ALL);
    let txHashHex = Tx.utils.bytesToHex(txHash);
    // TODO 'N/A' if not applicable
    console.info(`Tx Hash: ${txHashHex}`);
    console.info(`TxID:   N/A`);
  } else if (hasInputScript) {
    console.info(`Tx Hash: N/A`);
    let txId = await Tx.getId(hex);
    console.info(`TxID: ${txId}`);
  } else {
    console.info(`Tx Hash: N/A`);
    console.info(`TxID:   N/A`);
  }

  let txBytes = hex.length / 2;
  console.info(`Tx Bytes:       ${txBytes}`);
  console.info();
  console.info(`Tx Outputs:     ${totalUnits}`);
  console.info(`Tx Fee:         ${txBytes}`);
  let txCost = txBytes + totalUnits;
  console.info(`Tx Min Cost:    ${txCost}`);
  console.info();
}

main()
  .then(function () {
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:");
    console.error(err.stack || err);
    process.exit(1);
  });
