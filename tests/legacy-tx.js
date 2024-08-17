"use strict";

let Zora = require("zora");

let DashTx = require("../dashtx.js");

let outputs = [
  {
    satoshis: 20000,
    pubKeyHash: "aa",
  },
];

let changeOutput = {};

Zora.test("too few sats", function (t) {
  let inputs = [
    {
      satoshis: 20000 + 190,
    },
  ];
  try {
    DashTx.legacyCreateTx(inputs, outputs, changeOutput);
    t.ok(false, "should throw when there aren't enough sats");
  } catch (e) {
    let msg = e.message;
    let isAboutMemo = /\bcannot pay for\b/.test(e.message);
    if (isAboutMemo) {
      msg = "throws when there are too few sats";
    }
    t.ok(isAboutMemo, msg);
  }
});

Zora.test("exactly enough sats", function (t) {
  let inputs = [
    {
      satoshis: 20000 + 190,
    },
    {
      satoshis: 3 + 149,
    },
  ];

  DashTx.legacyCreateTx(inputs, outputs, changeOutput);
  t.ok(true, "sats match exactly");
});

Zora.test("donates dust", function (t) {
  let satoshis = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE + -1;
  let inputs = [{ satoshis }];

  let txInfo = DashTx.legacyCreateTx(inputs, outputs, changeOutput);
  if (txInfo.length > 1) {
    throw new Error("created return change for dust");
  }
  t.ok(true, "has no return change");
});

Zora.test("returns change", function (t) {
  let satoshis = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE;
  let inputs = [{ satoshis }];

  let txInfo = DashTx.legacyCreateTx(inputs, outputs, changeOutput);
  let hasChange = txInfo.changeIndex >= 0;
  if (!hasChange) {
    throw new Error("did not create return change");
  }

  let change = txInfo.outputs[txInfo.changeIndex];
  if (!change) {
    throw new Error("did not add change to outputs");
  }

  t.ok(true, "returned change >= dust");
});

Zora.test("coins selection is better than random", async function (t) {
  let exact = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE;
  let inputs = [
    { satoshis: 400000 },
    { satoshis: 3000 },
    { satoshis: exact }, // 2227
    { satoshis: 500000 },
  ];

  let txInfo = await DashTx.legacyCreateTx(inputs, outputs, changeOutput);
  let tooManyInputs = txInfo.inputs.length >= 0;
  if (!tooManyInputs) {
    throw new Error("selected more inputs than necessary");
  }

  let isOptimalInput = txInfo.inputs[0].satoshis === exact;
  if (!isOptimalInput) {
    throw new Error("did not select clearly optimal input");
  }

  t.ok(true, "selected closest input");
});
