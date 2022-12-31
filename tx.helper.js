"use strict";

/** @typedef {import('./tx.js').TxInputHashable} TxInputHashable */
/** @typedef {import('./tx.js').TxInputSigned} TxInputSigned */
let Tx = require("./tx.js");

//@ts-ignore
let Secp256k1 = exports.nobleSecp256k1 || require("@dashincubator/secp256k1");

let HEADER_SIZE =
  4 /*version*/ + 1 /*input count*/ + 1 /* outputcount */ + 4; /*locktime*/
let MIN_INPUT_SIZE = // 147~149 each
  4 + // prevIndex
  32 + // txid
  1 + // sigscriptsize
  106 + // sigscript
  4; // sequence
let OUTPUT_SIZE = // 34 each
  8 + // base units value
  1 + // lockscript size
  25; // lockscript
let extraCost = // possible BigInt padding
  1 + // Signature R value
  1 + // Signature S value
  1; // Public Key value
//let minimumCost = HEADER_SIZE + MIN_INPUT_SIZE + OUTPUT_SIZE + extraCost;

//
// Dash
//
let dashTxId =
  "bb21ec7a3d8ae52005a4eb2278c6cb5197d7eec17812d0ff94b3eb8d3f1e5413";
let lockScript = [
  "76", // OP_DUP
  "a9", // OP_HASH160
  "14", // Byte Length: 20
  // from Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr
  "5bcd0d776a7252310b9f1a7eee1a749d42126944", // PubKeyHash
  "88", // OP_EQUALVERIFY
  "ac", // OP_CHECKSIG
].join("");

// TODO output u8 instead of hex
let privKeyHex =
  "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";

let totalInputs = 6194;
let fee = HEADER_SIZE + 3 * MIN_INPUT_SIZE + 2 * OUTPUT_SIZE + extraCost;
let splitValue = Math.floor((totalInputs - fee) / 2);
let sigHashType = 0x01;
let dashSignableTxIn = {
  version: 3,
  //sigHashType: sigHashType,
  inputs: [
    {
      txId: dashTxId,
      prevIndex: 0,
      subscript: lockScript,
      sigHashType: sigHashType,
      getPrivateKey: function () {
        return Tx.utils.hexToU8(privKeyHex);
      },
    },
    {
      txId: dashTxId,
      prevIndex: 1,
      subscript: lockScript,
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
      pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      units: splitValue,
    },
  ],
  /*
  getPrivateKeys: function () {
    return [
      Tx.utils.hexToU8(
        "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246",
      ),
      Tx.utils.hexToU8(
        "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246",
      ),
    ];
  },
  */
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
  addressToPubKeyHash: function () {},
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
});

tx.hashAndSignAll(dashSignableTxIn)
  .then(function (txInfo) {
    console.error();
    console.error(txInfo);
    console.error();
    console.info(txInfo.transaction);
    console.error();
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:");
    console.error(err.stack || err);
    process.exit(1);
  });
