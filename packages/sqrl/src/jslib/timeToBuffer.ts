/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { toBufferBE } from "bigint-buffer";

export function timeToBuffer(timeMs: number) {
  return toBufferBE(BigInt(timeMs), 8);
}
