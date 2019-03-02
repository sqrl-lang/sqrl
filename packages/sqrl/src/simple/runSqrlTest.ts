/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SimpleManipulator } from "./SimpleManipulator";
import { createSimpleContext } from "../api/ctx";
import { SqrlTest } from "../testing/SqrlTest";
import { LocalFilesystem, Filesystem } from "../api/filesystem";
import { buildTestFunctionRegistry } from "../testing/runSqrlTest";
import { FunctionRegistry, Execution } from "../api/execute";
import * as path from "path";
import { Logger } from "../api/log";
import { Config } from "../api/config";

export async function runSqrlTest(
  sqrl: string,
  options: {
    config?: Config;
    functionRegistry?: FunctionRegistry;
    logger?: Logger;
    filesystem?: Filesystem;
    librarySqrl?: string;
    register?: (instance: FunctionRegistry) => Promise<void>;
  } = {}
): Promise<{
  codedErrors: Error[];
  executions: Execution[];
  lastExecution: Execution;
  lastManipulator: SimpleManipulator;
}> {
  let functionRegistry: FunctionRegistry;

  if (options.functionRegistry) {
    functionRegistry = options.functionRegistry;
  } else {
    functionRegistry = await buildTestFunctionRegistry({
      config: options.config
    });
  }

  if (options.register) {
    await options.register(functionRegistry);
  }

  const filesystem =
    options.filesystem || new LocalFilesystem(path.join(__dirname, ".."));

  const test = new SqrlTest(functionRegistry._functionRegistry, {
    manipulatorFactory: () => new SimpleManipulator(),
    filesystem
  });
  const ctx = createSimpleContext(options.logger);
  if (options.librarySqrl) {
    await test.run(ctx, options.librarySqrl);
  }
  const rv = await test.run(ctx, sqrl);

  const lastExecution = rv.executions[rv.executions.length - 1];
  const lastManipulator = lastExecution.manipulator as SimpleManipulator;
  lastManipulator.throwFirstError();

  return {
    ...rv,
    lastExecution,
    lastManipulator
  };
}
