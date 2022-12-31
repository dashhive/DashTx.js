# [@dashincubator/blocktx](https://github.com/dashhive/blocktx.js)

Create a transaction for a crypto-currency network. \
(Bitcoin, BTC, BSV, BCH, DASH, Doge, etc)

Server and browser compatible. Vanilla JS. 0 Dependencies.

## Table of Contents

- Install & Initialize
  - Bun, Deno, Node
  - Vite, WebPack
  - Browsers
- Example Usage
- Example Output
- API
- Anatomy of a Blockchain Transaction
- CLI Debugger

## Install & Initialize

### Bun, Deno, Node, WebPack, Vite

```sh
npm install --save @dashincubator/blocktx
```

Note: You must provide your own `sign()` function, as shown above.

```js
"use strict";

let Tx = require("@dashincubator/blocktx");
let tx = Tx.create({ sign: sign });

let Secp256k1 = require("@dashincubator/secp256k1");

async function sign({ privateKey, hash }) {
  let sigOpts = { canonical: true };
  let sigBuf = await Secp256k1.sign(hash, privateKey, sigOpts);
  return Tx.utils.u8ToHex(sigBuf);
}

// ...
```

### Browsers

```html
<script src="https://unpkg.com/@dashincubator/secp256k1/secp256k1.js"></script>
<script src="https://unpkg.com/@dashincubator/blocktx/blocktx.js"></script>
```

Note: You must provide your own `sign()` function, as shown below.

```js
(function () {
  "use strict";

  let Tx = window.BlockTx;
  let tx = Tx.create({ sign: sign });

  let Secp256k1 = window.nobleSecp256k1;

  async function sign({ privateKey, hash }) {
    let sigOpts = { canonical: true };
    let sigBuf = await Secp256k1.sign(hash, privateKey, sigOpts);
    return Tx.utils.u8ToHex(sigBuf);
  }

  // ...
})();
```

### Example Usage

See also: [example.js](/example.js).

Note: You must provide your own `sign()` function, as shown above.

```js
let txInfo = {
  version: 3,
  inputs: [
    {
      txId: "7f3055...e8352b",
      prevIndex: 0,
      publicKey: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      sigHashType: 0x01,
      subscript: "76a9145bcd...694488ac",
      getPrivateKey: function () {
        return privateKeyBuf;
      },
    },
  ],
  outputs: [
    {
      pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      units: 5150,
    },
  ],
  locktime: 0,
};

let txInfoSigned = await tx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

#### Expanded

```js
// "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ"
let privateKeyHex =
  "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";
let privateKey = Tx.utils.hexToU8(privateKeyHex);

let publicKeyHex =
  "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb";

let txInfo = {
  version: 3,
  inputs: [
    {
      txId: "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
      prevIndex: 0,
      // "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr"
      // "5bcd0d776a7252310b9f1a7eee1a749d42126944"
      publicKey: publicKeyHex,
      sigHashType: 0x01,
      subscript: "76a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac",
      getPrivateKey: function () {
        return privateKey;
      },
    },
  ],
  outputs: [
    {
      // "XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj"
      pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      units: 5150,
    },
  ],
  locktime: 0,
};

let txInfoSigned = await tx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

### Example Output

```js
console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

```json
{
  "inputs": [
    {
      "txId": "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
      "prevIndex": 0,
      "publicKey": "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb",
      "sigHashType": 1,
      "subscript": "76a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac",
      "_hash": "3c6610e19c9a0f7c373da87b429f2eb098f318409a0cfdafb2a2b743dbdb0820",
      "_signature": "3045022100f88938da326af08203495a94b9a91b4bd11266df096cb67757a17eed1cb761b702205f90d94ead2d68086ba9141959115961cc491d560ce422c1a56a6c165697897e"
    }
  ],
  "locktime": 0,
  "outputs": [
    {
      "pubKeyHash": "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      "units": 5150
    }
  ],
  "transaction": "030000...000000",
  "version": 3
}
```

```txt
03000000012b35e8bd64852ae0277a7a4ab6d6293f477f27e859251d27a9a3ebcb5855307f000000006b483045022100f88938da326af08203495a94b9a91b4bd11266df096cb67757a17eed1cb761b702205f90d94ead2d68086ba9141959115961cc491d560ce422c1a56a6c165697897e012103755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cbffffffff011e140000000000001976a9141e0a6ef6085bb8af443a9e7f8941e61deb09fb5488ac00000000
```

Note: in the actual transaction
[7f3055...e8352b](https://insight.dash.org/insight/tx/7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b)
above, there were 2 inputs and 2 outputs. The example is truncated for brevity.

## API

<!--
rg '^\s+Tx\.'
-->

```txt
Tx.HEADER_SIZE         //  10
Tx.MIN_INPUT_SIZE      // 147
Tx.MAX_INPUT_SIZE      // 150
Tx.MAX_INPUT_PAD       //   3
Tx.OUTPUT_SIZE         //  34
```

```js
/**
 * Creates a tx signer instance.
 */
Tx.create({ sign });

/**
 * Creates the variety of required hashable transactions
 * (one per each input), signs them, and then constructs
 * a broadcastable transaction.
 */
tx.hashAndSignAll(txInfo);

/**
 * Creates an "null" transaction with minimal information.
 * It which CANNOT be used for hashing or signing... and
 * we're not sure what it is useful for. Seemingly nothing.
 *
 * Note: although these basically encode enough information
 * for a payment request, there are better ways to do that.
 */
Tx.createRaw(txInfoMinimal);

/**
 * Creates a transaction with all inputs "null"ed out,
 * except for the one corresponding to the given input index.
 *
 * This creates a one-off copy of the transaction suitable for
 * hashing to create the signature that will be inserted into
 * the (unrelated) final transaction.
 */
Tx.createHashable(txInfo, inputIndex);

/**
 * Creates a transaction that is ready to broadcast to the
 * network. It contains signatures from the one-off emphemeral,
 * hashable transactions created for each input.
 */
Tx.createSigned(txInfoSigned);

/**
 * Double sha256 hashes the signed, broadcastable transaction
 * and reverses the byte order of the reseult.
 */
Tx.getId(txHex);

/**
 * Double sha256 hashes a one-off input-specific transacation.
 * Unlike some implementations this DOES NOT reverse the byte
 * order because we use a standard ECSDA signing function that
 * expects bytes in the normal order.
 */
Tx.hashPartial(txHex);
```

#### Utility Functions

```js
/**
 * Convert `n` to a "compressed" 1, 3, 5, or 9-byte LE int
 */
Tx.utils.toVarInt(n);

/**
 * Tell whether `n` will require 1, 3, 5, or 9 bytes to encode
 */
Tx.utils.toVarIntSize(n);

/**
 * Reverse a hex string, preserving the the individual byte pairs
 * Ex: "1337" => "3713"
 */
Tx.utils.reverseHex(hex);

/**
 * Convert a hex string to a Uint8Array
 */
Tx.utils.hexToU8(hex);

/**
 * Convert a Uint8Array to a hex string
 */
Tx.utils.u8ToHex(u8);
```

#### You-do-It Functions

```js
Tx.create({ sign });

/**
 * Sign a 256-bit hash. 'canonical' form is required for
 * blockchains. Must return the signature as an ASN.1 DER.
 * These may or may not be the default options, depending
 * on the library used.
 *
 * We recommend @dashincubator/secp246k1 and @noble/secp246k1.
 *
 * @param {Uint8Array} privateKey - an input's corresponding key
 * @param {Uint8Array} hash - the (not reversed) 2x-sha256-hash
 * @returns {String} - hex representation of an ASN.1 signature
 */
async function sign({ privateKey, hash }) {
  let sigOpts = { canonical: true };
  let sigBuf = await Secp256k1.sign(hash, privateKey, sigOpts);

  return Tx.utils.u8ToHex(sigBuf);
}
```

## Fixtures

<https://insight.dash.org/tx/a64557541b20a2d42021924231eb75cf2a3fd1ebf9888bfcc5d181b0b637a026>

```txt
WIF:
XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ

PayAddr (WIF):
Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr

PayAddr (Recipient):
XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj
```

## Anatomy of a Blockchain Transaction

See
[Anatomy of a Blockchain Transaction](https://github.com/dashhive/blocktx.js/issues/1).

## CLI Debugger

```sh
npm install --location=global @dashincubator/blocktx
```

```sh
blocktx-inspect ./tx.hex
```

```txt
03000000                  # VERSION (3)
02                        # Inputs (2)

# Input 1 of 2
    2b35e8bd64852ae0      # Previous Output TX ID
    277a7a4ab6d6293f
    477f27e859251d27
    a9a3ebcb5855307f
    00000000              # Previous Output index (0)
    6b                    # Script Size (107 bytes)
    48                    # Signature Script Size (72)
    3045                  # ASN.1 ECDSA Signature
    0221
    0098ba308087f7bcc5d9f6c347ffd633422bbbe8d44a20c21a2d5574da35d0a207
    0220
      026cae84cec2d96fd4e1a837ab0f3a559fdbd4b19bdd60c4dec450565f79f5f3
    01                    # Sig Hash Type (1)
    21                    # Public Key Size (33)
    03e10848073f3f92f43d718ed1be39afe7314e410eb7080bbc4474e82fe88c5cf2
    ffffffff              # Sequence (always 0xffffffff)

# Input 2 of 2
    2b35e8bd64852ae0      # Previous Output TX ID
    277a7a4ab6d6293f
    477f27e859251d27
    a9a3ebcb5855307f
    01000000              # Previous Output index (1)
    6b                    # Script Size (107 bytes)
    48                    # Signature Script Size (72)
    3045                  # ASN.1 ECDSA Signature
    0221
    00a6ec8b004c6e24047df4a9b2198a42c92862c4b3ad7ac989c85a04ba86fbdb37
    0220
      0febea2871834d70c1c9d754cbe8163def8f1f721eb8b833098e01bd49ccae65
    01                    # Sig Hash Type (1)
    21                    # Public Key Size (33)
    03e10848073f3f92f43d718ed1be39afe7314e410eb7080bbc4474e82fe88c5cf2
    ffffffff              # Sequence (always 0xffffffff)

02                        # Outputs (2)
# Output 1 of 2
    0a09000000000000      # Base Units (satoshis) (2314)
    19                    # Lock Script Size (25 bytes)
    76a9                  # Script
    14
    5bcd0d776a7252310b9f
    1a7eee1a749d42126944
    88ac

# Output 2 of 2
    0a09000000000000      # Base Units (satoshis) (2314)
    19                    # Lock Script Size (25 bytes)
    76a9                  # Script
    14
    5bcd0d776a7252310b9f
    1a7eee1a749d42126944
    88ac

00000000                  # LOCKTIME (0)

Tx Hash: N/A
TxID: 416e49e5274c0f1e654f1e99008ba0cf9676af4a6d0abce00c116815b51c2deb
Tx Bytes:       374

Tx Outputs:     4628
Tx Fee:         374
Tx Min Cost:    5002
```
