/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import invariant from "../jslib/invariant";
import { SqrlCompileError, SqrlParseErrorOptions } from "../api/parse";

export default function sqrlErrorWrap<T>(
  options: SqrlParseErrorOptions,
  callback: () => T
): T {
  invariant(
    typeof callback === "function",
    "Expected a two functions for sqrlErrorWrap"
  );
  try {
    return callback();
  } catch (err) {
    if (err instanceof SqrlCompileError) {
      err.update(options);
    }
    throw err;
  }
}

export function asyncSqrlErrorWrap<T>(
  options: SqrlParseErrorOptions,
  callback: () => Promise<T>
): Promise<T> {
  return callback().catch(err => {
    if (err instanceof SqrlCompileError) {
      err.update(options);
    }
    throw err;
  });
}
