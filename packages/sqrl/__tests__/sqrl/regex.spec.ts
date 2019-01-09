import { runSqrlTest } from "../../src/api/simple/runSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

test("regex works", async () => {
  await runSqrlTest(`
  LET Phone := "1(212)333-4444";
  ASSERT regexMatch(Phone, "123") = null;
  ASSERT regexMatch(Phone, "4444") = ["4444"];
  ASSERT regexTest(Phone, "^[\\\\d()-]+$");
  ASSERT regexReplace(Phone, "\\\\d", "X") = "X(XXX)XXX-XXXX";
`);
});
