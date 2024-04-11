// Based on discoveries from
// https://github.com/jojobyte/browser-import-rabbit-hole

import './dashtx.js'
import * as DashTxTypes from './dashtx.js'

/** @type {DashTxTypes} */
let DashTx = window?.DashTx || globalThis?.DashTx

export default DashTx
