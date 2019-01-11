import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("dateDiff works", async () => {
  await runSqrlTest(`
    LET DayOne := '2016-11-17T19:21:43.328Z';
    LET DayTwo := '2016-11-18T19:21:43.328Z';
    ASSERT dateDiff("HOUR", DayOne, DayTwo) = 24;
    ASSERT dateDiff("DAY", DayOne, DayTwo) = 1;
    ASSERT dateDiff("DAY", DayTwo, DayOne) = -1;
    `);
});
