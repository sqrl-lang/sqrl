/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { format as utilFormat } from "util";

export default function invariant(
  condition: any,
  format: string,
  ...message: any[]
) {
  if (!condition) {
    throw new Error(utilFormat(format, ...message));
  }
}
