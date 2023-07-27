"use strict";

let Zora = require("zora");

function unsort(sorted) {
  let unsorted = [];
  let copy = sorted.slice(0);

  for (; copy.length; ) {
    let item = copy.pop();
    unsorted.push(item);

    item = copy.shift();
    if (item) {
      unsorted.push(item);
    }
  }

  return unsorted;
}

let inputsSorted = [
  {
    txId: "00ff",
    outputIndex: 0,
  },
  {
    txId: "00ff",
    outputIndex: 9,
  },
  {
    txId: "aacc",
    outputIndex: 5,
  },
  {
    txId: "ff00",
    outputIndex: 0,
  },
  {
    txId: "ff00",
    outputIndex: 9,
  },
];
let outputsSorted = [
  {
    satoshis: 0,
    memo: "00",
  },
  {
    satoshis: 0,
    memo: "00",
  },
  {
    satoshis: 0,
    memo: "ff",
  },
  {
    satoshis: 10000,
    pubKeyHash: "f0",
  },
  {
    satoshis: 20000,
    script: "000000",
  },
  {
    satoshis: 20000,
    script: "000001",
  },
  {
    satoshis: 20000,
    script: "7600",
  },
  {
    satoshis: 20000,
    pubKeyHash: "b0",
  },
  {
    satoshis: 20000,
    pubKeyHash: "a0",
    address: "Xaa",
  },
  {
    satoshis: 20000,
    script: "76ff",
  },
  {
    satoshis: 20000,
    script: "800000",
  },
  {
    satoshis: 20000,
    script: "800001",
  },
  {
    satoshis: 30000,
    pubKeyHash: "a0",
    script: "76a9a0",
  },
];

let DashTx = require("../");

function testSort(sorter, sorted) {
  let copy = sorted.slice(0);
  let unsorted = unsort(sorted);

  let isSorted = true;
  for (; unsorted.length; ) {
    let a = unsorted.shift();
    let b = copy.shift();
    let jsonA = JSON.stringify(a);
    let jsonB = JSON.stringify(b);

    if (jsonA !== jsonB) {
      isSorted = false;
    }
  }
  if (isSorted) {
    throw new Error("still sorted after unsorting");
  }

  copy = sorted.slice(0);
  let resorted = unsort(sorted);
  //console.log("[DEBUG] unsorted:");
  //console.log(resorted);

  resorted.sort(sorter);
  //console.log("[DEBUG] sorted:");
  //console.log(resorted);

  isSorted = true;
  for (; unsorted.length; ) {
    let a = resorted.shift();
    let b = copy.shift();
    let jsonA = JSON.stringify(a);
    let jsonB = JSON.stringify(b);

    if (jsonA !== jsonB) {
      isSorted = false;
    }
  }
  if (!isSorted) {
    console.error(`[DEBUG] unsorted:`);
    console.error(unsorted);
  }

  return isSorted;
}

Zora.test("inputs sort correctly", async function (t) {
  let isSorted = testSort(DashTx.sortInputs, inputsSorted);
  t.ok(isSorted, "inputs are sorted as expected");
});

Zora.test("outputs sort correctly", async function (t) {
  let isSorted = testSort(DashTx.sortOutputs, outputsSorted);
  t.ok(isSorted, "outputs are sorted as expected");
});

Zora.test("legacyCreateTx uses lex sort functions", async function (t) {
  let inputs = [
    { satoshis: 40500, txId: "ff", outputIndex: 1 },
    { satoshis: 20500, txId: "00", outputIndex: 2 },
    { satoshis: 10500, txId: "ff", outputIndex: 0 },
  ];
  let sortedIn = inputs.slice(0);
  sortedIn.sort(DashTx.sortInputs);

  let outputs = [
    { satoshis: 30000, pubKeyHash: "aa" },
    { satoshis: 0, memo: "Hello, Dash!" },
    { satoshis: 10000, pubKeyHash: "ff" },
    { satoshis: 20000, pubKeyHash: "aa" },
    { satoshis: 0, memo: "Hello, Blocks!" },
    { satoshis: 10000, pubKeyHash: "00" },
  ];
  let sortedOut = outputs.slice(0);
  sortedOut.sort(DashTx.sortOutputs);

  let changeOutput = {};

  await DashTx.legacyCreateTx(inputs, outputs, changeOutput)
    .then(function (txInfo) {
      t.deepEqual(sortedIn, txInfo.inputs, "inputs should be sorted");
      t.deepEqual(sortedOut, txInfo.outputs, "outputs should be sorted");
    })
    .catch(function (e) {
      t.ok(false, e.message);
    });
});
