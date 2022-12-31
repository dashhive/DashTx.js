"use strict";

/** @typedef {import('./blocktx.js').TxInputHashable} TxInputHashable */
/** @typedef {import('./blocktx.js').TxInputSigned} TxInputSigned */
let Tx = require("./blocktx.js");

//@ts-ignore
let Secp256k1 = exports.nobleSecp256k1 || require("@dashincubator/secp256k1");

//let minimumCost = HEADER_SIZE + MIN_INPUT_SIZE + OUTPUT_SIZE + extraCost;

//
// Example using Dash
//
let txId = "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b";
let prevLockScript = [
  "76", // OP_DUP
  "a9", // OP_HASH160
  "14", // Byte Length: 20
  // from Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr
  //"5bcd0d776a7252310b9f1a7eee1a749d42126944", // PubKeyHash
  "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
  "88", // OP_EQUALVERIFY
  "ac", // OP_CHECKSIG
].join("");

// TODO output u8 instead of hex
let privKeyHex =
  //"d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";
  "5d3baf90046938ba5d1b7dff3570417238547c6e1728f99d5dc879ac145f9236";

let totalInputs = 5150;
let fee =
  Tx.HEADER_SIZE +
  3 * Tx.MIN_INPUT_SIZE +
  2 * Tx.OUTPUT_SIZE +
  Tx.MAX_INPUT_PAD;
let splitValue = Math.floor((totalInputs - fee) / 2);
let sigHashType = 0x01;
let txInfo = {
  version: 3,
  inputs: [
    {
      txId: txId,
      prevIndex: 0,
      subscript: prevLockScript,
      sigHashType: sigHashType,
      getPrivateKey: function () {
        return Tx.utils.hexToU8(privKeyHex);
      },
    },
    {
      txId: txId,
      prevIndex: 1,
      subscript: prevLockScript,
      sigHashType: sigHashType,
      getPrivateKey: function () {
        return Tx.utils.hexToU8(privKeyHex);
      },
    },
  ],
  outputs: [
    {
      pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      //pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      units: splitValue,
    },
    {
      // for Xj4E...
      pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      // for XdRg...
      //pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      units: splitValue,
    },
  ],
  locktime: 0,
};

let tx = Tx.create({
  // required
  sign: async function ({ privateKey, hash }) {
    let sig = await Secp256k1.sign(hash, privateKey, {
      canonical: true,
    });

    // Just needs to be stringable
    return {
      toString: function () {
        return Tx.utils.u8ToHex(sig);
      },
    };
  },
  // convenience
  toPublicKey: function (privateKey) {
    let isCompressed = true;
    let pubKeyBuf = Secp256k1.getPublicKey(privateKey, isCompressed);
    return {
      toString: function () {
        return Tx.utils.u8ToHex(pubKeyBuf);
      },
    };
  },
  // convenience
  ripemd160: function () {},
  // convenience
  addressToPubKeyHash: function () {},
});

tx.hashAndSignAll(txInfo)
  .then(function (txInfoSigned) {
    console.error();
    console.error(txInfoSigned);
    console.error();
    console.info(txInfoSigned.transaction);
    console.error();
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:");
    console.error(err.stack || err);
    process.exit(1);
  });
