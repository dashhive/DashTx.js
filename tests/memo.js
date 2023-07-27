"use strict";

let Zora = require("zora");

let DashTx = require("../dashtx.js");

Zora.test("memo lengths", async function (t) {
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
      DashTx._addMemo([], memo81);
    },
    /\b80 bytes\b/,
    "memo > 80 bytes should throw an error",
  );

  let tx1a = ["0000000000000000", `${size3}6a${size1}${memo1}`];
  let tx1 = [];
  DashTx._addMemo(tx1, memo1);
  t.deepEqual(tx1, tx1a, "single-byte memo fits");

  let tx75a = ["0000000000000000", `${size77}6a${size75}${memo75}`];
  let tx75 = [];
  DashTx._addMemo(tx75, memo75);
  t.deepEqual(tx75, tx75a, "75-byte memo fits");

  let tx76a = ["0000000000000000", `${size79}6a${OP_PD1}${size76}${memo76}`];
  let tx76 = [];
  DashTx._addMemo(tx76, memo76);
  t.deepEqual(tx76, tx76a, "76-byte memo fits with OP_PUSHDATA1");

  let tx77a = ["0000000000000000", `${size80}6a${OP_PD1}${size77}${memo77}`];
  let tx77 = [];
  DashTx._addMemo(tx77, memo77);
  t.deepEqual(tx77, tx77a, "77-byte memo fits with OP_PUSHDATA1");

  let tx80a = ["0000000000000000", `${size83}6a${OP_PD1}${size80}${memo80}`];
  let tx80 = [];
  DashTx._addMemo(tx80, memo80);
  t.deepEqual(tx80, tx80a, "80-byte memo fits with OP_PUSHDATA1");
});

Zora.test("can create memo tx", async function (t) {
  let dashTx = DashTx.create({});

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

  t.ok(txInfoSigned.transaction, "created transaction with memo");
});

Zora.test("can create donation tx via memo", async function (t) {
  let dashTx = DashTx.create({});

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

  t.ok(txInfoSigned.transaction, "created donation transaction via memo");
});
