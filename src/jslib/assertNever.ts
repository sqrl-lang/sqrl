/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { format } from "util";

export function assertNever(test: never, fmt: string, ...args: any[]): never {
  // Typescript should make sure this function is never called, based on the first argument
  // See: http://www.typescriptlang.org/docs/handbook/advanced-types.html
  throw new Error(format(fmt, ...args));
}
