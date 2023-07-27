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

Zora.test("too few sats", async function (t) {
  let inputs = [
    {
      satoshis: 20000 + 190,
    },
  ];
  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function () {
      t.ok(false, "should throw when there aren't enough sats");
    })
    .catch(function (e) {
      let msg = e.message;
      let isAboutMemo = /\bcannot pay for\b/.test(e.message);
      if (isAboutMemo) {
        msg = "throws when there are too few sats";
      }
      t.ok(isAboutMemo, msg);
    });
});

Zora.test("exactly enough sats", async function (t) {
  let inputs = [
    {
      satoshis: 20000 + 190,
    },
    {
      satoshis: 3 + 149,
    },
  ];

  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function () {
      t.ok(true, "sats match exactly");
    })
    .catch(function (e) {
      t.ok(false, e.message);
    });
});

Zora.test("donates dust", async function (t) {
  let satoshis = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE + -1;
  let inputs = [{ satoshis }];

  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function (txInfo) {
      if (txInfo.length > 1) {
        throw new Error("created return change for dust");
      }
      t.ok(true, "has no return change");
    })
    .catch(function (e) {
      t.ok(false, e.message);
    });
});

Zora.test("returns change", async function (t) {
  let satoshis = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE;
  let inputs = [{ satoshis }];

  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function (txInfo) {
      let hasChange = txInfo.changeIndex >= 0;
      if (!hasChange) {
        throw new Error("did not create return change");
      }

      let change = txInfo.outputs[txInfo.changeIndex];
      if (!change) {
        throw new Error("did not add change to outputs");
      }

      t.ok(true, "returned change >= dust");
    })
    .catch(function (e) {
      t.ok(false, e.message);
    });
});

Zora.test("coins selection is better than random", async function (t) {
  let exact = 20000 + 193 + DashTx.LEGACY_DUST + DashTx.OUTPUT_SIZE;
  let inputs = [
    { satoshis: 400000 },
    { satoshis: 3000 },
    { satoshis: exact }, // 2227
    { satoshis: 500000 },
  ];

  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function (txInfo) {
      let tooManyInputs = txInfo.inputs.length >= 0;
      if (!tooManyInputs) {
        throw new Error("selected more inputs than necessary");
      }

      let isOptimalInput = txInfo.inputs[0].satoshis === exact;
      if (!isOptimalInput) {
        throw new Error("did not select clearly optimal input");
      }

      t.ok(true, "selected closest input");
    })
    .catch(function (e) {
      t.ok(false, e.message);
    });
});
