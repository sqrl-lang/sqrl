/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as bluebird from "bluebird";

export interface PendingPromise<T> {
  resolve: (value?: any) => void;
  reject: (err: Error) => void;
  promise: bluebird<T>;
}

export default function pendingPromise<T>(): PendingPromise<T> {
  let reject: (err: Error) => void;
  let resolve: (value: T) => void;
  const promise: bluebird<T> = new bluebird((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });
  return { resolve, reject, promise };
}
