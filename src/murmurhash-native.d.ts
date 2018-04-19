/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
declare module "murmurhash-native" {
  // murmurhash does expose types but these are more accurate for the two modes that we use.
  function murmurHash128x64(
    buffer: Buffer,
    seed: number,
    returnType: "buffer"
  ): Buffer;
  function murmurHash128x64(
    buffer: Buffer,
    seed: number,
    returnType: "hex"
  ): string;
}
