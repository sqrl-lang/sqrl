/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { compileToExecution } from "../helpers/runCompile";

test("Basic compile works", async () => {
  const { execution } = await compileToExecution(`
  LET X := 5 + 1;
  LET Y := X * 3;
  `);
  expect(await execution.fetchBasicByName("Y")).toEqual(18);
});
