/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { invariant } from "./invariant";

export function isEmptyObject(obj: any): boolean {
  invariant(typeof obj === "object", "expected object to be tested");
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}
