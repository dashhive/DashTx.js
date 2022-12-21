"use strict";

//let Transaction = require("@dashevo/dashcore-lib/lib/transaction/");
let Dashcore = require("@dashevo/dashcore-lib");
let Transaction = Dashcore.Transaction;

let sourceWif = "XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ";
let sourceAddr = "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr";
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
            txId: "59d18480d9d2a5d5af6f0392f768a4eff529d1a1e157e6cfc2f7843f412a7ed8",
            outputIndex: 0,
            address: "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr",
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
    ]);
tx.to(payAddr, payAmount);
tx.fee(feeAmount);
//@ts-ignore - see above
tx.change(sourceAddr);
tx.sign([sourceWif]);

let txHex = tx.serialize();
//let txHex = tx.toString();
console.log(txHex);
