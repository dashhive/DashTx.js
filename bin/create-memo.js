#!/usr/bin/env node
"use strict";

const DUFFS = 100000000;

let Path = require("node:path");
let Fs = require("node:fs/promises");

//let DashTx = require("dashtx");
let DashTx = require("../");
let DashKeys = require("dashkeys");
let Secp256k1 = require("@dashincubator/secp256k1");

async function main() {
  let args = process.argv.slice(2);

  if (3 !== args.length) {
    console.error();
    console.error(`USAGE`);
    console.error(`    create-memo <wif> <utxo.json> <message>`);
    console.error();
    console.error(`EXAMPLE`);
    console.error(`    create-memo ./addr.wif ./coin.json "my memo"`);
    console.error();
    process.exit(1);
    return;
  }

  let wifpath = args[0];
  let coinpath = args[1];
  let msg = args[2];

  coinpath = Path.resolve(coinpath);

  let encoder = new TextEncoder();
  let msgBytes = encoder.encode(msg);
  let tooLong = msgBytes.length > 83;
  if (tooLong) {
    console.error("memo messages must be 83 bytes or fewer");
    process.exit(1);
    return;
  }
  let memo = DashKeys.utils.bytesToHex(msgBytes);

  console.info();

  let wif = await Fs.readFile(wifpath, "utf8");
  wif = wif.trim();

  let coreUtxo = await require(coinpath);
  let valid =
    coreUtxo.txid &&
    coreUtxo.outputIndex &&
    coreUtxo.satoshis &&
    (coreUtxo.address || coreUtxo.pubKeyHash || coreUtxo.script);
  if (!valid) {
    console.error(
      "coin JSON must contain 'txid', 'outputIndex', 'satoshis' and one of 'address', 'pubKeyHash', or 'script'",
    );
    process.exit(1);
    return;
  }

  let addr = await DashKeys.wifToAddr(wif);
  console.info(`Source:            ${addr}`);
  console.info();

  let privKeyBytes = await DashKeys.wifToPrivKey(wif);
  let duffs = toDuffs(coreUtxo.satoshis);
  let dash = toDash(coreUtxo.satoshis);
  console.info(`Coin Value:  ${dash} (${duffs})`);

  let inputs = [coreUtxo];
  let outputs = [{ memo: memo, satoshis: 0 }];

  // let pkhBytes = await DashKeys.addrToPkh("X.................................");
  // let pubKeyHash = DashKeys.utils.bytesToHex(pkhBytes);
  // let change = { pubKeyHash: pubKeyHash, satoshis: 0 };
  // outputs.push(change);
  let txInfo = {
    version: 3, // (will be) optional
    inputs: inputs,
    outputs: outputs,
    locktime: 0, // optional
  };

  // max bytes for single tx with both bigint pads is 193
  let fees = DashTx.appraise(txInfo);

  let feeDash = toDash(fees.max);
  let feeDuffs = toDuffs(fees.max);

  let sats = coreUtxo.satoshis - fees.max;
  let amountDash = toDash(sats);
  let amountDuffs = toDuffs(sats);
  console.info(`Donation Amount:    ${amountDash} (${amountDuffs})`);
  console.info(`Fee:                ${feeDash} (${feeDuffs})`);
  //change.satoshis = sats;

  /** @type {import('../dashtx.js').TxKeyUtils} */
  let keyUtils = {
    sign: async function (privKeyBytes, hashBytes) {
      let sigOpts = { canonical: true };
      let sigBuf = await Secp256k1.sign(hashBytes, privKeyBytes, sigOpts);
      return sigBuf;
    },
  getPublicKey: async function (txInput, i) {
    let privKeyBytes = await keyUtils.getPrivateKey(txInput, i);
    if (!privKeyBytes) {
      return null;
    }
    let pubKeyBytes = await keyUtils.toPublicKey(privKeyBytes);

    return pubKeyBytes;
  },
    getPrivateKey: async function () {
      return privKeyBytes;
    },
    toPublicKey: async function (privBytes) {
      let isCompressed = true;
      let pubBytes = Secp256k1.getPublicKey(privBytes, isCompressed);
      return pubBytes;
    },
  };
  let dashTx = DashTx.create(keyUtils);

  //@ts-ignore
  let txInfoSigned = await dashTx.hashAndSignAll(txInfo);
  let txHex = txInfoSigned.transaction.toString();

  console.info();
  console.info(txHex);

  console.info();
  console.info(
    "Inspect transaction hex at https://live.blockcypher.com/dash/decodetx/",
  );
  console.info();
}

/**
 * @param {Number} duffs
 * @returns {String}
 */
function toDuffs(duffs) {
  return duffs.toString().padStart(9, "0");
}

/**
 * @param {Number} duffs
 * @returns {String}
 */
function toDash(duffs) {
  return (duffs / DUFFS).toFixed(8);
}

main()
  .then(function () {
    process.exit(0);
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
