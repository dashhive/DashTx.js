"use strict";

//let Transaction = require("@dashevo/dashcore-lib/lib/transaction/");
let Dashcore = require("@dashevo/dashcore-lib");
let Transaction = Dashcore.Transaction;

let sourceWif = "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ";
let sourceAddr = "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr";
let payAddr = "XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj";
let unspentAmount = 2125;
let feeAmount = 740;
let payAmount = 1940; // unspentAmount - feeAmount

//@ts-ignore - no input required, actually
let txId = "8f8b60c864e37082dd86a3ca3979fd40b6709d6e9389781e593b5be81f31c3a8";
let lockScript = [
  "76", // OP_DUP
  "a9", // OP_HASH160
  "14", // Byte Length: 20
  "5bcd0d776a7252310b9f1a7eee1a749d42126944", // PubKeyHash
  "88", // OP_EQUALVERIFY
  "ac", // OP_CHECKSIG
].join("");
let tx = new Transaction()
  //@ts-ignore - allows single value or array
  .from([
    // CoreUtxo
    {
      txId: txId,
      outputIndex: 0,
      address: sourceAddr,
      script: lockScript,
      satoshis: unspentAmount,
    },
    {
      txId: txId,
      outputIndex: 1,
      address: sourceAddr,
      script: lockScript,
      satoshis: unspentAmount,
    },
    {
      txId: txId,
      outputIndex: 2,
      address: sourceAddr,
      script: lockScript,
      satoshis: unspentAmount,
    },
    {
      txId: txId,
      outputIndex: 3,
      address: sourceAddr,
      script: lockScript,
      satoshis: unspentAmount,
    },
  ]);
//tx.to(payAddr, payAmount);
tx.to(sourceAddr, payAmount);
tx.to(sourceAddr, payAmount);
tx.to(sourceAddr, payAmount);
tx.to(sourceAddr, payAmount);

tx.fee(feeAmount);
//@ts-ignore - see above
tx.change(sourceAddr);
tx.sign([sourceWif]);

//console.log(tx);
let txHex = tx.serialize();
//let txHex = tx.toString();
console.log();
console.log("Final, Signed, Ready-to-Broadcast TX");
console.log(txHex);
