/**
 * @typedef Tx
 * @prop {Uint53} SATOSHIS
 * @prop {Uint32} _HEADER_ONLY_SIZE
 * @prop {Uint32} HEADER_SIZE
 * @prop {Uint32} LEGACY_DUST
 * @prop {Uint32} MIN_INPUT_SIZE - 147 each
 * @prop {Uint32} MAX_INPUT_PAD - 2 (possible ASN.1 BigInt padding)
 * @prop {Uint32} MAX_INPUT_SIZE - 149 each (with padding)
 * @prop {Uint32} OUTPUT_SIZE - 34 each
 * @prop {Uint32|0x00000001} SIGHASH_ALL - 0x01
 * @prop {Uint32|0x00000002} SIGHASH_NONE - 0x02
 * @prop {Uint32|0x00000003} SIGHASH_SINGLE - 0x03 - Not Supported
 * @prop {Uint32|0x00000080} SIGHASH_ANYONECANPAY - 0x80
 * @prop {Uint32|0x00000081} SIGHASH_DEFAULT - 0x81
 * @prop {TxAppraise} appraise
 * @prop {TxAppraiseCounts} _appraiseCounts
 * @prop {TxAppraiseMemos} _appraiseMemos
 * @prop {TxToDash} toDash
 * @prop {TxToSats} toSats
 * @prop {TxCreate} create
 * @prop {TxCreateDonationOutput} createDonationOutput
 * @prop {TxCreateRaw} createRaw
 * @prop {TxCreateInputRaw} createInputRaw
 * @prop {TxCreateForSig} createForSig
 * @prop {TxCreateInputForSig} createInputForSig
 * @prop {TxCreatePkhScript} createPkhScript
 * @prop {TxCreateSigned} createSigned
 * @prop {TxGetId} getId - only useful for fully signed tx
 * @prop {TxCreateLegacyTx} createLegacyTx
 * @prop {TxDoubleSha256} doubleSha256
 * @prop {TxParseUnknown} parseUnknown
 * @prop {TxParseRequest} parseRequest
 * @prop {TxParseSigHash} parseSigHash
 * @prop {TxParseSigned} parseSigned
 * @prop {TxSelectSigHashInputs} selectSigHashInputs
 * @prop {TxSelectSigHashOutputs} selectSigHashOutputs
 * @prop {TxSerialize} serialize
 * @prop {TxSerializeForSig} serializeForSig
 * @prop {TxSerializeInputs} serializeInputs
 * @prop {TxSerializeInput} serializeInput
 * @prop {TxSerializeOutputs} serializeOutputs
 * @prop {TxSerializeOutput} serializeOutput
 * @prop {TxSortBySats} sortBySatsAsc
 * @prop {TxSortBySats} sortBySatsDsc
 * @prop {TxSortInputs} sortInputs
 * @prop {TxSortOutputs} sortOutputs
 * @prop {TxSum} sum - sums an array of TxInputUnspent
 * @prop {TxUtils} utils
 * @prop {Function} _createInsufficientFundsError
 * @prop {Function} _createMemoScript
 * @prop {Function} _debugPrint
 * @prop {Function} _legacyMustSelectInputs
 * @prop {Function} _legacySelectOptimalUtxos
 * @prop {Function} _parse
 */

/**
 * @typedef TxUtils
 * @prop {TxRPC} rpc
 * @prop {TxToVarInt} toVarInt
 * @prop {TxToVarIntSize} toVarIntSize
 * @prop {TxReverseHex} reverseHex
 * @prop {TxHexToBytes} hexToBytes
 * @prop {TxBytesToHex} bytesToHex
 * @prop {TxStringToHex} strToHex
 * @prop {TxToUint32LE} toUint32LE
 * @prop {TxToUint64LE} toUint64LE
 */

/**
 * @callback TxCreate
 * @param {TxKeyUtils} keyUtils
 * @returns {tx}
 */

/**
 * @typedef tx
 * @prop {TxHashAndSignAll} hashAndSignAll
 * @prop {TxHashAndSignInput} hashAndSignInput
 */

/** @type {Tx} */
//@ts-ignore
var DashTx = ("object" === typeof module && exports) || {};
(function (window, Tx) {
  "use strict";

  //@ts-ignore
  let Crypto = globalThis.crypto;

  let TxUtils = {};

  const CURRENT_VERSION = 3;
  const TYPE_VERSION = 0;
  const SATOSHIS = 100000000;

  const MAX_U8 = Math.pow(2, 8) - 1;
  const MAX_U16 = Math.pow(2, 16) - 1;
  const MAX_U32 = Math.pow(2, 32) - 1;
  const MAX_U53 = Number.MAX_SAFE_INTEGER; // Math.pow(2, 53) - 1
  const MAX_U64 = 2n ** 64n - 1n;

  const CH_0 = 48;
  const CH_9 = 57;
  const CH_A = 97;
  const CH_F = 102;

  const OP_RETURN = "6a"; // 106
  // Satoshis (64-bit) + lockscript size + OP_RETURN + Message Len
  const OP_RETURN_HEADER_SIZE = 8 + 1 + 1 + 1;

  const OP_PUSHDATA1 = "4c";
  const OP_PUSHDATA1_INT = 0x4c; // 76
  const OP_PUSHDATA2 = "4d";

  const OP_DUP = "76";
  const OP_HASH160 = "a9";
  const OP_EQUALVERIFY = "88";
  const OP_CHECKSIG = "ac";
  const PKH_SIZE = (20).toString(16); // 0x14
  const PKH_SCRIPT_SIZE = (25).toString(16); // 0x19

  //@ts-ignore - for debug only
  Tx._OP_DUP_HEX = OP_DUP;
  //@ts-ignore - for debug only
  Tx._OP_HASH160_HEX = OP_HASH160;
  //@ts-ignore - for debug only
  Tx._OP_EQUALVERIFY_HEX = OP_EQUALVERIFY;
  //@ts-ignore - for debug only
  Tx._OP_CHECKSIG_HEX = OP_CHECKSIG;
  //@ts-ignore - for debug only
  Tx._OP_RETURN_HEX = OP_RETURN;
  //@ts-ignore - for debug only
  Tx._PKH_SIZE_HEX = PKH_SIZE;
  //@ts-ignore - for debug only
  Tx._PKH_SCRIPT_SIZE_HEX = PKH_SCRIPT_SIZE;

  const E_KEYBYTES_UNDEFINED = `developer error: keyUtils.getPrivateKey() must return 'keyBytes' to sign, or 'null' to skip`;
  const E_LITTLE_INT =
    "JavaScript 'Number's only go up to uint53, you must use 'BigInt' (ex: `let amount = 18014398509481984n`) for larger values";
  const E_TOO_BIG_INT =
    "JavaScript 'BigInt's are arbitrarily large, but you may only use up to UINT64 for transactions";
  const E_NO_OUTPUTS = `'outputs' list must not be empty; use .createDonationOutput({ message }) to burn inputs`;

  Tx.SATOSHIS = SATOSHIS;
  Tx.LEGACY_DUST = 2000;

  Tx._HEADER_ONLY_SIZE =
    2 + // version
    2 + // type
    4; // locktime

  Tx.HEADER_SIZE =
    2 + // version
    2 + // type
    1 + // input count
    1 + // output count
    4; // locktime

  Tx.MIN_INPUT_SIZE = // 147~149 each
    4 + // outputIndex
    32 + // txId
    1 + // sigscriptsize
    106 + // sigscript
    4; // sequence

  Tx.MAX_INPUT_PAD = // possible ASN.1 BigInt padding
    1 + // Signature R value
    1 + // Signature S value
    0; // Public Key value is NOT BigInt padded

  Tx.MAX_INPUT_SIZE = Tx.MIN_INPUT_SIZE + Tx.MAX_INPUT_PAD;

  Tx.OUTPUT_SIZE = // 34 each
    8 + // satoshis (base units) value
    1 + // lockscript size
    25; // lockscript

  Tx.SIGHASH_ALL = 0x01;
  Tx.SIGHASH_NONE = 0x02;
  Tx.SIGHASH_SINGLE = 0x03; // Not Supported
  Tx.SIGHASH_ANYONECANPAY = 0x80;
  Tx.SIGHASH_DEFAULT = Tx.SIGHASH_ALL | Tx.SIGHASH_ANYONECANPAY;

  Tx.appraise = function (txInfo) {
    let extraSize = Tx._appraiseMemos(txInfo.outputs);
    let fees = Tx._appraiseCounts(
      txInfo.inputs.length,
      txInfo.outputs.length,
      extraSize,
    );

    return fees;
  };

  Tx._appraiseCounts = function (numInputs, numOutputs, extraSize) {
    let min = Tx._HEADER_ONLY_SIZE;

    min += Tx.utils.toVarIntSize(numInputs);
    min += Tx.MIN_INPUT_SIZE * numInputs;

    min += Tx.utils.toVarIntSize(numOutputs);
    if (extraSize) {
      min += extraSize; // memos, etc
    }

    let maxPadding = Tx.MAX_INPUT_PAD * numInputs;
    let max = min + maxPadding;

    let spread = max - min;
    let halfSpread = Math.ceil(spread / 2);
    let mid = min + halfSpread;

    let fees = { min, mid, max };
    return fees;
  };

  Tx._appraiseMemos = function (outputs) {
    let size = 0;

    for (let output of outputs) {
      if ("string" === typeof output.message) {
        if (!output.memo) {
          output.memo = TxUtils.strToHex(output.message);
        }
      }
      if ("string" === typeof output.memo) {
        let memoSize = output.memo.length / 2;
        if (memoSize > MAX_U8) {
          size += 2;
        } else if (memoSize >= OP_PUSHDATA1_INT) {
          size += 1;
        }
        size += OP_RETURN_HEADER_SIZE + memoSize;
        continue;
      }
      size += Tx.OUTPUT_SIZE;
    }

    return size;
  };

  Tx.toDash = function (satoshis) {
    let dashNum = satoshis / SATOSHIS;
    let dashStr = dashNum.toFixed(8);
    let floatBalance = parseFloat(dashStr);

    return floatBalance;
  };

  Tx.toSats = function (dash) {
    let sats = dash * SATOSHIS;
    sats = Math.round(sats);

    return sats;
  };

  Tx.create = function (keyUtils) {
    if (!keyUtils?.getPrivateKey) {
      throw new Error(`you must create with 'opts.getPrivateKey()'`);
    }

    if (!keyUtils.getPublicKey) {
      if (!keyUtils.toPublicKey) {
        const errGetPubKey =
          "you must provide 'getPublicKey()' (efficient) or 'toPublicKey()' (to convert private key)";
        throw new Error(errGetPubKey);
      }

      /** @type {TxGetPublicKey} */
      keyUtils.getPublicKey = async function (txInput, i, txInputs) {
        let privKeyBytes = await keyUtils.getPrivateKey(txInput, i, txInputs);
        //@ts-ignore - toPublicKey *is* defined above
        let pubKeyBytes = await keyUtils.toPublicKey(privKeyBytes);
        if ("string" === typeof pubKeyBytes) {
          throw new Error("toPublicKey() must return bytes (Uint8Array)");
        }
        return pubKeyBytes;
      };
    }
    /** @type {TxDeps} */
    //@ts-ignore
    let keyDeps = keyUtils;

    let txInst = {};

    /** @type {TxHashAndSignAll} */
    txInst.hashAndSignAll = async function (txInfo, sigHashType) {
      let sortedInputs = txInfo.inputs.slice(0);
      sortedInputs.sort(Tx.sortInputs);
      for (let i = 0; i < sortedInputs.length; i += 1) {
        let isSelf = sortedInputs[i] === txInfo.inputs[i];
        if (!isSelf) {
          console.warn(
            `txInfo.inputs are not ordered correctly, use txInfo.inputs.sort(Tx.sortInputs)\n(this will be an exception in the next version)`,
          );
          break;
        }
      }

      let sortedOutputs = txInfo.outputs.slice(0);
      sortedOutputs.sort(Tx.sortOutputs);
      for (let i = 0; i < sortedOutputs.length; i += 1) {
        let isSelf = sortedOutputs[i] === txInfo.outputs[i];
        if (!isSelf) {
          console.warn(
            `txInfo.outputs are not ordered correctly, use txInfo.outputs.sort(Tx.sortOutputs)\n(this will be an exception in the next version)`,
          );
          break;
        }
      }

      /** @type {TxInfoSigned} */
      let txInfoSigned = {
        version: txInfo.version || CURRENT_VERSION,
        type: txInfo.type || TYPE_VERSION,
        /** @type {Array<TxInputSigned>} */
        inputs: [],
        outputs: txInfo.outputs,
        locktime: txInfo.locktime || 0x00,
        extraPayload: txInfo.extraPayload || "",
        transaction: "",
      };

      for (let i = 0; i < txInfo.inputs.length; i += 1) {
        let txInput = txInfo.inputs[i];
        let privBytes = await keyDeps.getPrivateKey(txInput, i, txInfo.inputs);
        if (privBytes) {
          txInput = await txInst.hashAndSignInput(
            privBytes,
            txInfo,
            i,
            sigHashType,
          );
        } else if (privBytes !== null) {
          throw new Error(E_KEYBYTES_UNDEFINED);
        } else {
          // same as txInput = Tx.createInputRaw(txInput, i);
          // (but we don't want to strip .address, etc)
        }

        //@ts-ignore - TODO - may be partially signed
        txInfoSigned.inputs.push(txInput);
      }

      txInfoSigned.transaction = Tx.serialize(txInfoSigned);
      return txInfoSigned;
    };

    /** @type {TxHashAndSignInput} */
    txInst.hashAndSignInput = async function (
      privBytes,
      txInfo,
      i,
      sigHashType,
    ) {
      let txInput = txInfo.inputs[i];

      let _sigHashType =
        txInput.sigHashType ?? sigHashType ?? Tx.SIGHASH_DEFAULT;

      // let inputs = Tx.selectSigHashInputs(txInfo, i, _sigHashType);
      // let outputs = Tx.selectSigHashOutputs(txInfo, i, _sigHashType);
      // let txForSig = Object.assign({}, txInfo, { inputs, outputs });
      // let txSigHash = Tx.createForSig(txForSig, i, _sigHashType);

      let txSigHash = Tx.createForSig(txInfo, i, _sigHashType);
      let txHex = Tx.serialize(txSigHash, _sigHashType);
      let txBytes = Tx.utils.hexToBytes(txHex);
      let txHashBuf = await Tx.doubleSha256(txBytes);

      let sigBuf = await keyDeps.sign(privBytes, txHashBuf);
      let sigHex = "";
      if ("string" === typeof sigBuf) {
        console.warn(`sign() should return a Uint8Array of an ASN.1 signature`);
        sigHex = sigBuf;
      } else {
        sigHex = Tx.utils.bytesToHex(sigBuf);
      }

      let pubKeyHex = txInput.publicKey;
      if (!pubKeyHex) {
        let pubKey = await keyDeps.getPublicKey(txInput, i, txInfo.inputs);
        if (!pubKey) {
          throw new Error(`no public key for input ${i}`);
        }
        pubKeyHex = Tx.utils.bytesToHex(pubKey);
      }
      if ("string" !== typeof pubKeyHex) {
        let warn = new Error("stack");
        console.warn(
          `utxo inputs should be plain JSON and use hex rather than buffers for 'publicKey'`,
          warn.stack,
        );
        pubKeyHex = Tx.utils.bytesToHex(pubKeyHex);
      }

      /** @type TxInputSigned */
      let txInputSigned = Object.assign(
        {
          _transaction: txHex,
          _hash: Tx.utils.bytesToHex(txHashBuf),
          _indexForSig: txSigHash.indexForSig,
          _lockScript: txSigHash.inputs[txSigHash.indexForSig].script,
        },
        txInput,
        {
          txid: txInput.txId || txInput.txid,
          txId: txInput.txId || txInput.txid,
          outputIndex: txInput.outputIndex,
          signature: sigHex,
          publicKey: pubKeyHex,
          sigHashType: _sigHashType,
        },
      );
      return txInputSigned;
    };

    txInst.legacy = {};

    /**
     * @param {Object} opts
     * @param {Array<CoreUtxo>?} [opts.inputs]
     * @param {Array<CoreUtxo>?} [opts.utxos]
     * @param {TxOutput} opts.output
     * @returns {TxDraft}
     */
    txInst.legacy.draftSingleOutput = function ({ utxos, inputs, output }) {
      let fullTransfer = false;

      if (!inputs) {
        inputs = DashTx._legacyMustSelectInputs({
          utxos: utxos,
          satoshis: output.satoshis,
        });
        if (!inputs) {
          // tsc can't tell that 'inputs' was just guaranteed
          throw new Error(`type checker workaround`);
        }
      } else {
        fullTransfer = !output.satoshis;
      }

      let totalAvailable = DashTx.sum(inputs);
      //@ts-ignore - TODO update typedefs
      let fees = DashTx.appraise({ inputs: inputs, outputs: [output] });

      //let EXTRA_SIG_BYTES_PER_INPUT = 2;
      let CHANCE_INPUT_SIGS_HAVE_NO_EXTRA_BYTES = 1 / 4;
      let MINIMUM_CHANCE_SIG_MATCHES_TARGET = 1 / 20;

      let feeTarget = fees.min;
      let chanceSignaturesMatchLowestFee = Math.pow(
        CHANCE_INPUT_SIGS_HAVE_NO_EXTRA_BYTES,
        inputs.length,
      );
      let minimumIsUnlikely =
        chanceSignaturesMatchLowestFee < MINIMUM_CHANCE_SIG_MATCHES_TARGET;
      if (minimumIsUnlikely) {
        //let likelyPadByteSize = EXTRA_SIG_BYTES_PER_INPUT * inputs.length;
        let likelyPadByteSize = inputs.length;
        feeTarget += likelyPadByteSize;
      }

      let recip = Object.assign({}, output);
      if (!recip.satoshis) {
        recip.satoshis = totalAvailable + -feeTarget;
      }
      let outputs = [recip];

      let change;
      let changeSats =
        totalAvailable + -recip.satoshis + -feeTarget + -DashTx.OUTPUT_SIZE;
      let hasChange = changeSats > DashTx.LEGACY_DUST;
      if (hasChange) {
        change = { address: "", satoshis: changeSats };
        outputs.push(change);
        feeTarget += DashTx.OUTPUT_SIZE;
      } else {
        change = null;
        // Re: Dash Direct: we round in favor of the network (exact payments)
        feeTarget = totalAvailable + -recip.satoshis;
      }

      let txInfoRaw = {
        inputs,
        outputs,
        change,
        feeTarget,
        fullTransfer,
      };

      //@ts-ignore - TODO update typedefs
      return txInfoRaw;
    };

    /**
     * @param {TxDraft} txDraft
     * @returns {Promise<TxSummary>}
     */
    txInst.legacy.finalizePresorted = async function (txDraft) {
      /** @type {TxInfoSigned} */
      let txSigned = await txInst.legacy
        ._signToTarget(txDraft)
        .catch(async function (e) {
          if ("E_NO_ENTROPY" !== e.code) {
            throw e;
          }

          let _txSigned = await txInst.legacy._signFeeWalk(txDraft);
          return _txSigned;
        });

      let txSummary = txInst.legacy._summarizeTx(txSigned);
      return txSummary;
    };

    /**
     * @param {TxDraft} txDraft
     * @returns {Promise<TxInfoSigned>}
     */
    txInst.legacy._signToTarget = async function (txDraft) {
      let limit = 128;
      let lastTx = "";
      let hasEntropy = true;

      /** @type {TxInfoSigned} */
      let txSigned;
      let fee;

      for (let n = 0; true; n += 1) {
        txSigned = await txInst.hashAndSignAll(txDraft);

        fee = txSigned.transaction.length / 2;
        if (fee <= txDraft.feeTarget) {
          break;
        }

        if (txSigned.transaction === lastTx) {
          hasEntropy = false;
          break;
        }
        lastTx = txSigned.transaction;

        if (n >= limit) {
          let msg = `(near-)infinite loop: fee is ${fee} trying to hit target fee of ${txDraft.feeTarget}`;
          throw new Error(msg);
        }
      }
      if (!hasEntropy) {
        let err = new Error(
          "secp256k1 implementation does not use signature entropy",
        );
        Object.assign(err, { code: "E_NO_ENTROPY" });
        throw err;
      }

      return txSigned;
    };

    /**
     * Strategy for signing transactions when a non-entropy signing method is used -
     * exhaustively walk each possible signature until one that works is found.
     * @param {TxDraft} txDraft
     * @returns {Promise<TxInfoSigned>}
     */
    txInst.legacy._signFeeWalk = async function (txDraft) {
      //@ts-ignore - TODO should have satoshis by now
      let totalIn = DashTx.sum(txDraft.inputs);
      let totalOut = DashTx.sum(txDraft.outputs);
      let totalFee = totalIn - totalOut;

      let fees = DashTx.appraise(txDraft);
      let limit = fees.max - totalFee;

      /** @type TxInfoSigned */
      let txSigned;

      for (let n = 0; true; n += 1) {
        let changeSats = txDraft.change?.satoshis || 0;
        let hasChange = changeSats > 0;
        let canIncreaseFee = txDraft.fullTransfer || hasChange;
        if (!canIncreaseFee) {
          // TODO try to add another utxo before failing
          throw new Error(
            `no signing entropy and the fee variance is too low to cover the marginal cost of all possible signature iterations`,
          );
        }

        let outIndex = 0;
        if (hasChange) {
          outIndex = txDraft.outputs.length - 1;
        }
        txDraft.outputs[outIndex].satoshis -= 1;
        totalFee += 1;

        txSigned = await txInst.hashAndSignAll(txDraft);

        let byteFee = txSigned.transaction.length / 2;
        if (byteFee <= totalFee) {
          break;
        }

        if (n >= limit) {
          throw new Error(
            `(near-)infinite loop: fee is ${byteFee} trying to hit target fee of ${txDraft.feeTarget}`,
          );
        }
      }

      return txSigned;
    };

    /**
     * @param {TxInfoSigned} txInfo
     * @returns {TxSummary}
     */
    txInst.legacy._summarizeTx = function (txInfo) {
      //@ts-ignore - our inputs are mixed with CoreUtxo
      let totalAvailable = Tx.sum(txInfo.inputs);

      let recipient = txInfo.outputs[0];
      // to satisfy tsc
      if (!recipient.address) {
        recipient.address = "";
      }

      let sent = recipient.satoshis;
      let fee = totalAvailable - sent;

      let changeSats = 0;
      let change = txInfo.outputs[1];
      if (change) {
        changeSats = change.satoshis;
      }
      fee -= changeSats;

      // 000 0.00 000 000
      let summaryPartial = {
        total: totalAvailable,
        sent: sent,
        fee: fee,
        output: recipient,
        recipient: recipient,
        change: change,
      };
      let summary = Object.assign({}, txInfo, summaryPartial);

      return summary;
    };

    return txInst;
  };

  Tx.selectSigHashInputs = function (
    txInfo,
    i,
    sigHashType = Tx.SIGHASH_DEFAULT,
  ) {
    let inputs = txInfo.inputs;

    if (sigHashType & Tx.SIGHASH_ANYONECANPAY) {
      let txInput = txInfo.inputs[i];
      inputs = [txInput];
    }

    return inputs;
  };

  Tx.selectSigHashOutputs = function (
    txInfo,
    i,
    sigHashType = Tx.SIGHASH_DEFAULT,
  ) {
    let outputs = txInfo.outputs;
    if (sigHashType & Tx.SIGHASH_ALL) {
      return outputs;
    }

    if (sigHashType & Tx.SIGHASH_NONE) {
      outputs = [];
      return outputs;
    }

    if (sigHashType & Tx.SIGHASH_SINGLE) {
      let output = txInfo.outputs[i];
      outputs = [output];
      throw new Error(
        "SIGHASH_SINGLE conflicts with BIP-69, see https://github.com/dashhive/DashTx.js/issues/66",
      );
    }

    throw new Error(
      `expected SIGHASH_[ALL|NONE], but got unrecognized type: ${sigHashType}`,
    );
  };

  /**
   * Creates a transaction that is guaranteed to be signable.  Selects
   * the smallest coin that is bigger or equal to the amount sent + fees,
   * or the largest available coins until that total is met.
   */
  //@ts-ignore - TODO update typedefs
  Tx.createLegacyTx = function (coins, outputs, changeOutput, extraPayload) {
    // TODO bump to 4 for DIP: enforce tx hygiene
    let version = CURRENT_VERSION;
    let type = TYPE_VERSION;

    coins = coins.slice(0);
    outputs = outputs.slice(0);
    changeOutput = Object.assign({}, changeOutput);

    coins.sort(Tx.sortBySatsAsc);

    let totalBalance = Tx.sum(coins);

    /** @type {Array<TxInputUnspent>} */
    let inputs = [];
    //@ts-ignore - TODO update typedefs
    let fees = DashTx.appraise({ inputs, outputs });
    let taxes = fees.max;
    // requires at least one input
    taxes += Tx.MAX_INPUT_SIZE;

    let subtotal = Tx.sum(outputs);
    let total = subtotal + taxes;

    let cash = 0;
    /** @type {Array<TxInputUnspent>} */
    let biggerOrEqual = [];
    for (;;) {
      let input = coins.pop();
      if (input) {
        if (input.satoshis >= total) {
          biggerOrEqual.push(input);
          continue;
        }
      }

      if (biggerOrEqual.length) {
        input = biggerOrEqual.pop();
      }

      if (!input) {
        break;
      }

      let sats = input.satoshis;
      cash += sats;
      inputs.push(input);

      if (cash >= total) {
        break;
      }

      // requires at least one more input
      total += Tx.MAX_INPUT_SIZE;
    }

    if (cash < total) {
      total -= Tx.MAX_INPUT_SIZE;
      if (cash < totalBalance) {
        throw new Error(
          `developer error: did not use full balance of ${totalBalance} when calculating available balance of ${cash} to pay ${total}`,
        );
      }
      throw new Error(
        `balance of ${cash} cannot pay for the transaction + fees of ${total}`,
      );
    }

    let change = 0;
    let dust = cash + -total + -Tx.OUTPUT_SIZE;
    if (dust >= Tx.LEGACY_DUST) {
      change = dust;
      changeOutput.satoshis = change;
      outputs.push(changeOutput);
      total += Tx.OUTPUT_SIZE;
    }

    taxes = total - subtotal;

    inputs.sort(Tx.sortInputs);
    outputs.sort(Tx.sortOutputs);
    let changeIndex = outputs.indexOf(changeOutput);

    let locktime = 0;

    let txInfo = {
      version,
      type,
      inputs,
      outputs,
      changeIndex,
      locktime,
      extraPayload,
    };
    // let change = txInfo.outputs[txInfo.changeIndex];

    return txInfo;
  };
  //@ts-ignore - old usage - TODO REMOVE for v1
  Tx.legacyCreateTx = Tx.createLegacyTx;

  Tx.sortBySatsAsc = function (a, b) {
    let aSats = a.satoshis;
    let bSats = b.satoshis;

    let diff = aSats - bSats;
    if (diff > 0) {
      return 1;
    }
    if (diff < 0) {
      return -1;
    }

    return 0;
  };

  Tx.sortBySatsDsc = function (a, b) {
    let aSats = a.satoshis;
    let bSats = b.satoshis;

    let diff = aSats - bSats;
    if (diff > 0) {
      return -1;
    }
    if (diff < 0) {
      return 1;
    }

    return 0;
  };

  /**
   * Lexicographical Indexing of Transaction Inputs and Outputs
   * See <https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki>
   *
   * Keeps ordering deterministic to avoid data leakage.
   *
   * - ASC `txId` (a.k.a. `txid`, `prev_hash`)
   *   Note: the comparison is done with the normal (Big-Endian) ordering
   *   whereas the byte order of wire format is reversed (Little-Endian)
   *
   * - ASC `outputIndex` (a.k.a. `output_index`, `vout`)
   */
  Tx.sortInputs = function (a, b) {
    let aTxid = a.txId || a.txid;
    let bTxid = b.txId || b.txid;
    // Ascending Lexicographical on TxId (prev-hash) in-memory (not wire) byte order
    if (aTxid > bTxid) {
      return 1;
    }
    if (aTxid < bTxid) {
      return -1;
    }

    // Ascending Vout (Numerical)
    let indexDiff = a.outputIndex - b.outputIndex;
    return indexDiff;
  };

  /**
   * Lexicographical Indexing of Transaction Inputs and Outputs
   * See <https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki>
   *
   * Note: this must be updated to support new types of script comparison.
   *
   * @param {TxOutputSortable} a
   * @param {TxOutputSortable} b
   * @returns {Uint32}
   */
  Tx.sortOutputs = function (a, b) {
    // the complexity is inherent, and doesn't seem to be reasonable to break out
    /* jshint maxcomplexity:30 */

    let satsA = a.satoshis;
    let satsB = b.satoshis;
    let sats = satsA - satsB;
    if (sats < 0) {
      return -1;
    }
    if (sats > 0) {
      return 1;
    }

    // memo vs non-memo is settled by 'satoshis' being 0
    // (otherwise there's a bug)
    if (typeof a.memo === "string") {
      if (typeof b.memo !== "string") {
        throw new Error(`'satoshis' must be above 0, except for memos`);
      }
      if (a.memo < b.memo) {
        return -1;
      }
      if (a.memo > b.memo) {
        return 1;
      }
      return 0;
    }

    if (a.pubKeyHash && b.pubKeyHash) {
      if (a.pubKeyHash > b.pubKeyHash) {
        return 1;
      }
      if (a.pubKeyHash < b.pubKeyHash) {
        return -1;
      }
      return 0;
    }

    if (a.address && b.address) {
      if (a.address > b.address) {
        return 1;
      }
      if (a.address < b.address) {
        return -1;
      }
      return 0;
    }

    let scriptTypeA = `${OP_DUP}${OP_HASH160}`;
    let scriptTypeB = scriptTypeA;
    if (a.script) {
      scriptTypeA = a.script.slice(0, 4);
    }
    if (b.script) {
      scriptTypeB = b.script.slice(0, 4);
    }
    if (scriptTypeA < scriptTypeB) {
      return -1;
    }
    if (scriptTypeA > scriptTypeB) {
      return 1;
    }

    if (a.script && b.script) {
      if (a.script < b.script) {
        return -1;
      }
      if (a.script > b.script) {
        return 1;
      }
      return 0;
    }

    let jsonA = JSON.stringify(a, null, 2);
    let jsonB = JSON.stringify(b, null, 2);
    throw new Error(
      `developer error: these outputs cannot be compared:\n${jsonA}\n${jsonB}\n(probably either mixed types - address & pubKeyHash - or unsupported output types were given)`,
    );
  };

  /**
   * @template {Pick<CoreUtxo, "satoshis">} T
   * @param {Object} opts
   * @param {Array<T>} opts.utxos
   * @param {Uint53} [opts.satoshis]
   * @param {Uint53} [opts.now] - ms
   * @returns {Array<T>}
   */
  Tx._legacyMustSelectInputs = function ({ utxos, satoshis }) {
    if (!satoshis) {
      let msg = `expected target selection value 'satoshis' to be a positive integer but got '${satoshis}'`;
      let err = new Error(msg);
      throw err;
    }

    let selected = Tx._legacySelectOptimalUtxos(utxos, satoshis);
    if (!selected.length) {
      throw Tx._createInsufficientFundsError(utxos, satoshis);
    }

    return selected;
  };

  /**
   * @template {Pick<CoreUtxo, "satoshis">} T
   * @param {Array<T>} utxos
   * @param {Uint53} outputSats
   * @return {Array<T>}
   */
  Tx._legacySelectOptimalUtxos = function (utxos, outputSats) {
    let numOutputs = 1;
    let extraSize = 0;
    let fees = DashTx._appraiseCounts(utxos.length, numOutputs, extraSize);

    let fullSats = outputSats + fees.min;

    let balance = Tx.sum(utxos);
    if (balance < fullSats) {
      /** @type Array<T> */
      return [];
    }

    // from largest to smallest
    utxos.sort(function (a, b) {
      return b.satoshis - a.satoshis;
    });

    /** @type Array<T> */
    let included = [];
    let total = 0;

    // try to get just one
    utxos.every(function (utxo) {
      if (utxo.satoshis > fullSats) {
        included[0] = utxo;
        total = utxo.satoshis;
        return true;
      }
      return false;
    });
    if (total) {
      return included;
    }

    // try to use as few coins as possible
    let hasEnough = utxos.some(function (utxo, i) {
      included.push(utxo);
      total += utxo.satoshis;
      if (total >= fullSats) {
        return true;
      }

      // TODO we could optimize for minimum and retry on exception during finalize

      // it quickly becomes astronomically unlikely to hit the one
      // exact possibility that least to paying the absolute minimum,
      // but remains about 75% likely to hit any of the mid value
      // possibilities
      if (i < 2) {
        // 1 input 25% chance of minimum (needs ~2 tries)
        // 2 inputs 6.25% chance of minimum (needs ~8 tries)
        fullSats = fullSats + DashTx.MIN_INPUT_SIZE;
        return false;
      }
      // but by 3 inputs... 1.56% chance of minimum (needs ~32 tries)
      // by 10 inputs... 0.00953674316% chance (needs ~524288 tries)
      fullSats = fullSats + DashTx.MIN_INPUT_SIZE + 1;
    });
    if (!hasEnough) {
      /** @type Array<T> */
      return [];
    }

    return included;
  };

  /**
   * @param {Array<CoreUtxo>} allInputs
   * @param {Uint53} satoshis
   * @throws {Error}
   */
  Tx._createInsufficientFundsError = function (allInputs, satoshis) {
    let totalBalance = Tx.sum(allInputs);
    let dashBalance = Tx.toDash(totalBalance);
    let dashAmount = Tx.toDash(satoshis);

    let numOutputs = 1;
    let extraSize = 0;
    let fees = DashTx._appraiseCounts(allInputs.length, numOutputs, extraSize);
    let feeAmount = Tx.toDash(fees.mid);

    let msg = `insufficient funds: cannot pay ${dashAmount} (+${feeAmount} fee) with ${dashBalance}`;
    let err = new Error(msg);
    throw err;
  };

  // TODO createRequest
  Tx.createRaw = function (txInfo) {
    let txInfoRaw = Object.assign({}, txInfo);

    txInfoRaw.inputs = [];
    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let input = txInfo.inputs[i];
      let rawInput = Tx.createInputRaw(input, i);
      txInfoRaw.inputs.push(rawInput);
    }

    return txInfoRaw;
  };

  // TODO createRequestInput
  Tx.createInputRaw = function (input, i) {
    let rawInput = {
      txid: input.txId || input.txid,
      txId: input.txId || input.txid,
      outputIndex: input.outputIndex,
    };

    return rawInput;
  };

  Tx.createForSig = function (txInfo, inputIndex, sigHashType) {
    let txForSig = Object.assign({ indexForSig: -1 }, txInfo);

    /** @type {Array<TxInputRaw|TxInputForSig>} */
    txForSig.inputs = [];
    for (let i = 0; i < txInfo.inputs.length; i += 1) {
      let input = txInfo.inputs[i];
      if (inputIndex === i) {
        let sighashInput = Tx.createInputForSig(input, i);
        txForSig.indexForSig += txForSig.inputs.push(sighashInput);
        continue;
      }

      if (!(sigHashType & Tx.SIGHASH_ANYONECANPAY)) {
        let rawInput = Tx.createInputRaw(input, i);
        txForSig.inputs.push(rawInput);
      }
    }

    return txForSig;
  };

  Tx.createInputForSig = function (input, i) {
    let lockScript = input.script;
    if (!lockScript) {
      if (!input.pubKeyHash) {
        throw new Error(
          `signable input must have either 'pubKeyHash' or 'script'`,
        );
      }
      lockScript = Tx.createPkhScript(input.pubKeyHash);
    }
    return {
      txId: input.txId || input.txid,
      txid: input.txId || input.txid,
      outputIndex: input.outputIndex,
      pubKeyHash: input.pubKeyHash,
      sigHashType: input.sigHashType,
      script: lockScript,
    };
  };

  /**
   * @param {Hex} pubKeyHash
   * @returns {Hex}
   */
  Tx.createPkhScript = function (pubKeyHash) {
    let lockScript = `${OP_DUP}${OP_HASH160}${PKH_SIZE}${pubKeyHash}${OP_EQUALVERIFY}${OP_CHECKSIG}`;
    return lockScript;
  };

  Tx.serialize = function (
    {
      version = CURRENT_VERSION,
      type = TYPE_VERSION,
      inputs,
      outputs,
      locktime = 0x0,
      extraPayload = "",
      /* maxFee = 10000, */
      _debug = false,
    },
    sigHashType,
  ) {
    let _sep = "";
    if (_debug) {
      _sep = "\n";
    }

    /** @type Array<String> */
    let tx = [];
    let v = TxUtils._toUint16LE(version);
    tx.push(v);
    let t = TxUtils._toUint16LE(type);
    tx.push(t);

    void Tx.serializeInputs(inputs, { _tx: tx, _sep: _sep });
    void Tx.serializeOutputs(outputs, { _tx: tx, _sep: _sep });

    let locktimeHex = TxUtils.toUint32LE(locktime);
    tx.push(locktimeHex);

    if (extraPayload) {
      let nExtraPayload = Tx.utils.toVarInt(extraPayload.length / 2);
      tx.push(nExtraPayload);
      tx.push(extraPayload);
    }

    if (sigHashType) {
      let sigHashTypeHex = TxUtils.toUint32LE(sigHashType);
      tx.push(sigHashTypeHex);
    }

    let txHex = tx.join(_sep);
    return txHex;
  };
  //@ts-ignore - same function, but typed and documented separately for clarity
  Tx.serializeForSig = Tx.serialize;

  Tx.serializeInputs = function (inputs, _opts) {
    let tx = _opts?._tx || [];
    let _sep = _opts?._sep || "";

    let nInputs = Tx.utils.toVarInt(inputs.length);
    tx.push(nInputs);

    for (let i = 0; i < inputs.length; i += 1) {
      let input = inputs[i];
      let inputHex = Tx.serializeInput(input, i, { _sep: _sep });
      let txIn = inputHex.join(_sep);
      tx.push(txIn);
    }

    return tx;
  };

  Tx.serializeInput = function (input, i, _opts) {
    let tx = _opts?._tx || [];

    if (!input.txid) {
      throw new Error("missing required utxo property 'txid'");
    }

    if (64 !== input.txid.length) {
      throw new Error(
        `expected uxto property 'txid' to be a valid 64-character (32-byte) hex string, but got '${input.txid}' (size ${input.txid.length})`,
      );
    }

    assertHex(input.txid, "txid");

    let reverseTxId = Tx.utils.reverseHex(input.txid);
    tx.push(reverseTxId);

    let voutIndex = input.outputIndex;
    if (isNaN(voutIndex)) {
      throw new Error(
        `expected utxo property 'input[${i}]outputIndex' to be an integer representing this input's previous output index`,
      );
    }
    let reverseVout = TxUtils.toUint32LE(voutIndex);
    tx.push(reverseVout);

    //@ts-ignore - enum types not handled properly here
    if (input.signature) {
      //@ts-ignore
      let sigHashTypeVar = Tx.utils.toVarInt(input.sigHashType);
      //@ts-ignore
      let sig = `${input.signature}${sigHashTypeVar}`;
      let sigSize = Tx.utils.toVarInt(sig.length / 2);

      //@ts-ignore
      let keySize = Tx.utils.toVarInt(input.publicKey.length / 2);
      //@ts-ignore
      let sigScript = `${sigSize}${sig}${keySize}${input.publicKey}`;
      let sigScriptLen = sigScript.length / 2;
      let sigScriptLenSize = Tx.utils.toVarInt(sigScriptLen);
      tx.push(sigScriptLenSize);
      tx.push(sigScript);
      //@ts-ignore
    } else if (input.script) {
      //@ts-ignore
      let lockScript = input.script;
      //@ts-ignore
      let lockScriptLen = input.script.length / 2;
      let lockScriptLenSize = Tx.utils.toVarInt(lockScriptLen);
      tx.push(lockScriptLenSize);
      tx.push(lockScript);
    } else {
      let rawScriptSize = "00";
      let rawScript = "";
      tx.push(rawScriptSize);
      tx.push(rawScript);
    }

    let sequence = "ffffffff";
    tx.push(sequence);

    return tx;
  };

  Tx.serializeOutputs = function (outputs, opts) {
    let tx = opts?._tx || [];
    let _sep = opts?._sep || "";

    if (!outputs.length) {
      throw new Error(E_NO_OUTPUTS);
    }

    let nOutputs = Tx.utils.toVarInt(outputs.length);
    tx.push(nOutputs);

    for (let i = 0; i < outputs.length; i += 1) {
      let output = outputs[i];
      let outputHex = Tx.serializeOutput(output, i, { _sep });
      let txOut = outputHex.join(_sep);
      tx.push(txOut);
    }

    return tx;
  };

  Tx.serializeOutput = function (output, i, _opts) {
    let tx = _opts?._tx || [];
    let _sep = _opts?._sep || "";

    if (output.message) {
      if (!output.memo) {
        output.memo = TxUtils.strToHex(output.message);
      }
    }
    if (typeof output.memo === "string") {
      let invalid = output.address || output.pubKeyHash;
      if (invalid) {
        throw new Error(`memo outputs must not have 'address' or 'pubKeyHash'`);
      }

      let sats = output.satoshis || 0;
      let memoScriptHex = Tx._createMemoScript(output.memo, sats, i);
      let txOut = memoScriptHex.join(_sep);

      tx.push(txOut);
      return tx;
    }

    if (!output.satoshis) {
      throw new Error(`every output must have 'satoshis'`);
    }
    let satoshis = TxUtils.toUint64LE(output.satoshis);
    tx.push(satoshis);

    if (!output.pubKeyHash) {
      throw new Error(`every output must have 'pubKeyHash' as a hex string`);
    }
    assertHex(output.pubKeyHash, `output[${i}].pubKeyHash`);

    tx.push(PKH_SCRIPT_SIZE);
    //let lockScript = `${OP_DUP}${OP_HASH160}${PKH_SIZE}${output.pubKeyHash}${OP_EQUALVERIFY}${OP_CHECKSIG}`;
    tx.push(`${OP_DUP}${OP_HASH160}`);
    tx.push(PKH_SIZE);
    tx.push(output.pubKeyHash);
    tx.push(`${OP_EQUALVERIFY}${OP_CHECKSIG}`);

    return tx;
  };

  Tx.createDonationOutput = function (opts) {
    let satoshis = 0;
    let message = opts?.message;
    if (typeof message !== "string") {
      let gifts = ["💸", "🎁", "🧧"];
      let indexIsh = Math.random() * 3;
      let index = Math.floor(indexIsh);
      message = gifts[index];
    }

    let output = { satoshis, message };
    return output;
  };

  /**
   * @param {String} memoHex - the memo bytes, in hex
   * @param {Uint53} sats - typically 0, but 1.0 for proposal collateral
   * @returns {Array<String>} - memo script hex
   */
  Tx._createMemoScript = function (memoHex, sats, i = 0) {
    let outputHex = [];
    let satoshis = TxUtils.toUint64LE(sats);
    outputHex.push(satoshis);

    assertHex(memoHex, `output[${i}].memo`);

    let memoSize = memoHex.length / 2;
    if (memoSize > 80) {
      // Total lock script size is limited to 83 bytes.
      // The message portion is limited to 75 bytes,
      // but can be can extended up to 80 with OP_PUSHDATA1.
      //
      // See <https://docs.dash.org/projects/core/en/stable/docs/guide/transactions-standard-transactions.html#null-data>
      throw new Error(
        `memos are limited to 80 bytes as per "Core Docs: Standard Transactions: Null Data"`,
      );
    }

    let lockScriptSize = memoSize + 2;

    // See https://github.com/bitcoin-sv-specs/op_return/blob/master/01-PUSHDATA-data-element-framing.md#pushdata-data-framing-for-op_return
    let opReturn = OP_RETURN;
    if (memoSize > MAX_U8) {
      opReturn = `${OP_RETURN}${OP_PUSHDATA2}`;
      lockScriptSize += 2;
    } else if (memoSize >= OP_PUSHDATA1_INT) {
      opReturn = `${OP_RETURN}${OP_PUSHDATA1}`;
      lockScriptSize += 1;
    }

    let memoSizeHex = memoSize.toString(16);
    let isPadded = 0 === memoSizeHex.length % 2;
    if (!isPadded) {
      memoSizeHex = `0${memoSizeHex}`;
    }

    let lockScriptSizeHex = TxUtils.toVarInt(lockScriptSize);

    outputHex.push(lockScriptSizeHex);
    //let lockScript = `${opReturn}${memoSizeHex}${memoHex}`;
    outputHex.push(opReturn);
    outputHex.push(memoSizeHex);
    outputHex.push(memoHex);

    return outputHex;
  };

  Tx.sum = function (coins) {
    let balance = 0;
    for (let utxo of coins) {
      let sats = utxo.satoshis;
      balance += sats;
    }

    return balance;
  };

  Tx.getId = async function (txHex) {
    let u8 = Tx.utils.hexToBytes(txHex);
    //console.log("Broadcastable Tx Buffer");
    //console.log(u8);

    let hashU8 = await Tx.doubleSha256(u8);

    let reverseU8 = new Uint8Array(hashU8.length);
    let reverseIndex = reverseU8.length - 1;
    hashU8.forEach(
      /** @param {Uint8} b */
      function (b) {
        reverseU8[reverseIndex] = b;
        reverseIndex -= 1;
      },
    );

    //console.log("Reversed Round 2 Hash Buffer");
    //console.log(reverseU8);

    let id = Tx.utils.bytesToHex(reverseU8);
    return id;
  };

  /**
   * @param {Uint8Array} bytes
   * @returns {Promise<Uint8Array>} - the reversed double-sha256sum
   */
  Tx.doubleSha256 = async function (bytes) {
    let ab = await Crypto.subtle.digest({ name: "SHA-256" }, bytes);
    //console.log("Round 1 Hash Buffer");
    //console.log(ab);

    ab = await Crypto.subtle.digest({ name: "SHA-256" }, ab);
    let hashU8 = new Uint8Array(ab);

    //console.log("Round 2 Hash Buffer");
    //console.log(hashU8);

    return hashU8;
  };

  /**
   * @param {String} txHex
   */
  Tx.parseUnknown = function (txHex) {
    /**@type {TxInfo}*/
    //@ts-ignore
    let txInfo = {};
    try {
      void Tx._parse(txHex, txInfo);
    } catch (e) {
      /**@type {Error}*/
      //@ts-ignore - trust me bro, it's an error
      let err = e;
      Object.assign(err, {
        code: "E_TX_PARSE",
        transaction: txInfo,
      });
      let msg =
        "parse failed, try ./DashTx.js/bin/inpsect.js <tx.hex> for detail";
      err.message += `\n${msg}`;
      throw err;
    }

    return txInfo;
  };

  /**
   * @param {Object<String, any>} tx
   * @param {String} hex
   */
  Tx._parse = function (hex, tx = {}) {
    /* jshint maxstatements: 200 */
    tx.hasInputScript = false;
    tx.totalSatoshis = 0;

    tx.offset = 0;

    tx.versionHex = hex.substr(tx.offset, 4);
    let versionHexRev = Tx.utils.reverseHex(tx.versionHex);
    tx.version = parseInt(versionHexRev, 16);
    tx.offset += 4;

    tx.typeHex = hex.substr(tx.offset, 4);
    let typeHexRev = Tx.utils.reverseHex(tx.typeHex);
    tx.type = parseInt(typeHexRev, 16);
    tx.offset += 4;

    let [numInputs, numInputsSize] = TxUtils._parseVarIntHex(hex, tx.offset);
    tx.offset += numInputsSize;
    tx.numInputsHex = numInputs.toString(16);
    tx.numInputsHex = tx.numInputsHex.padStart(2, "0");
    tx.numInputs = numInputs;

    tx.inputs = [];
    for (let i = 0; i < numInputs; i += 1) {
      let input = {};
      tx.inputs.push(input);

      input.txidHex = hex.substr(tx.offset, 64);
      input.txid = Tx.utils.reverseHex(input.txidHex);
      input.txId = input.txid; // TODO
      tx.offset += 64;

      input.outputIndexHex = hex.substr(tx.offset, 8);
      let outputIndexHexLe = Tx.utils.reverseHex(input.outputIndexHex);
      input.outputIndex = parseInt(outputIndexHexLe, 16);
      tx.offset += 8;

      // TODO VarInt
      input.scriptSizeHex = hex.substr(tx.offset, 2);
      input.scriptSize = parseInt(input.scriptSizeHex, 16);
      tx.offset += 2;

      input.script = "";

      if (0 === input.scriptSize) {
        // "Raw" Tx
      } else if (25 === input.scriptSize) {
        // "SigHash" Tx
        tx.hasInputScript = true;

        input.script = hex.substr(tx.offset, 2 * input.scriptSize);
        tx.offset += 2 * input.scriptSize;
      } else if (input.scriptSize >= 106 && input.scriptSize <= 109) {
        let sig = {
          sigHashTypeHex: "",
          sigHashType: 0,
          publicKeySizeHex: "",
          publicKeySize: 0,
          publicKey: "",
          signature: "",
          sigSizeHex: "",
          sigSize: 0,
          asn1Seq: "",
          asn1Bytes: "",
          rTypeHex: "",
          rSizeHex: "",
          rSize: 0,
          rValue: "",
          sTypeHex: "",
          sSizeHex: "",
          sSize: 0,
          sValue: "",
        };

        // "Signed" Tx
        tx.hasInputScript = true;

        sig.signature = hex.substr(tx.offset, 2 * input.scriptSize);
        tx.offset += 2 * input.scriptSize;

        sig.sigSizeHex = sig.signature.substr(0, 2);
        sig.sigSize = parseInt(sig.sigSizeHex, 16);
        sig.asn1Seq = sig.signature.substr(2, 2);
        sig.asn1Bytes = sig.signature.substr(4, 2);

        sig.rTypeHex = sig.signature.substr(6, 2);
        sig.rSizeHex = sig.signature.substr(8, 2);
        sig.rSize = parseInt(sig.rSizeHex, 16);

        let sIndex = 10;
        sig.rValue = sig.signature
          .substr(sIndex, 2 * sig.rSize)
          .padStart(66, " ");
        sIndex += 2 * sig.rSize;
        sig.sTypeHex = sig.signature.substr(sIndex, 2);
        sIndex += 2;
        sig.sSizeHex = sig.signature.substr(sIndex, 2);
        sig.sSize = parseInt(sig.sSizeHex, 16);
        sIndex += 2;
        sig.sValue = sig.signature
          .substr(sIndex, 2 * sig.sSize)
          .padStart(66, " ");
        sIndex += 2 * sig.sSize;

        sig.sigHashTypeHex = sig.signature.substr(sIndex, 2);
        sig.sigHashType = parseInt(sig.sigHashTypeHex, 16);
        sIndex += 2;

        sig.publicKeySizeHex = sig.signature.substr(sIndex, 2);
        sig.publicKeySize = parseInt(sig.publicKeySizeHex, 16);
        sIndex += 2;

        sig.publicKey = sig.signature.substr(sIndex, 2 * sig.publicKeySize);
        sIndex += 2 * sig.publicKeySize;

        Object.assign(input, sig);
        let rest = sig.signature.substr(sIndex);
        if (rest) {
          Object.assign(input, { extra: rest });
        }
      } else {
        throw new Error(
          `expected a "script" size of 0 (raw), 25 (hashable), or 106-109 (signed), but got '${input.scriptSize}'`,
        );
      }

      input.sequence = hex.substr(tx.offset, 8);
      tx.offset += 8;
    }

    let [numOutputs, numOutputsSize] = TxUtils._parseVarIntHex(hex, tx.offset);
    tx.offset += numOutputsSize;
    tx.numOutputsHex = numOutputs.toString(16);
    tx.numOutputsHex = tx.numOutputsHex.padStart(2, "0");
    tx.numOutputs = numOutputs;

    tx.outputs = [];
    for (let i = 0; i < tx.numOutputs; i += 1) {
      let output = {};
      tx.outputs.push(output);

      output.satoshisHex = hex.substr(tx.offset, 16);
      tx.offset += 16;
      let satsHex = Tx.utils.reverseHex(output.satoshisHex);
      output.satoshis = parseInt(satsHex, 16);
      tx.totalSatoshis += output.satoshis;

      // TODO VarInt
      output.lockScriptSizeHex = hex.substr(tx.offset, 2);
      output.lockScriptSize = parseInt(output.lockScriptSizeHex, 16);
      tx.offset += 2;

      output.script = hex.substr(tx.offset, 2 * output.lockScriptSize);
      tx.offset += 2 * output.lockScriptSize;

      output.scriptTypeHex = output.script.slice(0, 2);
      output.scriptType = parseInt(output.scriptTypeHex, 16);
      output.pubKeyHash = "";
      /**@type {String?}*/
      output.memo = null;
      /**@type {String?}*/
      output.message = null;
      if (output.scriptTypeHex === OP_RETURN) {
        output.memo = output.script.slice(4, 2 * output.lockScriptSize);
        output.message = "";
        let decoder = new TextDecoder();
        let bytes = Tx.utils.hexToBytes(output.memo);
        try {
          output.message = decoder.decode(bytes);
        } catch (e) {
          output.message = "<non-UTF-8 bytes>";
        }
      } else {
        // TODO check the script type
        output.pubKeyHash = output.script.slice(6, -4);
      }
    }

    tx.locktimeHex = hex.substr(tx.offset, 8);
    let locktimeHexRev = Tx.utils.reverseHex(tx.locktimeHex);
    tx.locktime = parseInt(locktimeHexRev, 16);
    tx.offset += 8;

    tx.extraPayloadSizeHex = "";
    /** @type {Uint8?} */
    tx.extraPayloadSize = null;
    tx.extraPayloadHex = "";
    if (tx.type > 0) {
      // TODO varint
      tx.extraPayloadSizeHex = hex.substr(tx.offset, 2);
      tx.extraPayloadSize = parseInt(tx.extraPayloadSizeHex, 16);
      tx.offset += 2;

      tx.extraPayloadHex = hex.substr(tx.offset, 2 * tx.extraPayloadSize);
      tx.offset += 2 * tx.extraPayloadSize;
    }

    tx.sigHashTypeHex = hex.substr(tx.offset);
    if (tx.sigHashTypeHex) {
      let firstLEIntByte = tx.sigHashTypeHex.slice(0, 2);
      tx.sigHashType = parseInt(firstLEIntByte);
      let fullLEIntHexSize = 8;
      hex = hex.slice(0, -fullLEIntHexSize); // but the size is actually 4 bytes
    }

    tx.size = hex.length / 2;
    tx.cost = tx.size + tx.totalSatoshis;

    tx.transaction = hex;
    return tx;
  };

  /**
   * @param {String} hex
   * @param {Number} offset
   */
  TxUtils._parseVarIntHex = function (hex, offset) {
    let size = 2;
    let numHex = hex.substr(offset, 2);
    let num = parseInt(numHex, 16);
    offset += size;

    if (num > 252) {
      if (253 === num) {
        numHex = hex.substr(offset, 4);
      } else if (254 === num) {
        numHex = hex.substr(offset, 8);
      } else if (255 === num) {
        numHex = hex.substr(offset, 16);
      }
      num = parseInt(numHex, 16);
      size += numHex.length;
    }

    return [num, size];
  };

  // TODO Tx.utils.sha256sha256(txHex, inputs, sigHashType)
  // TODO Tx.signInput(txHash, input, sigHashType)
  // TODO Tx.utils.isTxInputSigned(txHash, input)

  /**
   * @param {String} hex
   * @param {String} propName - internal use
   */
  function assertHex(hex, propName) {
    for (let i = 0; i < hex.length; i += 1) {
      let lowerChar = hex[i].charCodeAt(0) | 0x20;

      let isNum = lowerChar >= CH_0 && lowerChar <= CH_9;
      let isAlpha = lowerChar >= CH_A && lowerChar <= CH_F;

      let isHex = isNum || isAlpha;
      if (!isHex) {
        throw new Error(
          `expected each character of utxo property '${propName}' to be hex encoded but saw '${lowerChar}' in '${hex}'`,
        );
      }
    }
  }

  /** @type {TxRPC} */
  TxUtils.rpc = async function rpc(basicAuthUrl, method, ...params) {
    let url = new URL(basicAuthUrl);
    let baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
    let basicAuth = btoa(`${url.username}:${url.password}`);

    // typically http://localhost:19998/
    let payload = JSON.stringify({ method, params });
    let resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: payload,
    });

    let data = await resp.json();
    if (data.error) {
      let err = new Error(data.error.message);
      Object.assign(err, data.error);
      throw err;
    }

    return data.result;
  };

  /**
   * @param {String} hex
   */
  TxUtils.hexToBytes = function (hex) {
    let bufLen = hex.length / 2;
    let u8 = new Uint8Array(bufLen);

    let i = 0;
    let index = 0;
    let lastIndex = hex.length - 2;
    for (;;) {
      if (i > lastIndex) {
        break;
      }

      let h = hex.slice(i, i + 2);
      let b = parseInt(h, 16);
      u8[index] = b;

      i += 2;
      index += 1;
    }

    return u8;
  };

  /**
   * @param {String} hex
   */
  TxUtils.reverseHex = function (hex) {
    let hexLE = [];
    for (let i = hex.length - 2; i >= 0; i -= 2) {
      hexLE.push(hex.slice(i, i + 2));
    }

    // ex: 0x03000000
    return hexLE.join("");
  };

  /** @type TxToVarInt */
  TxUtils.toVarInt = function (n) {
    //@ts-ignore - see https://github.com/microsoft/TypeScript/issues/57953
    if (n < 253) {
      return n.toString(16).padStart(2, "0");
    }
    if (!n) {
      throw new Error(`'${n}' is not a number`);
    }

    //@ts-ignore
    if (n <= MAX_U16) {
      return "fd" + TxUtils.toUint32LE(n).slice(0, 4);
    }

    //@ts-ignore
    if (n <= MAX_U32) {
      return "fe" + TxUtils.toUint32LE(n);
    }

    //@ts-ignore
    if (n <= MAX_U53) {
      return "ff" + TxUtils.toUint64LE(n);
    }

    if ("bigint" !== typeof n) {
      let err = new Error(E_LITTLE_INT);
      Object.assign(err, { code: "E_LITTLE_INT" });
      throw err;
    }

    if (n <= MAX_U64) {
      return "ff" + TxUtils.toUint64LE(n);
    }

    let err = new Error(E_TOO_BIG_INT);
    Object.assign(err, { code: "E_TOO_BIG_INT" });
    throw err;
  };

  /**
   * Just assumes that all target CPUs are Little-Endian,
   * which is true in practice, and much simpler.
   * @param {BigInt|Number} n - 16-bit positive int to encode
   */
  TxUtils._toUint16LE = function (n) {
    let hexLE = TxUtils.toUint32LE(n);
    // ex: 03000800 => 0300
    hexLE = hexLE.slice(0, 4);
    return hexLE;
  };

  /**
   * Just assumes that all target CPUs are Little-Endian,
   * which is true in practice, and much simpler.
   * @param {BigInt|Number} n - 32-bit positive int to encode
   */
  TxUtils.toUint32LE = function (n) {
    // make sure n is uint32/int53, not int32
    //n = n >>> 0;

    // 0x00000003
    let hex = n.toString(16).padStart(8, "0");

    let hexLE = Tx.utils.reverseHex(hex);
    return hexLE;
  };
  //@ts-ignore
  TxUtils._toUint32LE = function (n) {
    console.warn(
      "warn: use public TxUtils.toUint32LE() instead of internal TxUtils._toUint32LE()",
    );
    return TxUtils.toUint32LE(n);
  };

  /**
   * This can handle Big-Endian CPUs, which don't exist,
   * and looks too complicated.
   * @param {BigInt|Number} n - 64-bit BigInt or <= 53-bit Number to encode
   * @returns {String} - 8 Little-Endian bytes
   */
  TxUtils.toUint64LE = function (n) {
    let bn;
    if ("bigint" === typeof n) {
      bn = n;
    } else {
      //@ts-ignore
      bn = BigInt(n);
    }

    let u8 = new Uint8Array(8);
    let byteOffset = 0;
    let dv = new DataView(u8.buffer);
    let endianness = true; /* littleEndian */
    dv.setBigUint64(byteOffset, bn, endianness);

    /** @type {Array<String>} */
    let hexArr = [];
    u8.forEach(function (i) {
      let h = i.toString(16).padStart(2, "0");
      hexArr.push(h);
    });
    let hex = hexArr.join("");

    return hex;
  };
  //@ts-ignore
  TxUtils._toUint64LE = function (n) {
    console.warn(
      "warn: use public TxUtils.toUint64LE() instead of internal TxUtils._toUint64LE()",
    );
    return TxUtils.toUint64LE(n);
  };

  /** @type TxToVarIntSize */
  TxUtils.toVarIntSize = function (n) {
    //@ts-ignore - see https://github.com/microsoft/TypeScript/issues/57953
    if (n < 253) {
      return 1;
    }

    //@ts-ignore
    if (n <= MAX_U16) {
      return 3;
    }

    //@ts-ignore
    if (n <= MAX_U32) {
      return 5;
    }

    //@ts-ignore
    if (n <= MAX_U64) {
      return 9;
    }

    let err = new Error(E_TOO_BIG_INT);
    Object.assign(err, { code: "E_TOO_BIG_INT" });
    throw err;
  };

  /** @type {TxBytesToHex} */
  TxUtils.bytesToHex = function (u8) {
    /** @type {Array<String>} */
    let hex = [];

    u8.forEach(function (b) {
      let h = b.toString(16).padStart(2, "0");
      hex.push(h);
    });

    return hex.join("");
  };

  /** @type {TxStringToHex} */
  TxUtils.strToHex = function (str) {
    let encoder = new TextEncoder();
    let bytes = encoder.encode(str);
    let hex = Tx.utils.bytesToHex(bytes);

    return hex;
  };

  Tx.utils = TxUtils;

  //@ts-ignore
  window.DashTx = Tx;
})(globalThis.window || {}, DashTx);
if ("object" === typeof module) {
  module.exports = DashTx;
}

// Type Aliases

/** @typedef {Number} Float64 */
/** @typedef {Number} Uint8 */
/** @typedef {Number} Uint16 */
/** @typedef {Number} Uint32 */
/** @typedef {Number} Uint53 */
/** @typedef {String} Hex */
/** @typedef {Uint8Array} TxPrivateKey */
/** @typedef {Uint8Array} TxPublicKey */
/** @typedef {Uint8Array} TxSignature */

// Type Defs

/**
 * @typedef CoreUtxo
 * @property {String} [txId] - deprecated
 * @property {String} txid
 * @property {Number} outputIndex
 * @property {String} address
 * @property {String} script
 * @property {Number} satoshis
 */

/**
 * @typedef TxKeyUtils
 * @prop {TxGetPrivateKey} getPrivateKey
 * @prop {TxGetPublicKey} [getPublicKey] - efficiently get public key bytes
 * @prop {TxToPublicKey} toPublicKey - convert private bytes to pub bytes
 * @prop {TxSign} sign
 */
/** @typedef {Required<TxKeyUtils>} TxDeps */

/**
 * @typedef TxFees
 * @prop {Uint53} max
 * @prop {Uint53} mid
 * @prop {Uint53} min
 */

/**
 * @typedef TxInfo
 * @prop {Uint16} [version]
 * @prop {Uint16} [type]
 * @prop {Array<TxInputForSig>} inputs
 * @prop {Array<TxOutput>} outputs
 * @prop {Uint32} [locktime] - 0 by default
 * @prop {Hex} [extraPayload] - extra payload bytes
 * @prop {Hex} [transaction] - signed transaction hex
 * @prop {Boolean} [_debug] - bespoke debug output
 */

/** @typedef {TxInfo & TxDraftPartial} TxDraft */
/**
 * @typedef TxDraftPartial
 * @prop {TxOutput?} change
 * @prop {Uint53} feeTarget
 * @prop {Boolean} fullTransfer
 */

/**
 * @typedef TxInfoSigned
 * @prop {Uint16} version
 * @prop {Uint16} type
 * @prop {Array<TxInputSigned>} inputs
 * @prop {Array<TxOutput>} outputs
 * @prop {Uint32} locktime - 0 by default
 * @prop {Hex} extraPayload - extra payload bytes
 * @prop {String} transaction - signed transaction hex
 * @prop {Boolean} [_debug] - bespoke debug output
 */

/** @typedef {TxInfoSigned & TxSummaryPartial} TxSummary */
/**
 * @typedef TxSummaryPartial
 * @prop {Uint53} total - sum of all inputs
 * @prop {Uint53} sent - sum of all outputs
 * @prop {Uint53} fee - actual fee
 * @prop {Array<TxOutput>} outputs
 * @prop {Array<TxInput>} inputs
 * @prop {TxOutput} output - alias of 'recipient' for backwards-compat
 * @prop {TxOutput} recipient - output to recipient
 * @prop {TxOutput} change - sent back to self
 */

/**
 * @typedef TxInput
 * @prop {String} [address] - BaseCheck58-encoded pubKeyHash
 * @prop {String} [txId] - deprecated
 * @prop {String} txid - hex (not pre-reversed)
 * @prop {Uint32} outputIndex - index in previous tx's output (vout index)
 * @prop {String} signature - hex-encoded ASN.1 (DER) signature (starts with 0x30440220 or  0x30440221)
 * @prop {String} [script] - the previous lock script (default: derived from public key as p2pkh)
 * @prop {String} publicKey - hex-encoded public key (typically starts with a 0x02 or 0x03 prefix)
 * @prop {String} [pubKeyHash] - the 20-byte pubKeyHash (address without magic byte or checksum)
 * @prop {Uint32} sigHashType - typically 0x81 (SIGHASH_ALL|SIGHASH_ANYONECANPAY)
 */

/**
 * @typedef TxInputForSig
 * @prop {String} [address] - BaseCheck58-encoded pubKeyHash
 * @prop {String} [txId] - (deprecated) see .txid
 * @prop {String} txid - hex (not pre-reversed)
 * @prop {Uint32} outputIndex - index in previous tx's output (vout index)
 * @prop {Uint53} [satoshis] - (included for convenience as type hack)
 * @prop {String} [signature] - (included as type hack)
 * @prop {String} [script] - the previous lock script (default: derived from public key as p2pkh)
 * @prop {String} [publicKey] - hex-encoded public key (typically starts with a 0x02 or 0x03 prefix)
 * @prop {String} [pubKeyHash] - the 20-byte pubKeyHash (address without magic byte or checksum)
 * @prop {Uint32} sigHashType - typically 0x81 (SIGHASH_ALL|SIGHASH_ANYONECANPAY)
 */

/**
 * @typedef TxInputRaw
 * @prop {String} [address] - BaseCheck58-encoded pubKeyHash
 * @prop {Uint53} [satoshis] - for convenience
 * @prop {String} [txId] - deprecated
 * @prop {String} txid - hex (not pre-reversed)
 * @prop {Uint32} outputIndex - index in previous tx's output (vout index)
 */

/**
 * @typedef TxInputUnspent
 * @prop {String} [address] - BaseCheck58-encoded pubKeyHash
 * @prop {Uint53} satoshis
 * @prop {String} [txId] - deprecated
 * @prop {String} txid - hex (not pre-reversed)
 * @prop {Uint32} outputIndex - index in previous tx's output (vout index)
 */

/**
 * @typedef TxInputSortable
 * @prop {String} [txId] - deprecated
 * @prop {String} txid
 * @prop {Uint32} outputIndex
 */

/**
 * @typedef TxHasSats
 * @prop {Uint53} satoshis
 */

/**
 * @typedef {Pick<TxInput, "txId"|"txid"|"outputIndex"|"signature"|"publicKey"|"sigHashType">} TxInputSigned
 */

/**
 * @typedef TxOutput
 * @prop {String?} [memo] - hex bytes of a memo (incompatible with pubKeyHash / address)
 * @prop {String?} [message] - memo, but as a UTF-8 string
 * @prop {String} [address] - payAddr as Base58Check (human-friendly)
 * @prop {String} [pubKeyHash] - payAddr's raw hex value (decoded, not Base58Check)
 * @prop {Uint53} satoshis - the number of smallest units of the currency
 */

/**
 * @typedef TxOutputSortable
 * @prop {Uint53} satoshis
 * @prop {String} [script] - hex bytes in wire order
 * @prop {String?} [memo] - 0x6a, hex bytes
 * @prop {String} [pubKeyHash] - 0x76, 0xa9, hex bytes
 * @prop {String} [address] - 0x76, 0xa9, base58check bytes
 */

// Func Defs

/**
 * @callback TxAddrToPubKeyHash
 * @param {String} addr
 * @returns {String} - pkh hex
 */

/**
 * Calculate the min, mid, and max sizes, which are 25%, 75%, and 100% likely
 * to match the signed byte size (which varies randomly on each signing due to
 * padding bytes). If in doubt, start with the mid as the fee and if the signed
 * tx is larger, increment by one and repeat until the fee is greater than the
 * size.
 * @callback TxAppraise
 * @param {TxInfo} txInfo
 * @returns {TxFees}
 */

/**
 * @callback TxAppraiseCounts
 * @param {Uint32} numInputs
 * @param {Uint32} numOutputs
 * @param {Uint32} [extraSize] - for memos
 * @returns {TxFees}
 */

/**
 * @callback TxAppraiseMemos
 * @param {Array<TxOutput>} outputs
 * @returns {Uint32}
 */

/**
 * Create a donation output with a nice message.
 * @callback TxCreateDonationOutput
 * @param {Object} [opts]
 * @param {String?} [opts.message] - UTF-8 Memo String
 */

/**
 * @callback TxCreateForSig
 * @param {TxInfo} txInfo
 * @param {Uint32} inputIndex - create hashable tx for this input
 * @param {Uint32} sigHashType - 0x01 for ALL, or 0x81 for ALL + ANYONECANPAY
 */

/**
 * @callback TxCreateInputForSig
 * @param {TxInputForSig} input
 * @param {Uint32} inputIndex - create hashable tx for this input
 */

/**
 * @callback TxCreatePkhScript
 * @param {Hex} pubKeyHash
 * @returns {Hex} - ${OP_DUP}${OP_HASH160}${PKH_SIZE}${pubKeyHash}${OP_EQUALVERIFY}${OP_CHECKSIG}
 */

/**
 * @callback TxCreateRaw
 * @param {Object} opts
 * @param {Uint16} [opts.version]
 * @param {Uint16} [opts.type]
 * @param {Array<TxInputRaw>} opts.inputs
 * @param {Array<TxOutput>} opts.outputs
 * @param {Uint32} [opts.locktime]
 * @param {Hex} [opts.extraPayload]
 * @param {Boolean} [opts._debug] - bespoke debug output
 */

/**
 * @callback TxCreateInputRaw
 * @param {TxInputRaw} input
 * @param {Uint32} i
 */

/**
 * @callback TxCreateSigned
 * @param {Object} opts
 * @param {Uint16} [opts.version]
 * @param {Uint16} [opts.type]
 * @param {Array<TxInputSigned>} opts.inputs
 * @param {Array<TxOutput>} opts.outputs
 * @param {Uint32} [opts.locktime]
 * @param {Hex} [opts.extraPayload]
 * @param {Boolean} [opts._debug] - bespoke debug output
 * xparam {String} [opts.sigHashType] - hex, typically 01 (ALL)
 */

/**
 * @callback TxGetId
 * @param {String} txHex - signable tx hex (like raw tx, but with (sig)script)
 * @returns {Promise<String>} - the reversed double-sha256sum of a ready-to-broadcast tx hex
 */

/**
 * @callback TxGetPrivateKey
 * @param {TxInputForSig} txInput
 * @param {Uint53} [i]
 * @param {Array<TxInputRaw|TxInputForSig>} [txInputs]
 * @returns {Promise<TxPrivateKey?>} - private key Uint8Array
 */

/**
 * @callback TxGetPublicKey
 * @param {TxInputForSig} txInput
 * @param {Uint53} [i]
 * @param {Array<TxInputRaw|TxInputForSig>} [txInputs]
 * @returns {Promise<TxPublicKey?>} - public key Uint8Array
 */

/**
 * @callback TxHashAndSignAll
 * @param {TxInfo} txInfo
 * @param {Uint32} [sigHashType]
 */

/**
 * @callback TxHashAndSignInput
 * @param {Uint8Array} privBytes
 * @param {TxInfo} txInfo
 * @param {Uint32} i
 * @param {Uint32} [sigHashType]
 */

/**
 * @callback TxDoubleSha256
 * @param {Uint8Array} txBytes - signable tx bytes (like raw tx, but with (lock)script)
 * @returns {Promise<Uint8Array>}
 */

/**
 * @callback TxHexToBytes
 * @param {String} hex
 * @returns {Uint8Array}
 */

/**
 * @callback TxCreateLegacyTx
 * @param {Array<TxInputUnspent>} coins
 * @param {Array<TxOutput>} outputs
 * @param {TxOutput} changeOutput - object with 0 satoshis and change address, pubKeyHash, or script
 * @returns {Promise<TxInfo>}
 */

/**
 * @callback TxParseRequest
 * @param {Hex} hex - a tx request with unsigned or partially signed inputs
 * @returns {TxInfo}
 */

/**
 * @callback TxParseSigHash
 * @param {Hex} hex - a ready-to-sign tx with input script and trailing sighash byte
 * @returns {TxInfo}
 */

/**
 * @callback TxParseSigned
 * @param {Hex} hex - a fully signed, ready-to-broadcast transaction
 * @returns {TxInfo}
 */

/**
 * @callback TxParseUnknown
 * @param {Hex} hex - a tx request, hashable tx, or signed tx
 * @returns {TxInfo}
 */

/**
 * @callback TxReverseHex
 * @param {String} hex
 * @returns {String} - hex pairs in reverse order
 */

/**
 * @callback TxSelectSigHashInputs
 * @param {TxInfo} txInfo
 * @param {Uint32} i - index of input to be signed
 * @param {Uint8} sighHashType
 */

/**
 * @callback TxSelectSigHashOutputs
 * @param {TxInfo} txInfo
 * @param {Uint32} i - index of input to be signed
 * @param {Uint8} sighHashType
 */

/**
 * @callback TxSerialize
 * @param {Object} txInfo
 * @param {Uint16} [txInfo.version]
 * @param {Uint16} [txInfo.type]
 * @param {Array<TxInputRaw|TxInputForSig|TxInputSigned>} txInfo.inputs
 * @param {Array<TxOutput>} txInfo.outputs
 * @param {Uint32} [txInfo.locktime]
 * @param {Hex?} [txInfo.extraPayload] - extra payload
 * @param {Boolean} [txInfo._debug] - bespoke debug output
 * @param {Uint32} [sigHashType]
 */

/**
 * @callback TxSerializeForSig
 * @param {Object} txInfo
 * @param {Uint16} [txInfo.version]
 * @param {Uint16} [txInfo.type]
 * @param {Array<TxInputRaw|TxInputForSig>} txInfo.inputs
 * @param {Uint32} [txInfo.locktime]
 * @param {Array<TxOutput>} txInfo.outputs
 * @param {Hex?} [txInfo.extraPayload] - extra payload
 * @param {Boolean} [txInfo._debug] - bespoke debug output
 * @param {Uint32} sigHashType
 */

/**
 * @callback TxSerializeInputs
 * @param {Array<TxInput|TxInputRaw|TxInputForSig|TxInputSigned>} txInputs
 * @param {Object} [_opts]
 * @param {Array<String>} [_opts._tx]
 * @param {String} [_opts._sep]
 */

/**
 * @callback TxSerializeInput
 * @param {TxInput|TxInputRaw|TxInputForSig|TxInputSigned} txInput
 * @param {Uint32} i
 * @param {Object} [_opts]
 * @param {Array<String>} [_opts._tx]
 * @param {String} [_opts._sep]
 */

/**
 * @callback TxSerializeOutputs
 * @param {Array<TxOutput>} txOutputs
 * @param {Object} [_opts]
 * @param {Array<String>} [_opts._tx]
 * @param {String} [_opts._sep]
 */

/**
 * @callback TxSerializeOutput
 * @param {TxOutput} txOutput
 * @param {Uint32} i
 * @param {Object} [_opts]
 * @param {Array<String>} [_opts._tx]
 * @param {String} [_opts._sep]
 */

/**
 * @callback TxSign
 * @param {TxPrivateKey} privateKey
 * @param {Uint8Array} txHashBytes
 * @returns {Promise<TxSignature>} - buf
 */

/**
 * @callback TxSortBySats
 * @param {TxHasSats} a
 * @param {TxHasSats} b
 * @returns {Uint8}
 */

/**
 * @callback TxSortInputs
 * @param {TxInputSortable} a
 * @param {TxInputSortable} b
 * @returns {Uint8}
 */

/**
 * @callback TxSortOutputs
 * @param {TxOutputSortable} a
 * @param {TxOutputSortable} b
 * @returns {Uint8}
 */

/**
 * @callback TxSum
 * @param {Array<TxHasSats>} coins
 * @returns {Uint53}
 */

/**
 * @callback TxToDash
 * @param {Uint53} satoshis
 * @returns {Float64} - float
 */

/**
 * @callback TxToSats
 * @param {Float64} dash - as float (decimal) DASH, not uint satoshis
 * @returns {Uint53} - duffs
 */

/**
 * @callback TxToPublicKey
 * @param {TxPrivateKey} privateKey - buf
 * @returns {Promise<TxPublicKey>} - public key buf
 */

/**
 * @callback TxRPC
 * @param {String} basicAuthUrl - ex: https://api:token@trpc.digitalcash.dev/
 *                                    http://user:pass@localhost:19998/
 * @param {String} method - the rpc, such as 'getblockchaininfo',
 *                          'getaddressdeltas', or 'help'
 * @param {...any} params - the arguments for the specific rpc
 *                          ex: rpc(url, 'help', 'getaddressdeltas')
 */

/**
 * Caution: JS can't handle 64-bit ints
 * @callback TxToVarInt
 * @param {BigInt|Uint53} n - 64-bit BigInt or < 53-bit Number
 * @returns {String} - hex
 */

/**
 * @callback TxToVarIntSize
 * @param {BigInt|Uint53} n
 * @returns {Uint8} - byte size of n
 */

/**
 * @callback TxBytesToHex
 * @param {Uint8Array} buf
 * @returns {String}
 */

/**
 * @callback TxStringToHex
 * @param {String} utf8
 * @returns {String} - encoded bytes as hex
 */

/**
 * @callback TxToUint32LE
 * @param {Uint32} n
 * @returns {Hex}
 */

/**
 * @callback TxToUint64LE
 * @param {Uint32} n
 * @returns {Hex}
 */
