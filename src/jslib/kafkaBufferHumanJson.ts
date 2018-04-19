/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import bignum = require("bignum");
import isAscii from "./isAscii";
import mapObject from "./mapObject";

function friendlyBuffer(buf) {
  try {
    const text = buf.toString("utf-8");
    if (isAscii(text)) {
      return text;
    }
  } catch (err) {
    /* fall through */
  }
  return `0x${buf.toString("hex")}`;
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

export function kafkaBufferHumanJson(topic: string, msg: Buffer): any {
  // @TODO: Could do decoding of avro/protobuf here

  // The message is /probably/ json.
  // Try convert it, and otherwise just return the hex
  try {
    return JSON.parse(msg.toString("utf-8"));
  } catch (err) {
    return deepFriendlyMap(msg);
  }
}
