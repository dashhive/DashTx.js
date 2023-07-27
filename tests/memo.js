"use strict";

let Zora = require("zora");

let Secp256k1 = require("@dashincubator/secp256k1");

let DashTx = require("../dashtx.js");
let dashTx = DashTx.create({
  sign: async function (privateKey, hash) {
    let sigOpts = {
      canonical: true,
      // ONLY FOR TESTING: use deterministic signature (rather than random)
      extraEntropy: null,
    };
    let sigBuf = await Secp256k1.sign(hash, privateKey, sigOpts);
    return sigBuf;
  },
});

Zora.test("memo lengths", function (t) {
  let memo1 = "ff";
  let memo75 = "ee".repeat(75);
  let memo76 = "dd".repeat(76);
  let memo77 = "cc".repeat(77);
  let memo80 = "bb".repeat(80);
  let memo81 = "aa".repeat(81);

  let size1 = "01";
  let size3 = "03";
  let size75 = "4b";
  let size76 = "4c";
  let size77 = "4d";
  //let size78 = "4e";
  let size79 = "4f";
  let size80 = "50";
  //let size81 = "51";
  //let size82 = "52";
  let size83 = "53";

  let OP_PD1 = "4c";

  t.throws(
    function () {
      DashTx._createMemoScript(memo81);
    },
    /\b80 bytes\b/,
    "memo > 80 bytes should throw an error",
  );

  let tx1 = DashTx._createMemoScript(memo1);
  let tx1a = `0000000000000000${size3}6a${size1}${memo1}`;
  let tx1b = tx1.join("");
  t.deepEqual(tx1b, tx1a, "single-byte memo fits");

  let tx75 = DashTx._createMemoScript(memo75);
  let tx75a = `0000000000000000${size77}6a${size75}${memo75}`;
  let tx75b = tx75.join("");
  t.deepEqual(tx75b, tx75a, "75-byte memo fits");

  let tx76a = `0000000000000000${size79}6a${OP_PD1}${size76}${memo76}`;
  let tx76 = DashTx._createMemoScript(memo76);
  let tx76b = tx76.join("");
  t.deepEqual(tx76b, tx76a, "76-byte memo fits with OP_PUSHDATA1");

  let tx77a = `0000000000000000${size80}6a${OP_PD1}${size77}${memo77}`;
  let tx77 = DashTx._createMemoScript(memo77);
  let tx77b = tx77.join("");
  t.deepEqual(tx77b, tx77a, "77-byte memo fits with OP_PUSHDATA1");

  let tx80a = `0000000000000000${size83}6a${OP_PD1}${size80}${memo80}`;
  let tx80 = DashTx._createMemoScript(memo80);
  let tx80b = tx80.join("");
  t.deepEqual(tx80b, tx80a, "80-byte memo fits with OP_PUSHDATA1");
});

Zora.test("can create memo tx", async function (t) {
  let privKeyHex =
    "ba0863ae0c162d67ae68a7f1e9dfdb7e3c47a71d397e19d7442f1afef3928511";
  let pkh = "82754a9c935fbfcdda5995a32006a68a8156ee2b";

  let txId = "77".repeat(32);
  let coins = [
    { pubKeyHash: pkh, satoshis: 20000, txId: txId, outputIndex: 0 },
  ];

  /** @type {Array<DashTx.TxOutput>} */
  let outputs = [];

  let encoder = new TextEncoder();
  let memoBytes = encoder.encode("Hello, Dash!");
  let memoHex = DashTx.utils.bytesToHex(memoBytes);
  outputs.push({ memo: memoHex, satoshis: 0 });

  let changeOutput = { pubKeyHash: pkh };
  let txInfo = await DashTx.legacyCreateTx(coins, outputs, changeOutput);

  let privKey = DashTx.utils.hexToBytes(privKeyHex);
  let keys = [privKey];
  let txInfoSigned = await dashTx.hashAndSignAll(txInfo, keys);

  let rawtx =
    "03000000017777777777777777777777777777777777777777777777777777777777777777000000006a4730440220404c24dd8fff16b226c4795093b49e1060039c687120a9aaeca65cf321c593e00220180b160b3b2e937f9f5b9a8658a55c7511926b4631c421813c659e4f22b29140012103f808bdec4293bf12441ec9a9e61bc3b264c78fcc5ad499ce5f0799f2874e6856ffffffff0200000000000000000e6a0c48656c6c6f2c204461736821484d0000000000001976a91482754a9c935fbfcdda5995a32006a68a8156ee2b88ac00000000";

  t.equal(txInfoSigned.transaction, rawtx, "created transaction with memo");
});

Zora.test("can create donation tx via memo", async function (t) {
  let privKeyHex =
    "ba0863ae0c162d67ae68a7f1e9dfdb7e3c47a71d397e19d7442f1afef3928511";
  let pkh = "82754a9c935fbfcdda5995a32006a68a8156ee2b";

  let txId = "77".repeat(32);
  let inputs = [
    { pubKeyHash: pkh, satoshis: 20000, txId: txId, outputIndex: 0 },
  ];

  /** @type {Array<DashTx.TxOutput>} */
  let outputs = [];

  let txInfo = {
    inputs: inputs,
    outputs: outputs,
    _DANGER_donate: true,
  };

  let privKey = DashTx.utils.hexToBytes(privKeyHex);
  let keys = [privKey];
  let txInfoSigned = await dashTx.hashAndSignAll(txInfo, keys);
  let txHex = txInfoSigned.transaction;

  let rawtx =
    "03000000017777777777777777777777777777777777777777777777777777777777777777000000006b483045022100d2a13920c4002ee76df3cd3a0afcebb12e71871c63bb49ba379de6d709f488b60220627252f66903c3dfa69ba86a581c09342721a15d75e2a455a2dff09187e7668e012103f808bdec4293bf12441ec9a9e61bc3b264c78fcc5ad499ce5f0799f2874e6856ffffffff010000000000000000066a04f09fa7a700000000";

  t.equal(txHex, rawtx, "created donation transaction via memo");
});
