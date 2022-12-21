# DashTx.js

Create a transaction for the Dash network.

## Fixtures

<https://insight.dash.org/tx/a64557541b20a2d42021924231eb75cf2a3fd1ebf9888bfcc5d181b0b637a026>

```txt
WIF:
XJREPzkMSHobz6kpxKd7reMiWr3YoyTdaj3sJXLGCmiDHaL7vmaQ

PayAddr (WIF):
Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr

PayAddr (Recipient):
XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj

Transaction Hex:
0300000001d87e2a413f84f7c2cfe657e1a1d129f5efa468f792036fafd5a5d2d98084d159000000006b483045022100ecdf2a3e8253c5fc3730e77843f20beae1a597307fd4dc9cb80cb472b8db7e2002203c635663b24504504b92dc8abaf8c00591006c8ad49a49a924ac9fe25d97106e012103755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cbffffffff01b3240000000000001976a9141e0a6ef6085bb8af443a9e7f8941e61deb09fb5488ac00000000

0300000001d87e2a413f84f7c2cfe657e1a1d129f5efa468f792036fafd5a5d2d98084d159000000006b
(script)
483045022100ecdf2a3e8253c5fc3730e77843f20beae1a597307fd4dc9cb80cb472b8db7e2002203c635663b24504504b92dc8abaf8c00591006c8ad49a49a924ac9fe25d97106e012103755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb
ffffffff01b3240000000000001976a9141e0a6ef6085bb8af443a9e7f8941e61deb09fb5488ac00000000

(inspect at <https://live.blockcypher.com/dash/decodetx/>)

Coin inputs (utxos):
                         0.00009597  Xj4Ey1oer:59d184:0  wifs
                       -------------
                         0.00009597  (total)

Paid to Recipient:       0.00009395  (XdRgbwH1L)
Network Fee:             0.00000202
Change:                  0.00000000
```

```json
{
    "addresses": [
        "Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr",
        "XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj"
    ],
    "block_height": -1,
    "block_index": -1,
    "confirmations": 0,
    "double_spend": false,
    "fees": 202,
    "hash": "a64557541b20a2d42021924231eb75cf2a3fd1ebf9888bfcc5d181b0b637a026",
    "inputs": [
        {
            "addresses": ["Xj4Ey1oerk5KUKM71UQCTUBbmfyQuoUHDr"],
            "age": 1791940,
            "output_index": 0,
            "output_value": 9597,
            "prev_hash": "59d18480d9d2a5d5af6f0392f768a4eff529d1a1e157e6cfc2f7843f412a7ed8",
            "script": "483045022100ecdf2a3e8253c5fc3730e77843f20beae1a597307fd4dc9cb80cb472b8db7e2002203c635663b24504504b92dc8abaf8c00591006c8ad49a49a924ac9fe25d97106e012103755be68d084e7ead4d83e23fb37c3076b16ead432de1b0bdf249290400f263cb",
            "script_type": "pay-to-pubkey-hash",
            "sequence": 4294967295
        }
    ],
    "outputs": [
        {
            "addresses": ["XdRgbwH1LEfFQUVY2DnmsVxfo33CRDhydj"],
            "script": "76a9141e0a6ef6085bb8af443a9e7f8941e61deb09fb5488ac",
            "script_type": "pay-to-pubkey-hash",
            "value": 9395
        }
    ],
    "preference": "low",
    "received": "2022-12-21T17:30:25.487441977Z",
    "relayed_by": "3.84.9.127",
    "size": 192,
    "total": 9395,
    "ver": 3,
    "vin_sz": 1,
    "vout_sz": 1
}
```
