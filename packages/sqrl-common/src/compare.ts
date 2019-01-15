/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { mapObject } from "./mapObject";

export function cmpE(left, right) {
  let rv;
  if (Array.isArray(left) && Array.isArray(right)) {
    rv =
      left.length === right.length &&
      left.every((el, idx) => cmpE(el, right[idx]));
  } else if (
    left &&
    right &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    // Make sure the keys match, and the value at every key matches (deep equal)
    const keys = Object.keys(left).sort();
    rv =
      cmpE(keys, Object.keys(right).sort()) &&
      keys.every(key => {
        return cmpE(left[key], right[key]);
      });
  } else {
    rv = left === right;
  }

  return rv;
}
export function cmpNE(left, right) {
  return !cmpE(left, right);
}
export function cmpG(left, right) {
  return left > right;
}
export function cmpGE(left, right) {
  return left >= right;
}
export function cmpL(left, right) {
  return left < right;
}
export function cmpLE(left, right) {
  return left <= right;
}

const functions = {
  cmpE,
  cmpNE,
  cmpG,
  cmpGE,
  cmpL,
  cmpLE
};

const symbolToNameMap = {
  "!=": "cmpNE",
  "=": "cmpE",
  ">": "cmpG",
  ">=": "cmpGE",
  "<": "cmpL",
  "<=": "cmpLE"
};
const symbolToFuncMap = mapObject(symbolToNameMap, name => functions[name]);

export const comparisonSymbols = new Set(Object.keys(symbolToNameMap));
export function sqrlCompare(left: any, operator: string, right: any): boolean {
  return symbolToFuncMap[operator](left, right);
}
