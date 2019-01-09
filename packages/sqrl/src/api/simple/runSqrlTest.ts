import { SimpleManipulator } from "./SimpleManipulator";
import { createSimpleContext } from "../ctx";
import { SqrlTest } from "../../testing/SqrlTest";
import { LocalFilesystem, Filesystem } from "../filesystem";
import {
  buildTestFunctionRegistry,
  buildTestServices
} from "../../testing/runSqrlTest";
import { invariant } from "sqrl-common";
import { FunctionServices } from "../../function/registerAllFunctions";
import { FunctionRegistry, Execution } from "../execute";
import * as path from "path";
import { Logger } from "../log";

export async function runSqrlTest(
  sqrl: string,
  options: {
    functionRegistry?: FunctionRegistry;
    services?: FunctionServices;
    logger?: Logger;
    filesystem?: Filesystem;
    librarySqrl?: string;
  } = {}
): Promise<{
  codedErrors: Error[];
  lastState: Execution;
  lastManipulator: SimpleManipulator;
}> {
  let functionRegistry: FunctionRegistry;

  let services: FunctionServices = {};
  if (options.functionRegistry) {
    invariant(
      !options.services,
      ".services not compatible with .functionRegistry"
    );
    functionRegistry = options.functionRegistry;
  } else {
    services = options.services || (await buildTestServices());
    functionRegistry = await buildTestFunctionRegistry({ services });
  }

  const filesystem =
    options.filesystem || new LocalFilesystem(path.join(__dirname, ".."));

  const test = new SqrlTest(functionRegistry._wrapped, {
    manipulatorFactory: () => new SimpleManipulator(),
    filesystem
  });
  const ctx = createSimpleContext(options.logger);
  if (options.librarySqrl) {
    await test.run(ctx, options.librarySqrl);
  }
  const rv = await test.run(ctx, sqrl);

  if (services.assert && services.assert.throwFirstError) {
    services.assert.throwFirstError();
  }

  return {
    ...rv,
    lastManipulator: rv.lastState.manipulator as SimpleManipulator
  };
}
