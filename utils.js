// we probably don't need this...

  /**
   * @param {String} hex
   */
  Tx.utils.hexToU8Reversed = function (hex) {
    let u8 = new Uint8Array(hex.length / 2);

    let i = 0;
    let index = u8.length - 1;
    for (;;) {
      if (i >= hex.length - 2) {
        break;
      }

      let h = hex.slice(i, i + 2);
      let b = parseInt(h, 16);
      u8[index] = b;

      i += 2;
      index -= 1;
    }

    return u8;
  };
