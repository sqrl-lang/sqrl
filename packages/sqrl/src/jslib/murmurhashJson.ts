/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import murmurhash = require("murmurhash-native");
import stringify = require("fast-stable-stringify");

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

export function murmurhashHexSync(data: Buffer): string {
  return murmurhash.murmurHash128x64(data, 0, "hex");
}
export function murmurhashSync(data: Buffer): Buffer {
  return murmurhash.murmurHash128x64(data, 0, "buffer");
}
