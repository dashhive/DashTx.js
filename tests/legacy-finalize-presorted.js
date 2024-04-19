"use strict";

let DashTx = require("../");

let DashKeys = require("dashkeys");
let Secp256k1 = require("@dashincubator/secp256k1");

let keyUtils = {
  sign: async function (privKeyBytes, hashBytes) {
    let sigOpts = {
      canonical: true,
      extraEntropy: true,
    };
    let sigBuf = await Secp256k1.sign(hashBytes, privKeyBytes, sigOpts);
    return sigBuf;
  },
  toPublicKey: async function (privKeyBytes) {
    return DashKeys.utils.toPublicKey(privKeyBytes);
  },
};

// generated with https://webinstall.dev/dashmsg
// dashmsg gen --cointype '4c' ./test-1.wif
// dashmsg inspect --cointype '4c' "$(cat ./test-1.wif)"
// dashmsg gen --cointype '4c' ./test-2.wif
// dashmsg inspect --cointype '4c' "$(cat ./test-2.wif)"
// let keys = [
//     'XC77GEs9w4wZfHN1xtgbGJFBvd8xJzt7ocnvEU6tStEft6MuyeaN',
//     'XDpL8c2jZ98xtegcKvmkErMKGj8nmjFZ1BtgUnHSF2uMzsvDzj8k'
// ];

// let sats = 10197; // fee of 192
// let sats = 10195; // forced fee of 193, but byte size of 191
let forcedFee = 193;
let byteSizeFee = 192;
let tests = [];
// for (let sats = 10400; sats > 10193; sats -= 1) {
// let test = genTestVals(sats);
let test = genTestVals(
  "walk up from fee target with deterministic signatures",
  10195,
  true,
);
tests.push(test);
// }
let test2 = genTestVals(
  "hit fee target by retrying random signatures",
  10200,
  false,
);
tests.push(test2);

function genTestVals(name, sats, deterministic) {
  return {
    name: name,
    deterministic: deterministic,
    utxos: null,
    wifs: {
      XgCLJNfaugnB35WTCMjKQ65GMBN41QtVQJ:
        "XC77GEs9w4wZfHN1xtgbGJFBvd8xJzt7ocnvEU6tStEft6MuyeaN",
      XhKPmX1ofTiu4L6veoxYKNca4KEg9AwjBV:
        "XDpL8c2jZ98xtegcKvmkErMKGj8nmjFZ1BtgUnHSF2uMzsvDzj8k",
    },
    inputs: [
      {
        address: "XgCLJNfaugnB35WTCMjKQ65GMBN41QtVQJ",
        satoshis: sats,
        //txId: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        txId: "0123456789abcdeffedcba987654321000112233445566778899aabbccddeeff",
        outputIndex: 0,
      },
    ],
    output: {
      address: "XhKPmX1ofTiu4L6veoxYKNca4KEg9AwjBV",
      satoshis: null, // full transfer
    },
    expected: {
      inputs: [{ satoshis: sats }],
      change: null,
      outputs: [
        {
          satoshis: sats - forcedFee, // 1008
        },
      ],
      fee: forcedFee,
      txByteSize: byteSizeFee,
    },
  };
}

async function testAll() {
  async function setupAndRunOne(original) {
    let dashTx = DashTx.create(keyUtils);
    let t1 = JSON.parse(JSON.stringify(original));
    let t2 = JSON.parse(JSON.stringify(original));
    let txDraft = dashTx.legacy.draftSingleOutput({
      utxos: t1.utxos,
      inputs: t1.inputs,
      output: t1.output,
    });
    txDraft.inputs.sort(DashTx.sortInputs);
    txDraft.outputs.sort(DashTx.sortOutputs);

    let keys = [];
    for (let input of txDraft.inputs) {
      let pkhBytes = await DashKeys.addrToPkh(input.address);
      input.pubKeyHash = DashKeys.utils.bytesToHex(pkhBytes);

      let wif = t1.wifs[input.address];
      let key = await DashKeys.wifToPrivKey(wif);
      if (!key) {
        let msg = `no WIF found for pubKeyAddr '${input.address}' (${input.satoshis})`;
        throw new Error(msg);
      }
      keys.push(key);
    }

    for (let output of txDraft.outputs) {
      let pkhBytes = await DashKeys.addrToPkh(output.address);
      output.pubKeyHash = DashKeys.utils.bytesToHex(pkhBytes);
    }

    let _keyUtils = Object.assign({}, keyUtils);
    let rndIters = 10;
    if (original.deterministic) {
      _keyUtils.sign = createNonRndSigner();
      rndIters = 2;
    }
    let myDashTx = DashTx.create(_keyUtils);

    await testOne(myDashTx, t2, txDraft, keys, rndIters).catch(function (err) {
      console.info(`# failed ${t1.name}`);
      console.info(`# txDraft`, txDraft);
      if (err.txSummary) {
        console.info(`# txSummary`, err.txSummary);
      }

      throw err;
    });

    console.info(
      `✅ ${t1.name} (no mismatch values over ${rndIters} random seeds)`,
    );
  }

  for (let t of tests) {
    await setupAndRunOne(t);
  }
}

function createNonRndSigner() {
  async function nonRndSign(privateKey, txHashBuf) {
    let Secp256k1 =
      //@ts-ignore
      /*window.nobleSecp256k1 ||*/ require("@dashincubator/secp256k1");

    let sigOpts = { canonical: true /*, extraEntropy: true */ };
    let sigBuf = await Secp256k1.sign(txHashBuf, privateKey, sigOpts);
    return sigBuf;
  }

  return nonRndSign;
}

async function testOne(myDashTx, original, txDraft, keys, rndIters) {
  for (let seedIterations = 0; seedIterations < rndIters; seedIterations += 1) {
    let t = JSON.parse(JSON.stringify(original));
    let exp = t.expected;

    let txSummary = await myDashTx.legacy.finalizePresorted(txDraft, keys);
    let txByteSize = txSummary.transaction.length / 2;
    // console.log("[DEBUG] txSummary");
    // console.log(txByteSize, txSummary.fee);
    // console.log(JSON.stringify(txSummary, null, 2));

    if (exp.inputs) {
      if (exp.inputs.length !== txSummary.inputs.length) {
        let msg = `expected ${exp.inputs.length} inputs, but saw '${txSummary.inputs.length}'`;
        throw new Error(msg);
      }

      for (let i = 0; i < exp.inputs.length; i += 1) {
        let satsMatch = exp.inputs[i].satoshis === txSummary.inputs[i].satoshis;
        if (!satsMatch) {
          let msg = `expected ${exp.inputs[i].satoshis} sats for input ${i}, but saw '${txSummary.inputs[i].satoshis}'`;
          throw new Error(msg);
        }
      }
    }

    if (exp.outputs) {
      if (exp.outputs.length !== txSummary.outputs.length) {
        let msg = `expected ${exp.outputs.length} outputs, but saw '${txSummary.outputs.length}'`;
        throw new Error(msg);
      }

      // for (let i = 0; i < exp.outputs.length; i += 1) {
      //   let satsMatch =
      //     exp.outputs[i].satoshis === txSummary.outputs[i].satoshis;
      //   if (!satsMatch) {
      //     let msg = `expected ${exp.outputs[i].satoshis} sats for output ${i}, but saw '${txSummary.outputs[i].satoshis}'`;
      //     console.log(JSON.stringify(txSummary, null, 2));
      //     throw new Error(msg);
      //   }
      // }
    }

    // if ("fee" in exp) {
    //   if (exp.fee !== txSummary.fee) {
    //     let msg = `expected fee of ${exp.fee}, but saw '${txSummary.fee}'`;
    //     throw new Error(msg);
    //   }
    // }

    let hasEnough = txSummary.fee >= txByteSize;
    if (!hasEnough) {
      console.log(JSON.stringify(txSummary, null, 2));
      let msg = `signed transaction size is ${txByteSize}, but fee was calculated as '${txSummary.fee}'`;
      throw new Error(msg);
    }
  }
}

testAll()
  .then(function () {
    console.info("PASS");
    process.exit(0);
  })
  .catch(function (err) {
    console.error("Fail:", err.stack || err);
    process.exit(1);
  });
