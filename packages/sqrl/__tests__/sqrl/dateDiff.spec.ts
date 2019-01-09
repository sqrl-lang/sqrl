import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("dateDiff works", async () => {
  await runSqrlTest(`
    LET DayOne := 1479410503328;
    LET DayTwo := 1479496903328;
    ASSERT dateDiff("HOUR", DayOne, DayTwo) = 24;
    ASSERT dateDiff("DAY", DayOne, DayTwo) = 1;
    ASSERT dateDiff("DAY", DayTwo, DayOne) = -1;
    `);
});
