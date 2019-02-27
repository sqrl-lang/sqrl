import { textSqrlTest } from "./helpers/textSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

textSqrlTest(
  "works",
  `
  LET Phone := "1(212)333-4444";
  ASSERT regexMatch("123", Phone) = null;
  ASSERT regexMatch("4444", Phone) = ["4444"];
  ASSERT regexTest("^[\\\\d()-]+$", Phone) = true;
  ASSERT regexReplace("\\\\d", Phone, "X") = "X(XXX)XXX-XXXX";
`
);
