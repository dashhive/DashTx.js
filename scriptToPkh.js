"use strict";

/**
 * @param {String} script
 */
function scriptToPublicKey(script) {
  if (!script) {
    throw new Error("cannot derive 'pubKeyHash' from empty 'script'");
  }

  // length is either 33 or 34 bytes, plus 1 for type byte and 2 for op codes
  let pkhSize = (0x14).toString(16);
  let scriptEnd = (0x88ac).toString(16);
  let pkhHex = script.slice(-46);
  let last2 = script.slice(-4);
  if (scriptEnd !== last2) {
    throw new Error(
      "'script' is not a simple script ending with the 0x88 and 0xac op codes",
    );
  }
  console.log(pkhHex);

  if (pkhSize !== pkhHex.substring(0, 2)) {
    throw new Error(
      "'script' is not a simple script ending in a public key hash",
    );
  }
  pkhHex = pkhHex.substring(2, 40);
  return pkhHex;
}

console.log(scriptToPublicKey(process.argv[2]));
