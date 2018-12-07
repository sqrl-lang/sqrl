/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import bignum = require("bignum");
import mapObject from "./mapObject";
import { bufferToHexEncodedAscii } from "./bufferToHexEncodedAscii";

function friendlyBuffer(buf) {
  try {
    const text = buf.toString("utf-8");
    return bufferToHexEncodedAscii(text);
  } catch (err) {
    return `0x${buf.toString("hex")}`;
  }
}

function deepFriendlyMap(obj) {
  if (obj instanceof bignum) {
    return obj.toString();
  } else if (obj instanceof Buffer) {
    return friendlyBuffer(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(deepFriendlyMap);
  } else if (typeof obj === "object" && obj !== null) {
    return mapObject(obj, deepFriendlyMap);
  } else {
    return obj;
  }
}

/**
 * Convert a given buffer into something that is human readable.
 * This process is not necessarily reversible and is meant for convenience
 * only.
 */
export function kafkaBufferHumanJson(topic: string, msg: Buffer): any {
  try {
    return JSON.parse(msg.toString("utf-8"));
  } catch (err) {
    return deepFriendlyMap(msg);
  }
}
