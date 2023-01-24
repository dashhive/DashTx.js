"use strict";

let Tx = require("./tx.js");

/** @type {import('node:crypto')} */
//@ts-ignore
let Crypto = exports.crypto || require("node:crypto");

//@ts-ignore
let Secp256k1 = exports.nobleSecp256k1 || require("@dashincubator/secp256k1");

/**
 * @param {Number} len
 * @returns {Uint8Array}
 */
//@ts-ignore
Secp256k1.utils.randomBytes = function (len) {
  let buf = new Uint8Array(len);
  Crypto.getRandomValues(buf);
  return buf;
};

/**
 * @param {Uint8Array} key
 * @param {Uint8Array} message
 * @returns {Promise<Uint8Array>}
 */
Secp256k1.utils.hmacSha256 = async function (key, message) {
  let ckey = await Crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"],
  );
  let buffer = await Crypto.subtle.sign("HMAC", ckey, message);

  return new Uint8Array(buffer);
};

async function main() {
  //let expectedBytes = "00ff0ff0fff00f00";
  //let u8 = Tx.utils.hexToU8("00ff0ff0fff00f00");
  //console.log(u8);

  let isCompressed = true;
  let sigHashType = 0x01;

  //let rndPrivKey = Secp256k1.utils.randomPrivateKey();
  //console.log("Random Private Key", Tx.utils.u8ToHex(rndPrivKey));

  let btcRawTxIn = {
    version: 1,
    inputs: [
      {
        txId: "77d35b87d1ad549011b66dbb06ec7b6d84b06325ee9c18cf6f3467e9b7a7bda2",
        outputIndex: 0,
        pubKeyHash: "f93af105187d21ed6adfa5d71bfada7d7324e53c",
        sigHashType: 0x01,
      },
    ],
    outputs: [
      {
        // TODO pubkeyhash or pubKeyHash, but NOT BOTH
        pubkeyhash: "f93af105187d21ed6adfa5d71bfada7d7324e53c",
        units: 190968096,
      },
    ],
  };
  // from https://bitcointalk.org/index.php?topic=651344.0
  let btcExpectedRawTx =
    "0100000001a2bda7b7e967346fcf189cee2563b0846d7bec06bb6db6119054add1875bd3770000000000ffffffff0120f1610b000000001976a914f93af105187d21ed6adfa5d71bfada7d7324e53c88ac00000000";
  let btcRawTxHex = Tx.createRaw(btcRawTxIn);

  console.log(btcRawTxHex === btcExpectedRawTx);
  console.log(btcRawTxHex);
  if (btcRawTxHex !== btcExpectedRawTx) {
    console.log(btcExpectedRawTx);
  }

  // ex: e8ecde1d813f320a96ed34f7791e9f62fc86070d5d96b881397285ddbebd7fff
  let btcSignableTxHex = Tx.createHashable(btcRawTxIn);
  let btcTxHashBuf = await Tx.hashPartial(btcSignableTxHex, sigHashType);
  console.log();
  console.log("Signable BTC Tx Hash");
  console.log(Tx.utils.u8ToHex(btcTxHashBuf));
  console.log();

  // From https://bitcointalk.org/index.php?topic=651344.0
  // cSf2Lcme2kSpkZ1s5AW8a2K2Y41P8HYGoXAevNzPUna6iXDw9boC
  let btcPrivKeyHex =
    "976917491dd96b045af13e5cf5dd81013682974f20c8a78de9f7873bb39620e8";
  let privKeyU8 = Tx.utils.hexToU8(btcPrivKeyHex);
  //console.log("pk", Tx.utils.u8ToHex(privKey));
  let btcSig = await Secp256k1.sign(btcTxHashBuf, privKeyU8, {
    canonical: false,
  });
  let btcPub = Secp256k1.getPublicKey(privKeyU8, isCompressed);
  let btcSigHex = Tx.utils.u8ToHex(btcSig);
  let btcPubHex = Tx.utils.u8ToHex(btcPub);

  console.log("Signature");
  console.log(btcSigHex);
  console.log("Public Key");
  console.log(btcPubHex);
  console.log();

  let btcSignedTxIn = {
    inputs: [
      {
        txId: btcRawTxIn.inputs[0].txId,
        outputIndex: btcRawTxIn.inputs[0].outputIndex,
        signature: btcSigHex,
        publicKey: btcPubHex,
        sigHashType: sigHashType,
      },
    ],
    outputs: btcRawTxIn.outputs,
    version: btcRawTxIn.version,
  };

  let btcSignedTx = Tx.createSigned(btcSignedTxIn);
  console.log("Signed BTC Tx:");
  console.log(btcSignedTx);
  console.log();

  //
  // Dash
  //
  let dashTxId =
    "8f8b60c864e37082dd86a3ca3979fd40b6709d6e9389781e593b5be81f31c3a8";
  let lockScript = [
    "76", // OP_DUP
    "a9", // OP_HASH160
    "14", // Byte Length: 20
    // from Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr
    "5bcd0d776a7252310b9f1a7eee1a749d42126944", // PubKeyHash
    "88", // OP_EQUALVERIFY
    "ac", // OP_CHECKSIG
  ].join("");
  let quarterValue = 1940;
  let dashSignableTxIn = {
    version: 3,
    inputs: [
      {
        txId: dashTxId,
        outputIndex: 0,
        script: lockScript,
        sigHashType: sigHashType,
      },
      {
        txId: dashTxId,
        outputIndex: 1,
        script: lockScript,
        sigHashType: sigHashType,
      },
      {
        txId: dashTxId,
        outputIndex: 2,
        script: lockScript,
        sigHashType: sigHashType,
      },
      {
        txId: dashTxId,
        outputIndex: 3,
        script: lockScript,
        sigHashType: sigHashType,
      },
    ],
    outputs: [
      {
        pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
        //pubkeyhash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
        units: quarterValue,
      },
      {
        pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
        units: quarterValue,
      },
      {
        pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
        units: quarterValue,
      },
      {
        pubkeyhash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
        units: quarterValue,
      },
    ],
  };
  //let dashResultRawTx = Tx.createRaw(dashRawTxIn);
  let dashSignableTxes = Tx.createHashableAll(dashSignableTxIn);

  // ex: e8ecde1d813f320a96ed34f7791e9f62fc86070d5d96b881397285ddbebd7fff
  // Tx.utils.createHashAndSignAll(txWithHashableInputs, signer)
  let dashTxHashBufs = await Tx.hashPartialAll(dashSignableTxes, sigHashType);
  console.log();
  console.log("Magic Signable Tx Hashes");
  for (let dashTxHashBuf of dashTxHashBufs) {
    console.log(Tx.utils.u8ToHex(dashTxHashBuf));
  }
  console.log();

  // TODO output u8 instead of hex
  let privKeyHex =
    "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";
  let privKey = Tx.utils.hexToU8(privKeyHex);
  console.log(privKey);
  //console.log("pk", Tx.utils.u8ToHex(privKey));

  /** @typedef {import('./tx.js').TxInputHashable} TxInputHashable */
  /** @typedef {import('./tx.js').TxInputSigned} TxInputSigned */
  let dashSignedTxIn = {
    /** @type {Array<TxInputHashable|TxInputSigned>} */
    inputs: [],
    outputs: dashSignableTxIn.outputs,
  };

  for (let i = 0; i < dashSignableTxIn.inputs.length; i += 1) {
    let txIn = dashSignableTxIn.inputs[i];
    // TODO hashbufs go on TxInputHashable?
    let dashTxHashBuf = dashTxHashBufs[i];

    let sig = await Secp256k1.sign(dashTxHashBuf, privKey, { canonical: true });
    let pub = Secp256k1.getPublicKey(privKey, isCompressed);
    let dashSigHex = Tx.utils.u8ToHex(sig);
    let dashPubHex = Tx.utils.u8ToHex(pub);

    console.log(`Tx Hash [${i}]`);
    console.log(Tx.utils.u8ToHex(dashTxHashBuf));
    console.log(`Signature [${i}]`);
    console.log(dashSigHex);
    console.log(`Public Key [${i}]`);
    console.log(dashPubHex);
    console.log();

    dashSignedTxIn.inputs[i] = {
      txId: txIn.txId,
      outputIndex: txIn.outputIndex,
      //@ts-ignore
      signature: dashSigHex,
      publicKey: dashPubHex,
      sigHashType: sigHashType,
    };
  }

  console.log(dashSignedTxIn.inputs);

  let resultTxSigned2 = Tx.createSigned(dashSignedTxIn);
  console.log("Signed Dash Tx:");
  console.log(resultTxSigned2);
  console.log();

  let expectedTxSigned =
    "0100000001a2bda7b7e967346fcf189cee2563b0846d7bec06bb6db6119054add1875bd377000000006a4730440220528e92bc890b362efcab0ab1af0f9427d501909be59fe22dbdb4c26eac17418102206eb9c83360ad46c9f17be32ea15a08d2765a934e08ce6f2578b3379bbfa03afd0121024451fc7d9e271fab77265bd0292fc274ee231e7ecc076bf6269999c0cbbf9f90ffffffff0120f1610b000000001976a914f93af105187d21ed6adfa5d71bfada7d7324e53c88ac00000000";
  let resultTxSigned = Tx.createSigned({
    version: 1,
    inputs: [
      {
        txId: "77d35b87d1ad549011b66dbb06ec7b6d84b06325ee9c18cf6f3467e9b7a7bda2",
        outputIndex: 0,
        signature:
          "30440220528e92bc890b362efcab0ab1af0f9427d501909be59fe22dbdb4c26eac17418102206eb9c83360ad46c9f17be32ea15a08d2765a934e08ce6f2578b3379bbfa03afd",
        publicKey:
          "024451fc7d9e271fab77265bd0292fc274ee231e7ecc076bf6269999c0cbbf9f90",
        sigHashType: sigHashType,
      },
    ],
    outputs: [
      {
        pubkeyhash: "f93af105187d21ed6adfa5d71bfada7d7324e53c",
        units: 190968096,
      },
    ],
  });

  console.log(resultTxSigned === expectedTxSigned);
  console.log(resultTxSigned);
  if (resultTxSigned !== expectedTxSigned) {
    console.log(expectedTxSigned);
  }

  process.exit(1);

  // 2 ** 8
  console.log("2^8");
  console.log(toVarIntSize(0), toVarInt(0));
  console.log(toVarIntSize(1), toVarInt(1));
  console.log(toVarIntSize(251), toVarInt(251));
  console.log(toVarIntSize(252), toVarInt(252));
  console.log(toVarIntSize(253), toVarInt(253));
  console.log(toVarIntSize(0xfe), toVarInt(0xfe));
  console.log(toVarIntSize(0xff), toVarInt(0xff));
  // 2 ** 16
  console.log("2^16");
  console.log(toVarIntSize(0x0100), toVarInt(0x0100), "fd0001");
  console.log(toVarIntSize(0x0101), toVarInt(0x0101), "fd0101");
  console.log(toVarIntSize(0xfffe), toVarInt(0xfffe), "fdfeff");
  console.log(toVarIntSize(0xffff), toVarInt(0xffff), "fdffff");
  // 2 ** 32
  console.log("2^32");
  console.log(toVarIntSize(0x00010000), toVarInt(0x00010000), "fe00000100");
  console.log(toVarIntSize(0x00010001), toVarInt(0x00010001), "fe01000100");
  console.log(toVarIntSize(0xfffffffe), toVarInt(0xfffffffe), "fefeffffff");
  console.log(toVarIntSize(0xffffffff), toVarInt(0xffffffff), "feffffffff");
  // 2 ** 53
  console.log("2^53 (Number)");
  console.log(toVarIntSize(0x0100000000), toVarInt(0x0100000000));
  console.log(toVarIntSize(0x0100000001), toVarInt(0x0100000001));
  console.log(toVarIntSize(0x1ffffffffffffe), toVarInt(0x1ffffffffffffe));
  console.log(toVarIntSize(0x1fffffffffffff), toVarInt(0x1fffffffffffff));
  // 2 ** 64
  console.log("2^64 (BigInt)");
  console.log(toVarIntSize(0x20000000000000n), toVarInt(0x20000000000000n));
  console.log(toVarIntSize(0x20000000000001n), toVarInt(0x20000000000001n));
  console.log(toVarIntSize(0xfffffffffffffffen), toVarInt(0xfffffffffffffffen));
  console.log(toVarIntSize(0xffffffffffffffffn), toVarInt(0xffffffffffffffffn));
  // overflow
  try {
    console.log(
      toVarIntSize(0x10000000000000000),
      toVarInt(0xffffffffffffffff),
    );
  } catch (e) {
    if ("E_TOO_BIG_INT" !== e.code) {
      throw e;
    }
    console.log("caught E_TOO_BIG_INT as expected");
  }
}

main()
  .then(function () {
    console.log("PASS");
    process.exit(0);
  })
  .catch(function (e) {
    console.error(e.stack || e);
    process.exit(1);
  });
