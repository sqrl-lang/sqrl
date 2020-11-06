/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import stringify = require("fast-stable-stringify");
import * as murmurJs from "murmurhash3.js";

export function murmurhashJsonHexSync(data: any): string {
  const inputBuffer = Buffer.from(stringify(data), "utf8");
  return murmurhashHexSync(inputBuffer);
}

export async function murmurhashJsonHex(data: any): Promise<string> {
  return murmurhashJsonHexSync(data);
}
export async function murmurhashJsonBuffer(data: any): Promise<Buffer> {
  const inputBuffer = Buffer.from(stringify(data), "utf8");
  return murmurhashSync(inputBuffer);
}
export async function murmurhashJson(data: any): Promise<Buffer> {
  return murmurhashJsonBuffer(data);
}

export function murmurhashHexSync(data: Buffer): string {
  return murmurhashSync(data).toString("hex");
}
export function murmurhashSync(data: Buffer): Buffer {
  return Buffer.from(murmurJs.x64.hash128(data));
}
