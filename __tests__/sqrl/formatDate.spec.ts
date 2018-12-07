/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "formatDate works",
  `
    LET DayOne := 1479410503328;
    LET DayTwo := 1479496903328;
    ASSERT formatDate(DayOne) = 'Thursday, November 17th 2016, 7:21:43 pm';
    ASSERT formatDate(DayOne, "YYYY") = '2016';
  `
);
