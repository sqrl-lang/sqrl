/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "timeMs works",
  `
  LET Now := 1506447462364;
  LET NowTimeMs := timeMs(1506447462364);
  LET NowTimeMsTimeZone := timeMs(1506447462364, "America/New_York");
  ASSERT NowTimeMsTimeZone = 1506447462000;
  `
);
