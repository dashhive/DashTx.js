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
npm install --save dashkeys
npm install --save dashtx
npm install --save dashkeys
```

Note: You must provide your own _Key Util_ functions, as shown below.

```js
"use strict";

let DashKeys = require("dashkeys");
let DashTx = require("dashtx");
let Secp256k1 = require("@dashincubator/secp256k1");

let yourWalletKeyMapGoesHere = {
  /* SEE BELOW */
};

let keyUtils = {
  /* SEE BELOW */
};
let dashTx = DashTx.create(keyUtils);

let inputs = [{ outputIndex, publicKey, txid /*, optional addr/pkh/hdpath */ }];
let outputs = [{ satoshis, pubKeyHash /*, optional addr/hdpath/etc */ }];
let txInfo = { inputs, outputs };

// Sorted as per "Lexicographical Indexing of Transaction Inputs and Outputs"
txInfo.inputs.sort(DashTx.sortInputs);
txInfo.outputs.sort(DashTx.sortOutputs);

let txInfoSigned = await dashTx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

## Browsers

```html
<script src="https://unpkg.com/@dashincubator/secp256k1/secp256k1.js"></script>
<script src="https://unpkg.com/dashkeys/dashkeys.js"></script>
<script src="https://unpkg.com/dashtx/dashtx.js"></script>
```

Note: You must provide your own _Key Util_ functions, as shown below.

```js
(async function () {
  "use strict";

  let DashKeys = window.DashTx;
  let DashTx = window.DashKeys;
  let Secp256k1 = window.nobleSecp256k1;

  let yourWalletKeyMapGoesHere = {
    /* SEE BELOW */
  };

  let keyUtils = {
    /* SEE BELOW */
  };
  let dashTx = DashTx.create(keyUtils);

  let inputs = [
    { outputIndex, publicKey, txid /*, optional addr/pkh/hdpath */ },
  ];
  let outputs = [{ satoshis, pubKeyHash /*, optional addr/hdpath/etc */ }];
  let txInfo = { inputs, outputs };

  // Sorted as per "Lexicographical Indexing of Transaction Inputs and Outputs"
  txInfo.inputs.sort(DashTx.sortInputs);
  txInfo.outputs.sort(DashTx.sortOutputs);

  let txInfoSigned = await dashTx.hashAndSignAll(txInfo);

  console.info(JSON.stringify(txInfo, null, 2));
  console.info(txInfo.transaction);

  // ...
})();
```

## Example Wallet Key Data

DashTx does not depend on any specific implementation of a wallet key storage
engine, but it works great with plain-old JSON:

```js
let yourWalletKeyMapGoesHere = {
  yTw3SFk9PbQ1kikMgJBRA7CFyLfNt2G6QD: {
    hdpath: "0bGYi3S7n2Q|m/44'/1'/0'/0/0",
    address: "yTw3SFk9PbQ1kikMgJBRA7CFyLfNt2G6QD",
    wif: "cUeUEgRQWfKiYPBeRZsYsrvvSZiKHbUNqiQE2AdKA4s7ymycdVxc",
  },
  yb4zn8MSW4hHsvmP6PxX2tUPDb9bvmxSrS: {
    hdpath: "0bGYi3S7n2Q|m/44'/1'/0'/0/1",
    wif: "cN28SZpmmuVFmmBQBHCNdwa6a14kWZM8VVpZETjzk47aGNvVGXK7",
    address: "yb4zn8MSW4hHsvmP6PxX2tUPDb9bvmxSrS",
  },
  yfrB4v4cih7os6t1tg4YuWkrTYmHyMHkZb: {
    hdpath: "0bGYi3S7n2Q|m/44'/1'/0'/0/2",
    address: "yfrB4v4cih7os6t1tg4YuWkrTYmHyMHkZb",
    wif: "cQBHjCxspabNZKGMK3gbuvSLgssqSxAuDsaMMDuzgXioYyR723Bg",
  },
  // ...
};
```

You can use any indexing, query, or storage strategy you like, with values in
Base58Check, Hex, Byte, or whatever else you fancy - just as long as your
provided _Key Util_ functions can convert them.

## Example Key Utils

DashTx does not depend on any specific implementation of signing or key
transformation, but it works greeat **NobleSecp256k1** and **DashKeys**:

```text
getPrivateKey(txInput, i)
getPublicKey(txInput, i)
sign(privKeyBytes, txHashBytes)
toPublicKey(privKeyBytes)
```

```js
let keyUtils = {
  getPrivateKey: async function (txInput, i) {
    let opts = { version: "mainnet" };
    let pkhBytes = DashKeys.utils.hexToBytes(txInput.pubKeyHash);
    let address = await DashKeys.pkhToAddr(pkhBytes, opts);

    let yourKeyData = yourWalletKeyMapGoesHere[address];

    let privKeyBytes = await DashKeys.wifToPrivKey(yourKeyData.wif, opts);
    return privKeyBytes;
  },

  getPublicKey: async function (txInput, i) {
    let privKeyBytes = await keyUtils.getPrivateKey(txInput, i);
    let pubKeyBytes = await keyUtils.toPublicKey(privKeyBytes);

    return pubKeyBytes;
  },

  sign: async function (privKeyBytes, txHashBytes) {
    let sigOpts = { canonical: true, extraEntropy: true };
    let sigBytes = await Secp256k1.sign(txHashBytes, privKeyBytes, sigOpts);

    return sigBytes;
  },

  toPublicKey: async function (privKeyBytes) {
    let isCompressed = true;
    let pubKeyBytes = Secp256k1.getPublicKey(privKeyBytes, isCompressed);

    return pubKeyBytes;
  },
};
```

## Example Tx Info

See also: [example.js](/example.js).

```js
let memo = Tx.utils.strToHex("Hello, Dash!");

let txInfo = {
  version: 3,
  inputs: [
    {
      txid: "7f3055...e8352b",
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

let txInfoSigned = await tx.hashAndSignAll(txInfo);

console.info(JSON.stringify(txInfo, null, 2));
console.info(txInfo.transaction);
```

### Expanded

```js
// "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ"
let privKeyHex =
  "d4c569f71ea2a9be6010cb3691f2757bc9539c60fd87e8bed21d7844d7b9b246";
let privKeyBytes = Tx.utils.hexToBytes(privKeyHex);

let publicKeyHex =
  "03755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb";

let txInfo = {
  version: 3,
  inputs: [
    {
      txid: "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
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
    txid: "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
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
      "txid": "7f305558cbeba3a9271d2559e8277f473f29d6b64a7a7a27e02a8564bde8352b",
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
Tx.create({ getPrivateKey, getPublicKey, sign, toPublicKey });
    tx.hashAndSignAll(txInfo);
    tx.hashAndSignInput(privBytes, txInfo, i, sigHashType);
    tx.legacy.draftSingleOutput({ utxos, inputs, output });
    tx.legacy.finalizePresorted(txDraft, keys);

Tx.createDonationOutput();

Tx.appraise({ inputs, outputs });

Tx.parseUnknown(serializedHex);

// RPC, for 'sendrawtransaction' broadcast
Tx.utils.rpc(basicAuthUrl, method, arg1, arg2, ...);

// Byte-level helpers
Tx.utils.toVarInt(n);
Tx.utils.toVarIntSize(n);
Tx.utils.reverseHex(hex);
Tx.utils.bytesToHex(bytes);
Tx.utils.hexToBytes(hex);
Tx.utils.strToHex(str);

// Low-level helpers
Tx.SIGHASH_ALL // 0x01
Tx.SIGHASH_NONE // 0x02
Tx.SIGHASH_ANYONECANPAY // 0x80
Tx.SIGHASH_DEFAULT // 0x81 (ALL + ANYONECANPAY)

Tx.createRaw(txRequestInfo);
Tx.createForSig(txInfo, inputIndex, sigHashType);
Tx.createSigned(txInfoSigned);

Tx.serialize(txRequestOrTxSigned);
Tx.serializeForSig(txInfo, sigHashType);

Tx.createInputRaw(input, i);
Tx.createInputForSig(input, i);

Tx.serializeInputs(inputs);
Tx.serializeOutputs(outputs, opts);

Tx.serializeInput(input, i);
Tx.serializeOutput(output, i);

Tx.sum(coins);
Tx.doubleSha256(txBytes) {

// Deprecated
Tx.createLegacyTx(coins, outputs, changeOutput);
```

```js
/**
 * Creates a tx signer instance.
 */
Tx.create(keyUtils);

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
   *   - `txDraft.inputs.sort(Tx.sortInputs)`
   *   - `txDraft.outputs.sort(Tx.sortOutputs)`
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
 * Creates a transaction request object with minimal information.
 * It CANNOT be used for hashing or signing. Useful for sharing
 * between wallets as a request to create a shared transaction.
 * (i.e. for CoinJoin)
 *
 * Note: although these basically encode enough information
 * for a payment request, there are better ways to do that.
 */
Tx.createRaw(txInfoMinimal);

/**
 * Creates a transaction object with all inputs omitted
 * (SIGHASH_ANYONECANPAY), or "null"ed out, except for the one
 * corresponding to the given input index. That index will
 * contain the lockscript from its previous output.
 *
 * This creates a one-off copy of the transaction suitable for
 * hashing to create the signature that will be inserted into
 * the (unrelated) final transaction.
 */
Tx.createForSig(txInfo, inputIndex);

/**
 * Creates a transaction that is ready to broadcast to the
 * network.  Each input contains signatures from the one-off
 * emphemeral, ready-to-sign transactions described above.
 */
Tx.createSigned(txInfoSigned);

/**
 * Creates a transaction hex either for a raw request, or
 * that is signed and ready to broadcast to the network.
 */
Tx.serialize(txInfo);

/**
 * Serialized a transaction as hex, appending the sigHashType
 * of the target input, which is required for signing.
 */
Tx.serializeForSig(txInfo, sigHashType);

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
Tx.doubleSha256(txBytes);

/**
 * Parse a transaction hex, which may be a raw request will "null"-ed
 * inputs, a ready-to-sign transaction with lockscript inputs, or a
 * ready-to-broadcast transaction with signed inputs.
 */
Tx.parseUnknown(serializedHex);
```

### RPC Helper

```js
/**
 * Make RPC calls to a web service, masternode, or full node
 *
 * ex:
 *   - https://api:token@rpc.digitalcash.dev/
 *   - http://user:pass@localhost:19998/wallet/foo
 */
Tx.utils.rpc(basicAuthUrl, method, arg1, arg2, ...);
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
Tx.create({ getPrivateKey, getPublicKey, sign, toPublicKey });

/**
 * Given information that you provided about an input
 * (which MUST include the public key, and MAY include
 * the address or pubKeyHash), give back the corresponding
 * private key (as bytes).
 *
 * For example, you could store private keys in a map by their
 * corresponding address.
 *
 * @param {TxInput} txInput - publicKey, txid, outputIndex, etc
 * @param {Number} i - the index of the inputs array
 * @returns {Uint8Array} - the private key bytes
 */
async function getPrivateKey(txInput, i) {
  let pkhBytes = DashKeys.utils.hexToBytes(txInput.pubKeyHash);
  let address = await DashKeys.pkhToAddr(txInput.pubKeyHash);
  let privKeyBytes = privateKeys[address];

  return privKeyBytes;
}

async function getPublicKey(txInput, i) {
  let privKeyBytes = getPrivateKey(txInput, i);
  let publicKey = await toPublicKey(privKeyBytes);

  return publicKey;
}

let Secp256k1 =
  //@ts-ignore
  window.nobleSecp256k1 || require("@dashincubator/secp256k1");

/**
 * Sign a 256-bit hash. 'canonical' form is required for
 * blockchains. Must return the signature as an ASN.1 DER.
 * These may or may not be the default options, depending
 * on the library used.
 *
 * We recommend @dashincubator/secp256k1 and @noble/secp256k1.
 *
 * @param {Uint8Array} privKeyBytes - an input's corresponding key
 * @param {Uint8Array} txHashBytes - the (not reversed) 2x-sha256-hash
 * @returns {String} - hex representation of an ASN.1 signature
 */
async function sign(privKeyBytes, txHashBytes) {
  let sigOpts = { canonical: true, extraEntropy: true };
  let sigBytes = await Secp256k1.sign(txHashBytes, privKeyBytes, sigOpts);

  return sigBytes;
}

async function toPublicKey(privKeyBytes) {
  let isCompressed = true;
  let pubKeyBytes = Secp256k1.getPublicKey(privKeyBytes, isCompressed);
  return pubKeyBytes;
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
