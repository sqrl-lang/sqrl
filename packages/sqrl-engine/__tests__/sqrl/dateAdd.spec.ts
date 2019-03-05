import { runSqrlTest } from "../../src/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("dateAdd works", async () => {
  await runSqrlTest(`
    LET DayOne := "2018-02-12T08:00:00Z";
    ASSERT dateAdd(DayOne, "PT1S") = "2018-02-12T08:00:01.000Z";
    ASSERT dateAdd(DayOne, "P1D") = "2018-02-13T08:00:00.000Z";
  `);
});
