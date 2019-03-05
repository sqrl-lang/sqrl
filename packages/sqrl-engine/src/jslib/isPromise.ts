/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export default function isPromise<T>(value: any): value is Promise<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.then === "function"
  );
}
