# [dashtx](https://github.com/dashhive/dashtx.js)

Create a transaction for a crypto-currency network. \
(Bitcoin, BTC, BSV, BCH, DASH, Doge, etc)

Server and browser compatible. Vanilla JS. 0 Dependencies.

# Table of Contents

- Install & Initialize
  - Bun, Deno, Node
  - Vite, WebPack
  - Browsers
- Example Usage
- Example Coin Selection & Fee Calculation
- Example Output
- API
- Anatomy of a Blockchain Transaction
- CLI Debugger

# Install & Initialize

## Bun, Deno, Node, WebPack, Vite

```sh
npm install --save @dashincubator/secp256k1
npm install --save dashtx
```

Note: You may provide your own `sign()` function, as shown below.

```js
"use strict";

let Tx = require("dashtx");
let tx = Tx.create({ sign: sign });

let Secp256k1 = require("@dashincubator/secp256k1");

async function sign({ privateKey, hash }) {
  let sigOpts = { canonical: true, extraEntropy: true };
  let sigBytes = await Secp256k1.sign(hash, privateKey, sigOpts);
  return Tx.utils.bytesToHex(sigBytes);
}

// ...
```

## Browsers

```html
<script src="https://unpkg.com/@dashincubator/secp256k1/secp256k1.js"></script>
<script src="https://unpkg.com/dashtx/dashtx.js"></script>
```

Note: You must provide your own `sign()` function, as shown below.

```js
(function () {
  "use strict";

  let Tx = window.DashTx;
  let tx = Tx.create({ sign: sign });

  let Secp256k1 = window.nobleSecp256k1;

  async function sign({ privateKey, hash }) {
    let sigOpts = { canonical: true, extraEntropy: true };
    let sigBytes = await Secp256k1.sign(hash, privateKey, sigOpts);
    return Tx.utils.bytesToHex(sigBytes);
  }

  // ...
})();
```

## Example Usage

See also: [example.js](/example.js).

Note: You must provide your own `sign()` function, as shown above.

```js
let memo = Tx.utils.strToHex("Hello, Dash!");

let txInfo = {
  version: 3,
  inputs: [
    {
      txId: "7f3055...e8352b",
      outputIndex: 0,
      publicKey: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
      sigHashType: 0x01,
      script: "76a9145bcd...694488ac",
    },
  ],
  outputs: [
    {
      pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      satoshis: 5150,
    },
    {
      // OP_RETURN messages are supported as HEX!
      memo: memo,
      satoshis: 0,
    },
  ],
  locktime: 0,
};

// Note: your inputs and outputs will be sorted according to
// "Lexicographical Indexing of Transaction Inputs and Outputs"
txInfo.inputs.sort(Tx.sortInputs);
txInfo.outputs.sort(Tx.sortOutputs);

let keys = txInfo.inputs.map(getPrivateKey);
let txInfoSigned = await tx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

### Expanded

```js
// "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ"
let privateKeyHex =
  "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";
let privateKey = Tx.utils.hexToBytes(privateKeyHex);

let publicKeyHex =
  "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb";

let txInfo = {
  version: 3,
  inputs: [
    {
      txId: "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
      outputIndex: 0,
      // "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr"
      // "5bcd0d776a7252310b9f1a7eee1a749d42126944"
      publicKey: publicKeyHex,
      sigHashType: 0x01,
      script: "76a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac",
    },
  ],
  outputs: [
    {
      // "XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj"
      pubKeyHash: "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      satoshis: 5150,
    },
  ],
  locktime: 0,
};

// Note: your inputs and outputs will be sorted according to
// "Lexicographical Indexing of Transaction Inputs and Outputs"
txInfo.inputs.sort(Tx.sortInputs);
txInfo.outputs.sort(Tx.sortOutputs);

let keys = txInfo.inputs.map(getPrivateKey);
let txInfoSigned = await tx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfoSigned.transaction);
```

## Example Coin Selection & Fee Calculation

```text
// for backwards compatibily with JSON Payment Protocol, etc
Tx.createLegacyTx(coins, outputs, changeOutput)

// (coming soon... ?)
// for use with Contacts and Cash-Like send (uses XPubs & denominates coins)
Tx.createTx(coins, outputs, { allowChange: true, breakChange: true })
```

Given an array of coins (UTXOs), DashTx can do the hard work of correctly
selecting a minimal set of inputs that cover the output costs and fees, and
insert a change output if necessary.

```js
let coins = [
  {
    satoshis: 1_000_00000,
    txId: "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
    outputIndex: 0,
    // you may have one or more address identifiers
    publicKey:
      "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb",
    pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
    address: "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr",
  },
  {
    satoshis: 2_500_00000,
    // ...
  },
  {
    satoshis: 1_500_00000,
    // ...
  },
];

let outputs = [
  {
    satoshis: 1_200_00000,
    // ...
  },
];

let changeOutput = {
  pubKeyHash: "5bcd0d776a7252310b9f1a7eee1a749d42126944",
};

let txInfo = await Tx.createLegacyTx(coins, outputs, changeOutput);
// { version, inputs, outputs, changeIndex, locktime }
// let change = txInfo.outputs[txInfo.changeIndex];
```

## Example Output

```js
console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

```json
{
  "inputs": [
    {
      "txId": "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
      "outputIndex": 0,
      "publicKey": "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb",
      "sigHashType": 1,
      "script": "76a9145bcd0d776a7252310b9f1a7eee1a749d4212694488ac",
      "_hash": "3c6610e19c9a0f7c373da87b429f2eb098f318409a0cfdafb2a2b743dbdb0820",
      "_signature": "3045022100f88938da326af08203495a94b9a91b4bd11266df096cb67757a17eed1cb761b702205f90d94ead2d68086ba9141959115961cc491d560ce422c1a56a6c165697897e"
    }
  ],
  "locktime": 0,
  "outputs": [
    {
      "pubKeyHash": "1e0a6ef6085bb8af443a9e7f8941e61deb09fb54",
      "satoshis": 5150
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

# API

<!--
rg '^\s+Tx\.[A-Z_]+ ='
-->

```text
Tx.SATOSHIS            // 1_000_00000
Tx.LEGACY_DUST         //       02000

Tx.HEADER_SIZE         //          10
Tx.MIN_INPUT_SIZE      //         147
Tx.MAX_INPUT_SIZE      //         149
Tx.MAX_INPUT_PAD       //           2
Tx.OUTPUT_SIZE         //          34
```

```text
Tx.create({ sign, getPrivateKey });
    tx.hashAndSignAll(txInfo);
    tx.legacy.draftSingleOutput({ utxos, inputs, output });
    tx.legacy.finalizePresorted(txDraft, keys);

Tx.appraise({ inputs, outputs });
Tx.getId(txHex);

// Byte-level helpers
Tx.utils.toVarInt(n);
Tx.utils.toVarIntSize(n);
Tx.utils.reverseHex(hex);
Tx.utils.bytesToHex(bytes);
Tx.utils.hexToBytes(hex);
Tx.utils.strToHex(str);

// Low-level helpers
Tx.createRaw(txInfoMinimal);
Tx.createHashable(txInfo, inputIndex);
Tx.createSigned(txInfoSigned);
Tx.hashPartial(txHex, Tx.SIGHASH_ALL);

// Deprecated
Tx.createLegacyTx(coins, outputs, changeOutput);
Tx.utils.hexToU8 // Tx.utils.hexToBytes;
Tx.utils.u8ToHex // Tx.utils.bytesToHex;

// Not API-locked, May change
Tx.utils.sign(privateKey, txHashBytes);
Tx.utils.toPublicKey(privKeyBytes);
Tx.utils.addrToPubKeyHash(addr);
```

```js
/**
 * Creates a tx signer instance.
 */
Tx.create({ sign, getPrivateKey });

/**
 * Estimates the min, mid, and max sizes of (fees for) a transaction (including memos).
 * (if in doubt, start with the mid - its's 75% likely to match the signed size)
 * (non-deterministic because signed size is based on the variable-size signature)
 */
Tx.appraise({ inputs, outputs });
// { min: 191, mid: 192, max: 193 }

/**
 * Deprecated. Use `dashTx.legacy.draftSingleOutput()` instead.
 *
 * Magic. The old kind.
 *
 * Calculates totals, fees and output change, AND selects
 * which UTXOs to use as inputs from the given coins.
 *
 * This should only be used for legacy (non-XPub) addresses
 * and where denominated outputs cannot be used.
 */
Tx.createLegacyTx(coins, outputs, changeOutput);
// { version, inputs, outputs, changeIndex, locktime}
// let change = txInfo.outputs[txInfo.changeIndex];

{
  /**
   * Creates the variety of required hashable transactions
   * (one per each input), signs them, and then constructs
   * a broadcastable transaction.
   *
   * Note: your inputs and outputs should be sorted according to
   * "Lexicographical Indexing of Transaction Inputs and Outputs":
   *
   *     txInfo.inputs.sort(Tx.sortInputs)
   *     txInfo.outputs.sort(Tx.sortOutputs)
   */
  tx.hashAndSignAll(txInfo);

  /**
   * Drafts a multiple-input, single-output transaction.
   * (each `input.address` and the `output.address` may be set before or after)
   *
   * Sending Modes:
   *   - "Automatic Coin Selection":    use `utxos`, NOT `inputs`
   *   - "Coin Control"            :    use `inputs`, NOT `utxos`
   *   - "Full Balance Transfer"   :    use `inputs`, NOT `utxos` and
   *                                    set `output.satoshis = null`
   *
   *  Change:
   *   - `txDraft.change` is a reference to the relevant `txDraft.outputs[i]`
   *   - `txDraft.change.address` MUST be set before signing the transaction
   *
   *  BIP-69 Secure Sorting must be done AFTER setting each `address`
   *   - `Tx.sortInputs(txDraft.inputs)`
   *   - `Tx.sortOutputs(txDraft.outputs)`
   */
  let txDraft = tx.legacy.draftSingleOutput({ utxos, inputs, output });

  /**
   * Signs the draft with variations to find a signature whose fee will
   * closely match `txDraft.feeTarget`.
   *
   *   - `inputs` and `outputs` MUST be sorted BEFORE calling this
   *   - `txDraft.feeTarget` should be at least 10% likely
   *     - the likelihood of `fees.min` is   `1 / Math.pow(4, inputs.length)`
   *     - the likelihood of `fees.mid` is  75%
   *     - the likelihood of `fees.max` is 100%
   */
  let txSummary = tx.legacy.finalizePresorted(txDraft, keys);
}

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
Tx.hashPartial(txHex, Tx.SIGHASH_ALL);
```

### Utility Functions

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
 * Convert a Uint8Array to a hex string
 */
Tx.utils.bytesToHex(bytes);

/**
 * Convert a hex string to a Uint8Array
 */
Tx.utils.hexToBytes(hex);

/**
 * Convert a text string to Hex (for memos)
 *
 * note: uses TextEncoder and bytesToHex
 */
Tx.utils.strToHex(str);
```

### You-do-It Functions

```js
Tx.create({ sign, getPrivateKey });

/**
 * Sign a 256-bit hash. 'canonical' form is required for
 * blockchains. Must return the signature as an ASN.1 DER.
 * These may or may not be the default options, depending
 * on the library used.
 *
 * We recommend @dashincubator/secp246k1 and @noble/secp246k1.
 *
 * @param {Uint8Array} privateKey - an input's corresponding key
 * @param {Uint8Array} txHashBytes - the (not reversed) 2x-sha256-hash
 * @returns {String} - hex representation of an ASN.1 signature
 */
async function sign(privateKey, txHashBytes) {
  let sigOpts = { canonical: true };
  let sigBytes = await Secp256k1.sign(txHashBytes, privateKey, sigOpts);

  return Tx.utils.bytesToHex(sigBytes);
}

/**
 * Given information that you provided about an input
 * (which MUST include the public key, and MAY include
 * the address or pubKeyHash), give back the corresponding
 * private key (as bytes).
 *
 * For example, you could store private keys in a map by their
 * corresponding address.
 *
 * @param {TxInput} txInput - publicKey, txId, outputIndex, etc
 * @param {Number} i - the index of the inputs array
 * @returns {Uint8Array} - the private key bytes
 */
async function getPrivateKey(txInput, i) {
  let address = await DashKeys.pubkeyToAddr(txInput.publicKey);
  let privateKey = privateKeys[address];

  return privateKey;
}
```

# Fixtures

<https://insight.dash.org/tx/a64557541b20a2d42021924231eb75cf2a3fd1ebf9888bfcc5d181b0b637a026>

```txt
WIF:
XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ

PayAddr (WIF):
Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr

PayAddr (Recipient):
XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj
```

# Anatomy of a Blockchain Transaction

See
[Anatomy of a Blockchain Transaction](https://github.com/dashhive/dashtx.js/issues/1).

# CLI Debugger

```sh
npm install --location=global dashtx
```

```sh
dashtx-inspect ./tx.hex
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
