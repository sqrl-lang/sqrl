/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "timeMs works",
  `
  LET Now := '2017-09-26T17:37:42.364Z';
  ASSERT timeMs(Now)       = 1506447462364;
  `
);
