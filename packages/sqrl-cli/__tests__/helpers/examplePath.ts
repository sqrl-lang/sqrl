/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { join } from "path";

export function examplePath(filename: string) {
  return join(__dirname, "../../../../examples", filename);
}
