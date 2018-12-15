/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// Similar to mapObject but does not store the results
export function foreachObject<T, U>(
  object: { [key: string]: T },
  callback: (this: U, value: T, key: string, obj: { [key: string]: T }) => void,
  context?: U
): void {
  if (!object) {
    return;
  }
  for (const name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      callback.call(context, object[name], name, object);
    }
  }
}
