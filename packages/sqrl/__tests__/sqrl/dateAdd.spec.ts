import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("dateAdd works", async () => {
  await runSqrlTest(`
    LET DayOne := 1479410503000;
    ASSERT timeMs(dateAdd(DayOne, "PT1S")) = 1479410504000;
  `);
});
