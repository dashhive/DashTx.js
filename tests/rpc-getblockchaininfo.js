"use strict";

let Zora = require("zora");

let DashTx = require("../dashtx.js");

Zora.test("rpc 'getblockchaininfo'", async function (t) {
  let rpcUrl = "https://user:null@trpc.digitalcash.dev/";
  let info = await DashTx.utils.rpc(rpcUrl, "getblockchaininfo");
  t.equal(info.chain, "test", `trpc 'chain' should be 'test'`);
});
