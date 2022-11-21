/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { invariant } from "./invariant";

// Flattens an array containing arrays into a single array
// Only performs a single level

export function flatten<T>(array: Array<Array<T>>): Array<T> {
  invariant(Array.isArray(array), "Flatten must be given an array to flatten");
  if (!array.length) {
    return [];
  }
  array.forEach(function (inner) {
    invariant(
      Array.isArray(inner),
      "Every inner element of the array must be an array"
    );
  });

  return [].concat(...array);
}
