/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export function ensureArray<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input;
  } else {
    return [input];
  }
}
