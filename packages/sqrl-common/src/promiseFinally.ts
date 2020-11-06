/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/***
 * This implements https://github.com/tc39/proposal-promise-finally
 * Once our minimum Node.JS version meets this bar we can start using it.
 */

export function promiseFinally<T>(
  promise: Promise<T>,
  onFinally: () => void
): Promise<T> {
  // We compile with a TypeScript version that doesn't include .finally
  if ((promise as any).finally) {
    return (promise as any).finally(onFinally);
  }
  return promise.then(
    (res) => Promise.resolve(onFinally()).then(() => res),
    (err) =>
      Promise.resolve(onFinally()).then(() => {
        throw err;
      })
  );
}
