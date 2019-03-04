/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SimpleManipulator } from "./SimpleManipulator";
import { createSimpleContext } from "../api/ctx";
import { SqrlTest } from "../testing/SqrlTest";
import { LocalFilesystem, Filesystem } from "../api/filesystem";
import { buildTestInstance } from "../testing/runSqrlTest";
import { Instance, Execution } from "../api/execute";
import * as path from "path";
import { Logger } from "../api/log";
import { Config } from "../api/config";
import { FunctionCostData } from "../function/Instance";
import { invariant } from "sqrl-common";

export async function runSqrlTest(
  sqrl: string,
  options: {
    config?: Config;
    instance?: Instance;
    functionCost?: FunctionCostData;
    logger?: Logger;
    filesystem?: Filesystem;
    librarySqrl?: string;
    register?: (instance: Instance) => Promise<void>;
  } = {}
): Promise<{
  codedErrors: Error[];
  executions: Execution[];
  lastExecution: Execution;
  lastManipulator: SimpleManipulator;
}> {
  let instance: Instance;

  if (options.instance) {
    invariant(
      !options.config,
      "config option not valid when instance is provided"
    );
    invariant(
      !options.functionCost,
      "functionCost option not valid when instance is provided"
    );
    instance = options.instance;
  } else {
    instance = await buildTestInstance({
      functionCost: options.functionCost,
      config: options.config
    });
  }

  if (options.register) {
    await options.register(instance);
  }

  const filesystem =
    options.filesystem || new LocalFilesystem(path.join(__dirname, ".."));

  const test = new SqrlTest(instance._instance, {
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
