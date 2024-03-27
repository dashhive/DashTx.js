"use strict";

let DashTx = require("../");

// generated with https://webinstall.dev/dashmsg
// dashmsg gen --cointype '4c' ./test-1.wif
// dashmsg inspect --cointype '4c' "$(cat ./test-1.wif)"
// dashmsg gen --cointype '4c' ./test-2.wif
// dashmsg inspect --cointype '4c' "$(cat ./test-2.wif)"
// let keys = [
//     'XC77GEs9w4wZfHN1xtgbGJFBvd8xJzt7ocnvEU6tStEft6MuyeaN',
//     'XDpL8c2jZ98xtegcKvmkErMKGj8nmjFZ1BtgUnHSF2uMzsvDzj8k'
// ];

let tests = [
  {
    name: "full transfer, single in, single out",
    utxos: null,
    inputs: [
      {
        // 'XC77GEs9w4wZfHN1xtgbGJFBvd8xJzt7ocnvEU6tStEft6MuyeaN',
        address: "XgCLJNfaugnB35WTCMjKQ65GMBN41QtVQJ",
        satoshis: 10200,
      },
    ],
    output: {
      // 'XDpL8c2jZ98xtegcKvmkErMKGj8nmjFZ1BtgUnHSF2uMzsvDzj8k'
      address: "XhKPmX1ofTiu4L6veoxYKNca4KEg9AwjBV",
      satoshis: null, // full transfer
    },
    expected: {
      inputs: [{ satoshis: 10200 }],
      change: null,
      outputs: [
        {
          satoshis: 10200 - 191, // 1009
        },
      ],
      feeTarget: 191,
      fullTransfer: true,
    },
  },
];

async function test() {
  let dashTx = DashTx.create();

  for (let t of tests) {
    let exp = t.expected;
    let txDraft = dashTx.legacy.draftSingleOutput({
      utxos: t.utxos,
      inputs: t.inputs,
      output: t.output,
    });
    // console.log("[DEBUG]", txDraft);

    if (exp.inputs) {
      if (exp.inputs.length !== txDraft.inputs.length) {
        let msg = `expected ${exp.inputs.length} inputs, but saw '${txDraft.inputs.length}'`;
        throw new Error(msg);
      }

      for (let i = 0; i < exp.inputs.length; i += 1) {
        let satsMatch = exp.inputs[i].satoshis === txDraft.inputs[i].satoshis;
        if (!satsMatch) {
          let msg = `expected ${exp.inputs[i].satoshis} sats for input ${i}, but saw '${txDraft.inputs[i].satoshis}'`;
          throw new Error(msg);
        }
      }
    }

    if (exp.outputs) {
      if (exp.outputs.length !== txDraft.outputs.length) {
        let msg = `expected ${exp.outputs.length} outputs, but saw '${txDraft.outputs.length}'`;
        throw new Error(msg);
      }

      for (let i = 0; i < exp.outputs.length; i += 1) {
        let satsMatch = exp.outputs[i].satoshis === txDraft.outputs[i].satoshis;
        if (!satsMatch) {
          let msg = `expected ${exp.outputs[i].satoshis} sats for output ${i}, but saw '${txDraft.outputs[i].satoshis}'`;
          throw new Error(msg);
        }
      }
    }

    if ("feeTarget" in exp) {
      if (exp.feeTarget !== txDraft.feeTarget) {
        let msg = `expected feeTarget of ${exp.feeTarget}, but saw '${txDraft.feeTarget}'`;
        throw new Error(msg);
      }
    }

    if ("fullTransfer" in exp) {
      if (exp.fullTransfer !== txDraft.fullTransfer) {
        let msg = `expected fullTransfer to be ${exp.fullTransfer}, but saw '${txDraft.fullTransfer}'`;
        throw new Error(msg);
      }
    }
    console.info(`✅ ${t.name} (no mismatch values)`);
  }
}

test()
  .then(function () {
    console.info("PASS");
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:", err.stack || err);
    process.exit(1);
  });
