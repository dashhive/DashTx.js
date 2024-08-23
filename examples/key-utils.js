"use strict";

let Secp256k1 = require("@dashincubator/secp256k1");

/** @typedef {Required<import('dashtx').TxKeyUtils>} TxKeyUtils */
/**
 * @typedef KeyUtilsPartial
 * @prop {KeySet} set
 */
/** @typedef {TxKeyUtils & KeyUtilsPartial} KeyUtils */

/**
 * @callback KeySet
 * @param {String} id
 * @param {KeyInfo} keyInfo
 */

/** @type {KeyUtils} */
let KeyUtils = module.exports;

/**
 * @typedef KeyInfo
 * @prop {String} [walletId] - from DashHd.toId(walletKey)
 * @prop {String} [hdpath] - ex: m/44'/5'/0'/0/0
 * @prop {String} address - generally convenient
 * @prop {Uint8Array} privateKey - for signing
 * @prop {Uint8Array} publicKey - for TxInput
 * @prop {String} pubKeyHash - for TxOutput
 */

/** @type Object.<String, KeyInfo> */
let keysMap = {};

KeyUtils.set = function (id, keyInfo) {
  if (!id) {
    throw new Error(`key identifier is not defined)`);
  }
  keysMap[id] = keyInfo;
};

KeyUtils.sign = async function (privKeyBytes, hashBytes) {
  let sigOpts = { canonical: true, extraEntropy: true };
  let sigBytes = await Secp256k1.sign(hashBytes, privKeyBytes, sigOpts);
  return sigBytes;
};
KeyUtils.getPrivateKey = async function (input) {
  if (!input.address) {
    //throw new Error('should put the address on the input there buddy...');
    console.warn("missing address:", input.txid, input.outputIndex);
    return null;
  }

  let keyInfo = keysMap[input.address];
  return keyInfo.privateKey;
};

KeyUtils.getPublicKey = async function (txInput, i) {
  let privKeyBytes = await KeyUtils.getPrivateKey(txInput, i);
  if (!privKeyBytes) {
    return null;
  }
  let pubKeyBytes = await KeyUtils.toPublicKey(privKeyBytes);

  return pubKeyBytes;
};

KeyUtils.toPublicKey = async function (privKeyBytes) {
  let isCompressed = true;
  let pubKeyBytes = Secp256k1.getPublicKey(privKeyBytes, isCompressed);

  return pubKeyBytes;
};
