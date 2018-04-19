/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Returns true if obj is not JSONifiable without losing constructor information.
 */
export default function hasConstructor(obj): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  return obj.constructor !== Object && obj.constructor !== Array;
}
