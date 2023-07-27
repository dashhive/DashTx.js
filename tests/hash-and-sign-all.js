"use strict";

let Zora = require("zora");

/** @typedef {import('../dashtx.js').TxInputHashable} TxInputHashable */
/** @typedef {import('../dashtx.js').TxInputSigned} TxInputSigned */
let Tx = require("../dashtx.js");

//@ts-ignore
let Secp256k1 = exports.nobleSecp256k1 || require("@dashincubator/secp256k1");

//
// Example using Dash
//
let rawtx =
  "03000000022b35e8bd64852ae0277a7a4ab6d6293f477f27e859251d27a9a3ebcb5855307f000000006b48304502210098ba308087f7bcc5d9f6c347ffd633422bbbe8d44a20c21a2d5574da35d0a2070220026cae84cec2d96fd4e1a837ab0f3a559fdbd4b19bdd60c4dec450565f79f5f3012103e10848073f3f92f43d718ed1be39afe7314e410eb7080bbc4474e82fe88c5cf2ffffffff2b35e8bd64852ae0277a7a4ab6d6293f477f27e859251d27a9a3ebcb5855307f010000006b483045022100a6ec8b004c6e24047df4a9b2198a42c92862c4b3ad7ac989c85a04ba86fbdb3702200febea2871834d70c1c9d754cbe8163def8f1f721eb8b833098e01bd49ccae65012103e10848073f3f92f43d718ed1be39afe7314e410eb7080bbc4474e82fe88c5cf2ffffffff020a090000000000001976a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac0a090000000000001976a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac00000000";

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
      outputIndex: 0,
      script: prevLockScript,
      sigHashType: sigHashType,
    },
    {
      txId: txId,
      outputIndex: 1,
      script: prevLockScript,
      sigHashType: sigHashType,
    },
  ],
  outputs: [
    {
      pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      //pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      satoshis: splitValue,
    },
    {
      // for Xj4E...
      pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      // for XdRg...
      //pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      satoshis: splitValue,
    },
  ],
  locktime: 0,
};

Zora.test("reproduce known rawtx", async function (t) {
  let keysMap = {};
  keysMap[prevLockScript] = Tx.utils.hexToU8(privKeyHex);

  let tx = Tx.create({
    sign: async function (privateKey, hash) {
      let sigOpts = {
        canonical: true,
        // ONLY FOR TESTING: use deterministic signature (rather than random)
        extraEntropy: null,
      };
      let sigBuf = await Secp256k1.sign(hash, privateKey, sigOpts);
      return sigBuf;
    },
    getPrivateKey: async function (txInput) {
      let privKey = keysMap[txInput.script];
      return privKey;
    },
    // convenience
    toPublicKey: async function (privateKey) {
      let isCompressed = true;
      let pubKeyBuf = Secp256k1.getPublicKey(privateKey, isCompressed);
      return pubKeyBuf;
    },
    // convenience
    //ripemd160: function () {},
    // convenience
    //addressToPubKeyHash: function () {},
  });

  await tx
    .hashAndSignAll(txInfo /*, keys*/)
    .then(function (txInfoSigned) {
      t.equal(txInfoSigned.transaction, rawtx);
    })
    .catch(function (err) {
      t.ok(false, err.message);
    });
});
