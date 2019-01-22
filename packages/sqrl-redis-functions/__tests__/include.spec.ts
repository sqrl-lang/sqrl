/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)
import { buildRedisTestFunctionRegistry } from "./helpers/runSqrl";
import { executableFromFilesystem, VirtualFilesystem } from "sqrl";
import "jest-extended";

test("works with counts", async () => {
  const functionRegistry = await buildRedisTestFunctionRegistry();
  const executable = await executableFromFilesystem(
    functionRegistry,
    new VirtualFilesystem({
      "x.sqrl": `
  LET Count := count(BY Ip);
    `,
      "main.sqrl": `
  LET Action := input();
  LET Ip := input();
  INCLUDE "x.sqrl" WHERE Action="x";
  `
    })
  );

  const sourcePrinter = executable.getSourcePrinter();
  // Make sure the counter is depending on Action="x"
  expect(sourcePrinter.getSourceForSlotName("Count")).toInclude(
    'bool(Action="x":01)'
  );
});
