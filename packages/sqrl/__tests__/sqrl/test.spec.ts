/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlInstance } from "../../src/function/Instance";
import { registerAllFunctions } from "../../src/function/registerAllFunctions";
import { SqrlTest } from "../../src/testing/SqrlTest";
import { JestAssertService } from "sqrl-test-utils";
import { SimpleDatabaseSet } from "../../src/platform/DatabaseSet";
import { SimpleContext } from "../../src/platform/Trace";
import { getGlobalLogger } from "../../src/api/log";

test("Basic test works", async () => {
  const instance = new SqrlInstance();
  registerAllFunctions(instance, {
    assert: new JestAssertService()
  });

  const test = new SqrlTest(instance, {});
  const trace = new SimpleContext(
    new SimpleDatabaseSet("0"),
    getGlobalLogger()
  );
  await test.run(
    trace,
    `
  LET X := 5 + 1;
  LET Y := X * 3;
  ASSERT Y = 18;
  ASSERT Y + 1 = 19;
  ASSERT Y = 19 - 1;
  `
  );
  expect.assertions(3);
});
