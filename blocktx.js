(function (exports) {
  "use strict";

  let Tx = {};

  //@ts-ignore
  let Crypto = exports.crypto || require("./shims/node-crypto.js");

  //@ts-ignore
  exports.BlockTx = Tx;
  if ("undefined" !== typeof module) {
    module.exports = Tx;
  }

  Tx.utils = {};

  const VERSION = 3;

  const MAX_U16 = Math.pow(2, 16) - 1;
  const MAX_U32 = Math.pow(2, 32) - 1;
  const MAX_U52 = Number.MAX_SAFE_INTEGER;
  const MAX_U64 = 2n ** 64n - 1n;

  const CH_0 = 48;
  const CH_9 = 57;
  const CH_A = 97;
  const CH_F = 102;

  const OP_DUP = "76";
  const OP_HASH160 = "a9";
  const OP_EQUALVERIFY = "88";
  const OP_CHECKSIG = "ac";
  const PKH_SIZE = (20).toString(16); // 0x14
  const PKH_SCRIPT_SIZE = (25).toString(16); // 0x19

  const E_LITTLE_INT =
    "JavaScript 'Number's only go up to uint51, you must use 'BigInt' (ex: `let amount = 18014398509481984n`) for larger values";
  const E_TOO_BIG_INT =
    "JavaScript 'BigInt's are arbitrarily large, but you may only use up to UINT64 for transactions";

  Tx.HEADER_SIZE =
    4 + // version
    1 + // input count
    1 + // output count
    4; // locktime

  Tx.MIN_INPUT_SIZE = // 147~149 each
    4 + // prevIndex
    32 + // txid
    1 + // sigscriptsize
    106 + // sigscript
    4; // sequence

  Tx.MAX_INPUT_PAD = // possible BigInt padding
    1 + // Signature R value
    1 + // Signature S value
    1; // Public Key value

  Tx.MAX_INPUT_SIZE = Tx.MIN_INPUT_SIZE + Tx.MAX_INPUT_PAD;

  Tx.OUTPUT_SIZE = // 34 each
    8 + // base units value
    1 + // lockscript size
    25; // lockscript

  /**
   * @param {TxDeps} myUtils
   */
  Tx.create = function (myUtils) {
    /**
     * @param {TxInfo} txInfo
     */
    async function hashAndSignAll(txInfo) {
      return await Tx._hashAndSignAll(txInfo, myUtils);
    }

    return {
      hashAndSignAll: hashAndSignAll,
    };
  };

  /**
   * @param {Object} txInfo
   * @param {Array<TxInputRaw>} txInfo.inputs
   * @param {Array<TxOutput>} txInfo.outputs
   * @param {Number} [txInfo.version]
   * @param {Boolean} [txInfo._debug] - bespoke debug output
   * @param {TxDeps} myUtils
   */
  Tx._hashAndSignAll = async function (txInfo, myUtils) {
    let sigHashType = 0x01;

    let txInfoSigned = {
      /** @type {Array<TxInputHashable|TxInputSigned>} */
      inputs: [],
      outputs: txInfo.outputs,
    };

    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let txInput = txInfo.inputs[i];
      // TODO subscript -> lockScript, sigScript
      //let lockScriptHex = txInput.subscript;
      let txHashable = Tx.createHashable(txInfo, i);
      let txHashBuf = await Tx.hashPartial(txHashable, txInput.sigHashType);
      let privKey = txInput.getPrivateKey();

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

    let transaction = Tx.createSigned(txInfoSigned);

    return {
      inputs: txInfo.inputs,
      locktime: txInfo.locktime || 0x0,
      outputs: txInfo.outputs,
      transaction: transaction,
      version: txInfo.version,
    };
  };

  /**
   * @param {Object} opts
   * @param {Array<TxInputRaw>} opts.inputs
   * @param {Array<TxOutput>} opts.outputs
   * @param {Number} [opts.version]
   * @param {Boolean} [opts._debug] - bespoke debug output
   */
  Tx.createRaw = function (opts) {
    opts = Object.assign({}, opts);
    opts.inputs = opts.inputs.map(function (input) {
      return {
        txId:
          input.txId ??
          //@ts-ignore
          input.txid,
        prevIndex:
          input.prevIndex ??
          //@ts-ignore
          input.index ??
          //@ts-ignore
          input.vout,
      };
    });

    let hex = Tx._create(opts);
    return hex;
  };

  /**
   * @param {TxInfo} txInfo
   * @param {Number} inputIndex - create hashable tx for this input
   * @returns {String} - hashable tx hex
   */
  Tx.createHashable = function (txInfo, inputIndex) {
    let txInfoHashable = Object.assign({}, txInfo);
    /** @type {Array<TxInputRaw|TxInputHashable>} */
    //@ts-ignore
    txInfoHashable.inputs = txInfo.inputs.map(function (input, i) {
      if (inputIndex !== i) {
        return {
          txId: input.txId,
          prevIndex: input.prevIndex,
        };
      }

      let subscript = input.subscript;
      if (!subscript) {
        if (!input.pubKeyHash) {
          throw new Error(
            `signable input must have either 'pubKeyHash' or 'subscript'`,
          );
        }
        subscript = `${PKH_SCRIPT_SIZE}${OP_DUP}${OP_HASH160}${PKH_SIZE}${input.pubKeyHash}${OP_EQUALVERIFY}${OP_CHECKSIG}`;
      }
      return {
        txId: input.txId,
        prevIndex: input.prevIndex,
        pubKeyHash: input.pubKeyHash,
        sigHashType: input.sigHashType,
        subscript: subscript,
      };
    });

    let hex = Tx._create(txInfoHashable);
    return hex;
  };

  /**
   * @param {Object} opts
   * @param {Array<TxInputSigned>} opts.inputs
   * @param {Array<TxOutput>} opts.outputs
   * @param {Number} [opts.version]
   * @param {Boolean} [opts._debug] - bespoke debug output
   * xparam {String} [opts.sigHashType] - hex, typically 01
   */
  Tx.createSigned = function (opts) {
    let hex = Tx._create(opts);
    return hex;
  };

  /**
   * @param {Object} opts
   * @param {Array<TxInputRaw|TxInputHashable|TxInputSigned>} opts.inputs
   * @param {Array<TxOutput>} opts.outputs
   * @param {Number} [opts.version]
   * @param {Boolean} [opts._debug] - bespoke debug output
   */
  Tx._create = function ({
    version = VERSION,
    inputs,
    locktime = 0,
    outputs,
    /* maxFee = 10000, */
    _debug = false,
  }) {
    let sep = "";
    if (_debug) {
      sep = "\n";
    }

    let tx = [];
    let v = toUint32LE(version);
    tx.push(v);

    let nInputs = Tx.utils.toVarInt(inputs.length);
    tx.push(nInputs);

    inputs.forEach(function (input) {
      let inputHex = [];
      //@ts-ignore
      let txid = input.txid ?? input.txId;

      if (!txid) {
        throw new Error("missing required utxo property 'txid'");
      }

      if (64 !== txid.length) {
        throw new Error(
          `expected uxto property 'txid' to be a valid 64-character (32-byte) hex string, but got '${txid}' (size ${txid.length})`,
        );
      }

      assertHex(txid, "txid");

      let reverseTxid = Tx.utils.reverseHex(txid);
      inputHex.push(reverseTxid);

      //@ts-ignore
      let voutIndex = input.prevIndex ?? input.index ?? input.vout;
      if (isNaN(voutIndex)) {
        throw new Error(
          "expected utxo property'vout' to be an integer representing this input's previous output index",
        );
      }
      let reverseVout = toUint32LE(voutIndex);
      inputHex.push(reverseVout);

      let sigScriptSize = "00";
      let sigScript = "";
      if (input.signature) {
        let sigHashTypeVar = Tx.utils.toVarInt(input.sigHashType);
        let sig = `${input.signature}${sigHashTypeVar}`;
        let sigSize = Tx.utils.toVarInt(sig.length / 2);

        let keySize = Tx.utils.toVarInt(input.publicKey.length / 2);
        sigScript = `${sigSize}${sig}${keySize}${input.publicKey}`;
        let _sigScriptSize = sigScript.length / 2;
        sigScriptSize = Tx.utils.toVarInt(_sigScriptSize);
      } else if (input.subscript) {
        sigScript = input.subscript;
        let _sigScriptSize = input.subscript.length / 2;
        sigScriptSize = Tx.utils.toVarInt(_sigScriptSize);
      }
      inputHex.push(sigScriptSize);
      inputHex.push(sigScript);

      let sequence = "ffffffff";
      inputHex.push(sequence);

      tx.push(inputHex.join(sep));
    });

    let nOutputs = Tx.utils.toVarInt(outputs.length);
    tx.push(nOutputs);

    if (!outputs.length) {
      throw new Error(
        `'outputs' list cannot empty (length 0) - TODO add a 'donate: true' option`,
      );
    }
    outputs.forEach(function (output, i) {
      let units = toUint64LE(output.units);
      tx.push(units);

      assertHex(output.pubKeyHash, `output[${i}].pubKeyHash`);
      let lockScript = `${PKH_SCRIPT_SIZE}${OP_DUP}${OP_HASH160}${PKH_SIZE}${output.pubKeyHash}${OP_EQUALVERIFY}${OP_CHECKSIG}`;
      tx.push(lockScript);
    });

    let locktimeHex = toUint32LE(locktime);
    tx.push(locktimeHex);

    let txHex = tx.join(sep);
    return txHex;
  };

  /**
   * @param {String} txHex - signable tx hex (like raw tx, but with subscript)
   * @returns {Promise<String>} - the reversed double-sha256sum of a ready-to-broadcast tx hex
   */
  Tx.getId = async function (txHex) {
    let u8 = Tx.utils.hexToU8(txHex);
    //console.log("Broadcastable Tx Buffer");
    //console.log(u8);

    let hashU8 = await Tx._hash(u8);

    let reverseU8 = new Uint8Array(hashU8.length);
    let reverseIndex = reverseU8.length - 1;
    hashU8.forEach(function (b) {
      reverseU8[reverseIndex] = b;
      reverseIndex -= 1;
    });

    //console.log("Reversed Round 2 Hash Buffer");
    //console.log(reverseU8);

    let id = Tx.utils.u8ToHex(reverseU8);
    return id;
  };

  /**
   * @param {String} txHex - signable tx hex (like raw tx, but with subscript)
   * @param {Number} sigHashType - typically 0x01 (SIGHASH_ALL) for signable
   * @returns {Promise<Uint8Array>}
   */
  Tx.hashPartial = async function (txHex, sigHashType = 0x01) {
    let txSignable = txHex;
    if (sigHashType) {
      let sigHashTypeHex = toUint32LE(sigHashType);
      txSignable = `${txSignable}${sigHashTypeHex}`;
    }
    //console.log("Signable Tx Hex");
    //console.log(txSignable);

    let u8 = Tx.utils.hexToU8(txSignable);
    //console.log("Signable Tx Buffer");
    //console.log(u8);

    let hashU8 = await Tx._hash(u8);
    return hashU8;
  };

  /**
   * @param {Uint8Array} u8
   * @returns {Promise<Uint8Array>} - the reversed double-sha256sum
   */
  Tx._hash = async function (u8) {
    let ab = await Crypto.subtle.digest({ name: "SHA-256" }, u8);
    //console.log("Round 1 Hash Buffer");
    //console.log(ab);

    ab = await Crypto.subtle.digest({ name: "SHA-256" }, ab);
    let hashU8 = new Uint8Array(ab);

    //console.log("Round 2 Hash Buffer");
    //console.log(hashU8);

    return hashU8;
  };

  // TODO Tx.utils.sha256sha256(txHex, inputs, sigHashType)
  // TODO Tx.signInput(txHash, input, sigHashType)
  // TODO Tx.utils.isTxInputSigned(txHash, input)

  /**
   * @param {String} hex
   * @param {String} propName - internal use
   */
  function assertHex(hex, propName) {
    for (let i = 0; i < hex.length; i += 1) {
      let lowerChar = hex[i].charCodeAt(0) | 0x20;

      let isNum = lowerChar >= CH_0 && lowerChar <= CH_9;
      let isAlpha = lowerChar >= CH_A && lowerChar <= CH_F;

      let isHex = isNum || isAlpha;
      if (!isHex) {
        throw new Error(
          `expected each character of utxo property '${propName}' to be hex encoded but saw '${lowerChar}' in '${hex}'`,
        );
      }
    }
  }

  /**
   * Caution: JS can't handle 64-bit ints
   * @param {BigInt|Number} n - 64-bit BigInt or < 52-bit Number
   */
  Tx.utils.toVarInt = function (n) {
    if (n < 253) {
      return n.toString(16).padStart(2, "0");
    }

    if (n <= MAX_U16) {
      return "fd" + toUint32LE(n).slice(0, 4);
    }

    if (n <= MAX_U32) {
      return "fe" + toUint32LE(n);
    }

    if (n <= MAX_U52) {
      return "ff" + toUint64LE(n);
    }

    if ("bigint" !== typeof n) {
      let err = new Error(E_LITTLE_INT);
      //@ts-ignore
      err.code = "E_LITTLE_INT";
      throw err;
    }

    if (n <= MAX_U64) {
      return "ff" + toUint64LE(n);
    }

    let err = new Error(E_TOO_BIG_INT);
    //@ts-ignore
    err.code = "E_TOO_BIG_INT";
    throw err;
  };

  /**
   * @param {BigInt|Number} n
   * @returns {Number}
   */
  Tx.utils.toVarIntSize = function (n) {
    if (n < 253) {
      return 1;
    }

    if (n <= MAX_U16) {
      return 3;
    }

    if (n <= MAX_U32) {
      return 5;
    }

    if (n <= MAX_U64) {
      return 9;
    }

    let err = new Error(E_TOO_BIG_INT);
    //@ts-ignore
    err.code = "E_TOO_BIG_INT";
    throw err;
  };

  /**
   * Just assumes that all target CPUs are Little-Endian,
   * which is true in practice, and much simpler.
   * @param {BigInt|Number} n - 32-bit positive int to encode
   */
  function toUint32LE(n) {
    // make sure n is uint32/int52, not int32
    //n = n >>> 0;

    // 0x00000003
    let hex = n.toString(16).padStart(8, "0");

    let hexLE = Tx.utils.reverseHex(hex);
    return hexLE;
  }

  /**
   * @param {String} hex
   */
  Tx.utils.reverseHex = function (hex) {
    let hexLE = [];
    for (let i = hex.length - 2; i >= 0; i -= 2) {
      hexLE.push(hex.slice(i, i + 2));
    }

    // ex: 0x03000000
    return hexLE.join("");
  };

  /**
   * @param {String} hex
   */
  Tx.utils.hexToU8 = function (hex) {
    let bufLen = hex.length / 2;
    let u8 = new Uint8Array(bufLen);

    let i = 0;
    let index = 0;
    let lastIndex = hex.length - 2;
    for (;;) {
      if (i > lastIndex) {
        break;
      }

      let h = hex.slice(i, i + 2);
      let b = parseInt(h, 16);
      u8[index] = b;

      i += 2;
      index += 1;
    }

    return u8;
  };

  /**
   * @param {Uint8Array} u8
   * @returns {String} hex
   */
  //@ts-ignore
  Tx.utils.u8ToHex = function (u8) {
    /** @type {Array<String>} */
    let hex = [];

    u8.forEach(function (b) {
      let h = b.toString(16).padStart(2, "0");
      hex.push(h);
    });

    return hex.join("");
  };

  /**
   * This can handle Big-Endian CPUs, which don't exist,
   * and looks too complicated.
   * @param {BigInt|Number} n - 64-bit BigInt or <= 51-bit Number to encode
   * @returns {String} - 8 Little-Endian bytes
   */
  function toUint64LE(n) {
    let bn;
    if ("bigint" === typeof n) {
      bn = n;
    } else {
      //@ts-ignore
      bn = BigInt(n);
    }

    let u8 = new Uint8Array(8);
    let byteOffset = 0;
    let dv = new DataView(u8.buffer);
    let endianness = true; /* littleEndian */
    dv.setBigUint64(byteOffset, bn, endianness);

    /** @type {Array<String>} */
    let hexArr = [];
    u8.forEach(function (i) {
      let h = i.toString(16).padStart(2, "0");
      hexArr.push(h);
    });
    let hex = hexArr.join("");

    return hex;
  }

/*
03 00 00 00 # version
02 # number of inputs (varint)

8888888877777777777777666666666666555555555544444444333333222211 txid
0d 00 00 00 # vout (13)
    # all of this is sig script, as per go code
    6a # script sig size # 1 when removed (106 (or 36? sans sig)) #
        47 # sig size (71)
            # Removed for TxID?
            30 44 # asn1 sequence + size (68)
            02 20 # asn1 byte type + size (32)
            232013ba40cbc3a6f2e0a3a6571aa318bed30bb13de200c13c9d9dac8725e633
            02 20 # asn1 byte type + size (32)
            72ec601c58e35235d5dd273cac467f1d0f4d15b7841b78a75d0903d56cc34b4c
        01 # SigHashType (placed after sequence during hash??)
        21 # size (33)
        03 # ??? (pk quadrant? / compressed)
        755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb #pk
ff ff ff ff # sequence

5555666666666666777777777777778888888888888888999999999999999999
1b 00 00 00
    6a
    47
        30 44
        02 20
        66d7860c09698c8366ea6be2f072c1b4b835621f6f42a2c5dcd48220a160edb4
        02 20
        7fee09efb55427ed9ec38c8d8eb0269cbc0de5f4a6433b6316ac0c36e60f50a2
    01
    21
    03
    0b4c499b4223a0089958daa43e58638ebe40864448a1b0fe2d9b40633df880a4
ff ff ff ff # sequence

02 # number of outputs

b3 24 00 00 00 00 00 00 # satoshis
# output script 1
19 # script size (25)
  76
  a9
  14 # (20)
  1e0a6ef6085bb8af443a9e7f8941e61deb09fb54 # pay addr 1
  88
  ac
b3 24 00 00 00 00 00 00 # satoshis
# output script 2
19
  76
  a9
  14
  5bcd0d776a7252310b9f1a7eee1a749d42126944
  88
  ac

00 00 00 00 # lock time
*/
})(("undefined" !== typeof module && module.exports) || window);

/**
 * @typedef TxInput
 * @prop {String} txId - hex (not pre-reversed)
 * @prop {Number} prevIndex - index in previous tx's output (vout index)
 * @prop {String} signature - hex-encoded ASN.1 (DER) signature (starts with 0x30440220 or  0x30440221)
 * @prop {String} [subscript] - the previous lock script (default: derived from public key as p2pkh)
 * @prop {String} publicKey - hex-encoded public key (typically starts with a 0x02 or 0x03 prefix)
 * @prop {String} [pubKeyHash] - the 20-byte pubKeyHash (address without magic byte or checksum)
 * @prop {Number} sigHashType - typically 0x01 (SIGHASH_ALL)
 */

/**
 * @typedef TxInputRaw
 * @prop {String} txId - hex (not pre-reversed)
 * @prop {Number} prevIndex - index in previous tx's output (vout index)
 */

/**
 * @typedef TxInputHashable
 * @prop {String} txId - hex (not pre-reversed)
 * @prop {Number} prevIndex - index in previous tx's output (vout index)
 * @prop {String} [signature] - (included as type hack)
 * @prop {String} [subscript] - the previous lock script (default: derived from public key as p2pkh)
 * @prop {String} [publicKey] - hex-encoded public key (typically starts with a 0x02 or 0x03 prefix)
 * @prop {String} [pubKeyHash] - the 20-byte pubKeyHash (address without magic byte or checksum)
 * @prop {Number} sigHashType - typically 0x01 (SIGHASH_ALL)
 */

/**
 * @typedef {Pick<TxInput, "txId"|"prevIndex"|"signature"|"publicKey"|"sigHashType">} TxInputSigned
 */

/**
 * @typedef TxOutput
 * @prop {String} pubKeyHash - payaddr's raw hex value (decoded, not Base58Check)
 * @prop {Number} units - the number of smallest units of the currency (duffs / satoshis)
 */

/**
 * @typedef TxInfo
 * @prop {Array<TxInputHashable>} inputs
 * @prop {Number} locktime - 0 by default
 * @prop {Array<TxOutput>} outputs
 * @prop {Number} [version]
 * @prop {String} [transaction] - signed transaction hex
 * @prop {Boolean} [_debug] - bespoke debug output
 */

/**
 * @typedef TxDeps
 * @param {TxSign} sign
 * @param {TxToPublicKey} toPublicKey
 */

/**
 * @callback TxSign
 * @param {TxInfo} txInfo
 * @returns {TxInfo}
 */

/**
 * @callback TxToPublicKey
 * @param {Uint8Array} privateKey
 * @returns {String} - public key hex
 */
