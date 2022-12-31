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

Tx.create = function (myUtils) {
  async function hashAndSignAll(txInfo) {
    let sigHashType = 0x01;

    /*
    let privateKeys = txInfo?.getPrivateKeys() || [];

    let numInputs = txInfo.inputs?.length || 0;
    let numPrivateKeys = privateKeys.length || 0;
    let hasPrivateKeys = numInputs === numPrivateKeys;
    if (!hasPrivateKeys) {
      throw new Error(
        `expected 'getPrivateKeys()' to return a list of '${numInputs}' private keys to match '${numInputs}' inputs, but got '${numPrivateKeys}' instead`,
      );
    }
    */

    let txInfoSigned = {
      /** @type {Array<TxInputHashable|TxInputSigned>} */
      inputs: [],
      outputs: txInfo.outputs,
    };

    // TODO should copy getPrivateKeys
    let txHashables = Tx.createHashableAll(txInfo);

    // TODO subscript -> lockScript, sigScript
    //let lockScriptHex = txInput.subscript;
    let txHashBufs = await Tx.hashPartialAll(txHashables, sigHashType);

    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let txInput = txInfo.inputs[i];
      let txHashBuf = txHashBufs[i];
      let privKey = txInput.getPrivateKey();
      //let privKey = privateKeys[i];

      let sigHex = await myUtils.sign({
        privateKey: privKey,
        hash: txHashBuf,
      });

      let pubKeyHex = txInput.publicKey;
      if (!pubKeyHex) {
        pubKeyHex = myUtils.toPublicKey(privKey);
      }

      let _sigHashType = txInput.sigHashType ?? sigHashType;
      let txInputSigned = {
        txId: txInput.txId,
        prevIndex: txInput.prevIndex,
        signature: sigHex.toString(),
        publicKey: pubKeyHex.toString(),
        sigHashType: _sigHashType,
      };

      // expose _actual_ values used, for debugging
      let txHashHex = Tx.utils.u8ToHex(txHashBuf);
      txInput._hash = txHashHex;
      txInput._signature = sigHex.toString();
      txInput._lockScript = txInfo.inputs[i].subscript;
      txInput._publicKey = pubKeyHex.toString();
      txInput._sigHashType = sigHashType;

      txInfoSigned.inputs[i] = txInputSigned;
    }

    console.log(txInfoSigned.inputs);
    let transaction = Tx.createSigned(txInfoSigned);

    return {
      inputs: txInfo.inputs,
      locktime: txInfo.locktime || 0x0,
      outputs: txInfo.outputs,
      transaction: transaction,
      version: txInfo.version,
    };
  }

  return {
    hashAndSignAll: hashAndSignAll,
  };
};

//
// Dash
//
let dashTxId =
  "06ecf5ea965875912355ea8c98f14672cc46efac1e6148b27576d7f502ebd2c9";
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

let totalInputs = 6716;
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
      pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      //pubkeyhash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      units: splitValue,
    },
    {
      pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      units: splitValue,
    },
  ],
  getPrivateKeys: function () {
    return [
      Tx.utils.hexToU8(
        "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246",
      ),
      Tx.utils.hexToU8(
        "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246",
      ),
      Tx.utils.hexToU8(
        "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246",
      ),
    ];
  },
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
    console.info();
    console.error(txInfo);
    console.info();
    console.info(txInfo.transaction);
    console.info();
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:");
    console.error(err.stack || err);
    process.exit(1);
  });
