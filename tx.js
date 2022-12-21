"use strict";

const VERSION = 3;
const MAX_U16 = Math.pow(2, 16) - 1;
const MAX_U32 = Math.pow(2, 32) - 1;
const MAX_U51 = Math.pow(2, 51) - 1;
const MAX_U64 = 2n ** 64n - 1n;
const E_LITTLE_INT =
  "JavaScript 'Number's only go up to uint51, you must use 'BigInt' (ex: `let amount = 18014398509481984n`) for larger values";
const E_TOO_BIG_INT =
  "JavaScript 'BigInt's are arbitrarily large, but you may only use up to UINT64 for transactions";

function createTx({
  version = VERSION,
  inputs /*, outputs, maxFee = 10000 */,
}) {
  let tx = [];
  let v = toUint32LE(version);
  tx.push(v);

  let nInputs = toVarInt(inputs.length);

  let txHex = tx.join("");
  return txHex;
}

/**
 * Caution: JS can't handle 64-bit ints
 * @param {BigInt|Number} n - 64-bit BigInt or < 52-bit Number
 */
function toVarInt(n) {
  if (n < 253) {
    return n;
  }

  if (n <= MAX_U16) {
    return "fd" + toUint32LE(n).slice(0, 4);
  }

  if (n <= MAX_U32) {
    return "fe" + toUint32LE(n);
  }

  if (n <= MAX_U51) {
    return "ff" + toUint64LE(n);
  }

  if ("bigint" !== typeof n) {
    throw new Error(E_LITTLE_INT);
  }

  if (n <= MAX_U64) {
    return "ff" + toUint64LE(n);
  }

  throw new Error(E_TOO_BIG_INT);
}

/**
 * @param {BigInt|Number} n
 * @returns {Number}
 */
function toVarIntSize(n) {
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

  throw new Error(E_TOO_BIG_INT);
}

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

  let hexLE = "";
  for (let i = hex.length - 2; i >= 0; i -= 2) {
    hexLE += hex.slice(i, i + 2);
  }

  // 0x03000000
  return hexLE;
}

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

console.log(createTx({ inputs: [] }));
console.log(toUint64LE(3));
console.log(toUint32LE(3));
let randBn =
  0b1100110011010000110000011111110110101010100111010100100001110000n;
console.log(toUint64LE(randBn));
// 2 ** 8
console.log(toVarIntSize(0), toVarInt(0));
console.log(toVarIntSize(1), toVarInt(1));
console.log(toVarIntSize(251), toVarInt(251));
console.log(toVarIntSize(252), toVarInt(252));
console.log(toVarIntSize(253), toVarInt(253));
console.log(toVarIntSize(254), toVarInt(254));
console.log(toVarIntSize(255), toVarInt(255));
console.log(toVarIntSize(256), toVarInt(256));
console.log(toVarIntSize(257), toVarInt(257));
// 2 ** 16
console.log(toVarIntSize(65534), toVarInt(65534));
console.log(toVarIntSize(65535), toVarInt(65535));
console.log(toVarIntSize(65536), toVarInt(65536));
console.log(toVarIntSize(65537), toVarInt(65537));
// 2 ** 32
console.log(toVarIntSize(4294967294), toVarInt(4294967294));
console.log(toVarIntSize(4294967295), toVarInt(4294967295));
console.log(toVarIntSize(4294967296), toVarInt(4294967296));
console.log(toVarIntSize(4294967297), toVarInt(4294967297));
// 2 ** 64
console.log(toVarIntSize(randBn), toVarInt(randBn));

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
