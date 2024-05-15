#!/usr/bin/env node

"use strict";

let Fs = require("node:fs/promises");

let DashTx = require("../dashtx.js");

/**
 * @param {Object<String, any>} tx
 */
DashTx._debugPrint = async function (tx) {
  // version
  let lines = [""];
  if (tx.error) {
    lines.push(`                          # parsed to ${tx.offset}`);
  }
  lines.push(`${tx.versionHex}                  # VERSION (${tx.version})`);
  lines.push("");

  // inputs
  lines.push(
    `${tx.numInputsHex}                        # Inputs (${tx.numInputs})`,
  );
  for (let i = 0; i < tx.inputs?.length; i += 1) {
    let count = i + 1;
    let input = tx.inputs[i];
    lines.push("");
    lines.push(`# Input ${count} of ${tx.numInputs}`);

    let txid1 = input.txidHex.slice(0, 16);
    let txid2 = input.txidHex.slice(16, 32);
    let txid3 = input.txidHex.slice(32, 48);
    let txid4 = input.txidHex.slice(48, 64);
    lines.push(`    ${txid1}      # Previous Output TX ID`);
    lines.push(`    ${txid2}`);
    lines.push(`    ${txid3}`);
    lines.push(`    ${txid4}`);

    lines.push(
      `    ${input.outputIndexHex}              # Previous Output index (${input.outputIndex})`,
    );

    lines.push(
      `    ${input.scriptSizeHex}                    # Script Size (${input.scriptSize} bytes)`,
    );

    if (25 === input.scriptSize) {
      // ex: 76 a9 14 37b00a500178dfb1bb95d66fe7ba10d9baf9d14e 88 ac
      let opCodes1 = input.script.slice(0, 4);
      let pkhLen = input.script.slice(4, 6);
      let pkh1 = input.script.slice(6, 26);
      let pkh2 = input.script.slice(26, 46);
      let opCodes2 = input.script.slice(46, 50);
      lines.push(`    ${opCodes1}                  # (Hashable) Lock Script`);
      lines.push(`    ${pkhLen}`);
      lines.push(`    ${pkh1}`);
      lines.push(`    ${pkh2}`);
      lines.push(`    ${opCodes2}`);
    } else if (input.signature) {
      lines.push(
        `    ${input.sigSizeHex}                    # Signature Script Size (${input.sigSize})`,
      );

      lines.push(
        `    ${input.asn1Seq}${input.asn1Bytes}                  # ASN.1 ECDSA Signature`,
      );

      lines.push(`    ${input.rTypeHex}${input.rSizeHex}`);

      lines.push(`    ${input.rValue}`);

      lines.push(`    ${input.sTypeHex}${input.sSizeHex}`);

      lines.push(`    ${input.sValue}`);

      lines.push(
        `    ${input.sigHashTypeHex}                    # Sig Hash Type (${input.sigHashType})`,
      );

      lines.push(
        `    ${input.publicKeySizeHex}                    # Public Key Size (${input.publicKeySize})`,
      );

      lines.push(`    ${input.publicKey}`);

      if (input.extra) {
        lines.push("WARN: spurious extra in input script???");
        lines.push(`      ${input.extra}`);
      }
    } else {
      console.warn(`WARN: no display for this type of script: ${input.script}`);
    }

    lines.push(
      `    ${input.sequence}              # Sequence (always 0xffffffff)`,
    );
  }

  // outputs
  lines.push("");
  lines.push(
    `${tx.numOutputsHex}                        # Outputs (${tx.numOutputs})`,
  );
  for (let i = 0; i < tx.outputs?.length; i += 1) {
    let count = i + 1;
    let output = tx.outputs[i];

    lines.push("");
    lines.push(`# Output ${count} of ${tx.numOutputs}`);

    lines.push(
      `    ${output.satoshisHex}      # Satoshis (base units) (${output.satoshis})`,
    );

    lines.push(
      `    ${output.lockScriptSizeHex}                    # Lock Script Size (${output.lockScriptSize} bytes)`,
    );

    //@ts-ignore - ._OP_RETURN_HEX exists for debugging
    if (output.scriptTypeHex === DashTx._OP_RETURN_HEX) {
      let todoWhatItIs = output.script.slice(2, 4);
      lines.push(
        `    ${output.scriptTypeHex} ${todoWhatItIs}                 # Memo (OP_RETURN)`,
      );
      let chars = output.message.split("");
      for (; chars.length; ) {
        let part = chars.splice(0, 20);
        let str = part.join("");
        lines.push(`    ${str}`);
      }
    } else {
      let script1 = output.script.slice(0, 4);
      let script2 = output.script.slice(4, 6);
      let script3 = output.script.slice(6, 26);
      let script4 = output.script.slice(26, 46);
      let script5 = output.script.slice(46, 50);
      lines.push(`    ${script1}                  # Script`);
      lines.push(`    ${script2}`);
      lines.push(`    ${script3}`);
      lines.push(`    ${script4}`);
      lines.push(`    ${script5}`);
    }
    lines.push("");
  }

  lines.push(`${tx.locktimeHex}                  # LOCKTIME (${tx.locktime})`);
  lines.push("");
  if (tx.sigHashTypeHex) {
    lines.push(
      `${tx.sigHashTypeHex}                  # SIGHASH_TYPE (0x${tx.sigHashType})`,
    );
    lines.push("");

    let txHex = `${tx.transaction}${tx.sigHashTypeHex}`;
    let txBytes = DashTx.utils.hexToBytes(txHex);
    let txHash = await DashTx.doubleSha256(txBytes);
    let txHashHex = DashTx.utils.bytesToHex(txHash);
    // TODO 'N/A' if not applicable
    lines.push(`Tx Hash: ${txHashHex}`);
    // lines.push(
    //   `Tx Hash: 'await Tx.hashPartial(txInfo.transaction, DashTx.SIGHASH_ALL)'`,
    // );
    lines.push(`TxID:   N/A`);
  } else if (tx.hasInputScript) {
    lines.push(`Tx Hash: N/A`);
    let txid = await DashTx.getId(tx.transaction);
    lines.push(`TxID: ${txid}`);
    // lines.push(`TxID: 'await Tx.getId(txInfo.transaction)'`);
  } else {
    lines.push(`Tx Hash: N/A`);
    lines.push(`TxID:   N/A`);
  }

  lines.push(`Tx Bytes:       ${tx.size}`);
  lines.push("");
  lines.push(`Tx Outputs:     ${tx.totalSatoshis}`);
  lines.push(`Tx Fee:         ${tx.size}`);
  lines.push(`Tx Min Cost:    ${tx.cost}`);
  lines.push("");
  if (!tx.error) {
    lines.push(`                          # parsed to completion seccussfully`);
  }

  let output = lines.join("\n");
  return output;
};

async function main() {
  let args = process.argv.slice(2);
  let jsonIndex = args.indexOf("--json");
  if (jsonIndex > -1) {
    args.splice(jsonIndex, 1);
  }

  let filepath = args.pop() || "you-must-specify-a-file-path";
  let hex = await Fs.readFile(filepath, "utf8");
  // nix comments and whitespace used for debugging
  hex = hex.replace(/(^|\s)#.*/g, " ");
  hex = hex.replace(/[\s\n]+/g, "");

  let txInfo;
  try {
    txInfo = DashTx.parseUnknown(hex);
  } catch (e) {
    //@ts-ignore
    console.error(e.transaction);
    //@ts-ignore
    e.transaction.error = e.stack;
    throw e;
  }

  if (jsonIndex > -1) {
    console.info(txInfo);
    return;
  }

  let out = await DashTx._debugPrint(txInfo);
  console.info(`Use --json for JSON output`);
  console.info(out);
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
