/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "./invariant";

function chunk<T>(arr: T[], size: number): T[][] {
  invariant(Array.isArray(arr), "chunk() takes an array");
  invariant(typeof size === "number", "chunk() takes a size");
  invariant(arr.length === 0 || size > 0, "chunk() requires non-zero size");

  const chunks: T[][] = [];
  for (let start = 0; start < arr.length; start += size) {
    chunks.push(arr.slice(start, start + size));
  }
  return chunks;
}

export = chunk;
