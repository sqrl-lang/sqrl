/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

// Check both with/without delay to check compiler optimizations
for (const delayed of [false, true]) {
  sqrlTest(
    "handles null correctly" + (delayed ? " async" : ""),
    `
LET T := ${delayed ? "delayMs(100, true)" : "true"};
LET F := ${delayed ? "delayMs(100, false)" : "false"};
LET N := ${delayed ? "delayMs(100, null)" : "null"};

ASSERT repr(N) = "null";
ASSERT repr(NOT N) = "null";
ASSERT repr(N OR N) = "null";
ASSERT repr(F OR N) = "null";
ASSERT repr(N OR F) = "null";
ASSERT repr(N AND N) = "null";
ASSERT repr(N AND T) = "null";
ASSERT repr(T AND N) = "null";
ASSERT repr(NOT (N OR N)) = "null";
ASSERT repr(NOT (N OR F)) = "null";
ASSERT repr(NOT (N AND N)) = "null";
ASSERT repr(NOT (N AND T)) = "null";
ASSERT repr(N OR T) = "true";
ASSERT repr(T OR N) = "true";
ASSERT repr(F AND N) = "false";
ASSERT repr(N AND F) = "false";
ASSERT repr(NOT (N OR T)) = "false";
ASSERT repr(NOT (N AND F)) = "true";

`
  );
}
