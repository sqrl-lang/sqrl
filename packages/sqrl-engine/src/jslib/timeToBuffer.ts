/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import bignum = require("bignum");

export function timeToBuffer(timeMs: number) {
  return new bignum(timeMs).toBuffer({
    endian: "big",
    size: 8
  });
}
