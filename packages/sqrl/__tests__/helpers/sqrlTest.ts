/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrlTest } from "../../src/simple/runSqrlTest";

export function sqrlTest(name: string, sqrl: string) {
  test(name, () => runSqrlTest(sqrl));
}
