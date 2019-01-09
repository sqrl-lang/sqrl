import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("bad clock throws", async () => {
  await expect(
    runSqrlTest(`
LET SqrlClock := nowMs();
`)
  ).rejects.toThrowError(/Invalid ISO 8601/i);

  await runSqrlTest(`
  LET SqrlClock := '2018-01-01T15:30Z';
  `);

  await expect(
    runSqrlTest(`
LET SqrlClock := '2017-01:5';
`)
  ).rejects.toThrowError(/Invalid ISO 8601/i);
});
