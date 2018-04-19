/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export default function deepEqual(left, right) {
  if (left === right) {
    return true;
  } else if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((el, idx) => {
        return deepEqual(el, right[idx]);
      })
    );
  } else if (typeof left === "object" && typeof right === "object") {
    if (left === null || right === null) {
      return false;
    }
    const keys = Object.keys(left).sort();
    return (
      deepEqual(keys, Object.keys(right).sort()) &&
      keys.every((key?) => {
        return deepEqual(left[key], right[key]);
      })
    );
  } else {
    return false;
  }
}
