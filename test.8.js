"use strict";

//let Transaction = require("@dashevo/dashcore-lib/lib/transaction/");
let Dashcore = require("@dashevo/dashcore-lib");
let Transaction = Dashcore.Transaction;

let sourceWif = "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ";
let sourceAddr = "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr";
let sourceWif2 = "XBwqVpx9SLtvoscmLgC2AtXoKZi5FxYKtYbPGTyjzsKBxsfAxrmy";
let sourceAddr2 = "XhWFxtNSqwTqLYAQ9XQJbfQG3Hj64qLoGt";
let payAddr = "XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj";
let unspentAmount = 9597;
let feeAmount = 202;
let payAmount = 9395; // unspentAmount - feeAmount

//@ts-ignore - no input required, actually
let tx = new Transaction()
  //@ts-ignore - allows single value or array
  .from([
    // CoreUtxo
    {
      txId: "1122223333334444444455555555556666666666667777777777777788888888",
      outputIndex: 13,
      address: sourceAddr,
      script: [
        "76", // OP_DUP
        "a9", // OP_HASH160
        "14", // Byte Length: 20
        "5bcd0d776a7252310b9f1a7eee1a749d42126944", // PubKeyHash
        "88", // OP_EQUALVERIFY
        "ac", // OP_CHECKSIG
      ].join(""),
      satoshis: unspentAmount,
    },
    {
      txId: "9999999999999999998888888888888888777777777777776666666666665555",
      outputIndex: 27,
      address: sourceAddr2,
      script: [
        "76", // OP_DUP
        "a9", // OP_HASH160
        "14", // Byte Length: 20
        "4ac872eebec2be92824d5b3b463264133231093b",
        "88", // OP_EQUALVERIFY
        "ac", // OP_CHECKSIG
      ].join(""),
      satoshis: 9395,
    },
  ]);
tx.to(payAddr, payAmount);
tx.to(sourceAddr, 9395);
tx.fee(feeAmount);
//@ts-ignore - see above
tx.change(sourceAddr);
tx.sign([sourceWif, sourceWif2]);

console.log(tx);
let txHex = tx.serialize();
//let txHex = tx.toString();
console.log(txHex);
