/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "./invariant";

// Flattens an array containing arrays into a single array
// Only performs a single level

export default function flatten(array) {
  invariant(Array.isArray(array), "Flatten must be given an array to flatten");
  if (!array.length) {
    return array;
  }
  array.forEach(function(inner) {
    invariant(
      Array.isArray(inner),
      "Every inner element of the array must be an array"
    );
  });
  // @NOTE: This could be done without a function but is pretty hairy as it is
  return Array.prototype.concat.call.apply(Array.prototype.concat, array);
}
