/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import bluebird = require("bluebird");

// Type return as Promise<T> to aid migration away from bluebird... but actually return a bluebird
// promise for now.
export function timeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
  reason?: string
): Promise<T> {
  return bluebird.resolve(promise).timeout(timeout, reason) as any;
}
