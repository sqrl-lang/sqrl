// tslint:disable:no-submodule-imports (@TODO)
import { VirtualSourceTree } from "sqrl/__tests__/helpers/runCompile";
import { buildRedisTestFunctionRegistry } from "./helpers/runSqrl";
import { executableFromFilesystem } from "sqrl";

test("works with counts", async () => {
  const functionRegistry = await buildRedisTestFunctionRegistry();
  const executable = await executableFromFilesystem(
    functionRegistry,
    new VirtualSourceTree({
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
