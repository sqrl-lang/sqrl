/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export function bufferToHexEncodedAscii(buffer: Buffer): string {
  let output = "";
  const min = " ".charCodeAt(0);
  const max = "~".charCodeAt(0);
  const escapeCharCode = "\"'\\".split("").map((s) => s.charCodeAt(0));

  buffer.forEach((chr) => {
    if (chr < min || chr > max || escapeCharCode.includes(chr)) {
      output += "\\x" + (chr < 16 ? "0" : "") + chr.toString(16);
    } else {
      output += String.fromCharCode(chr);
    }
  });
  return output;
}
