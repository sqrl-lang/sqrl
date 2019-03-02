/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  runSqrlTest as runLibSqrl,
  buildTestFunctionRegistry,
  FunctionRegistry,
  Logger
} from "sqrl";
import { register } from "../../src";

export async function buildRedisTestFunctionRegistry(
  options: {
    fixedDate?: string;
  } = {}
) {
  const functionRegistry = await buildTestFunctionRegistry({
    config: {
      "testing.fixed-date": options.fixedDate
    }
  });
  register(functionRegistry);
  return functionRegistry;
}

export async function runSqrl(
  sqrl: string,
  options: {
    functionRegistry?: FunctionRegistry;
    logger?: Logger;
    fixedDate?: string;
  } = {}
) {
  return runLibSqrl(sqrl, {
    functionRegistry:
      options.functionRegistry ||
      (await buildRedisTestFunctionRegistry({
        fixedDate: options.fixedDate
      })),
    logger: options.logger
  });
}
