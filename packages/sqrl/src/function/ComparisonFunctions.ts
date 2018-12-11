/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";

import mapObject from "../jslib/mapObject";
import { getGlobalLogger } from "../api/log";

function cmpE(left, right) {
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
    if (typeof left === "undefined" || typeof right === "undefined") {
      getGlobalLogger().warn({}, "Comparing undefined object");
    }
    rv = left === right;
  }

  return rv;
}
function cmpNE(left, right) {
  return !cmpE(left, right);
}
function cmpG(left, right) {
  return left > right;
}
function cmpGE(left, right) {
  return left >= right;
}
function cmpL(left, right) {
  return left < right;
}
function cmpLE(left, right) {
  return left <= right;
}

export function registerComparisonFunctions(registry: FunctionRegistry) {
  const compareOpts = {
    argCount: 2,
    pure: true
  };
  registry.save(cmpE, compareOpts);
  registry.save(cmpNE, compareOpts);
  registry.save(cmpG, compareOpts);
  registry.save(cmpGE, compareOpts);
  registry.save(cmpL, compareOpts);
  registry.save(cmpLE, compareOpts);
}

const functions = {
  cmpE,
  cmpNE,
  cmpG,
  cmpGE,
  cmpL,
  cmpLE
};

const symbols = {
  "!=": "cmpNE",
  "=": "cmpE",
  ">": "cmpG",
  ">=": "cmpGE",
  "<": "cmpL",
  "<=": "cmpLE"
};

export function sqrlCompare(left: any, operator: string, right: any): boolean {
  return ComparisonFunctions.symbolToFuncMap[operator](left, right);
}
export const ComparisonFunctions = {
  symbolToNameMap: symbols,
  symbolToFuncMap: mapObject(symbols, name => functions[name])
};
